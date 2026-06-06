import { GraphQLContext } from '../context';
import { requireAuth, assertTaskAccess, assertColumnAccess, assertBoardAccess, BoardRole, TaskPriority } from '../../utils/rbac';
import { UserInputError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { broadcastBoardEvent, emitToUser } from '../../sockets';

export const taskResolvers = {
  Mutation: {
    createTask: async (
      _parent: any,
      { columnId, title, description, priority, dueDate }: any,
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertColumnAccess(context.prisma, auth.userId, columnId, BoardRole.MEMBER);

      if (!title.trim()) {
        throw UserInputError('Task title cannot be empty.');
      }

      // Determine next task position in this column
      const count = await context.prisma.task.count({
        where: { columnId },
      });

      const task = await context.prisma.task.create({
        data: {
          columnId,
          title: title.trim(),
          description: description?.trim(),
          priority: priority || TaskPriority.MEDIUM,
          dueDate: dueDate ? new Date(dueDate) : null,
          position: count * 1000.0 + 1000.0,
        },
      });

      // Broadcast task created
      broadcastBoardEvent(member.boardId, 'taskCreated', task);

      return task;
    },

    updateTask: async (
      _parent: any,
      { id, columnId, title, description, position, priority, dueDate }: any,
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertTaskAccess(context.prisma, auth.userId, id, BoardRole.MEMBER);

      const updateData: any = {};
      if (title !== undefined) {
        if (!title.trim()) throw UserInputError('Task title cannot be empty.');
        updateData.title = title.trim();
      }
      if (description !== undefined) {
        updateData.description = description?.trim();
      }
      if (position !== undefined) {
        updateData.position = position;
      }
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }

      // If moving task to a different column, check authorization on destination column
      if (columnId !== undefined) {
        const currentTask = await context.prisma.task.findUnique({
          where: { id },
          select: { columnId: true },
        });
        if (!currentTask) throw NotFoundError('Task not found.');

        if (currentTask.columnId !== columnId) {
          await assertColumnAccess(context.prisma, auth.userId, columnId, BoardRole.MEMBER);
          updateData.columnId = columnId;
        }
      }

      const updatedTask = await context.prisma.task.update({
        where: { id },
        data: updateData,
      });

      // Broadcast task updated
      broadcastBoardEvent(member.boardId, 'taskUpdated', updatedTask);

      return updatedTask;
    },

    deleteTask: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertTaskAccess(context.prisma, auth.userId, id, BoardRole.MEMBER);

      await context.prisma.task.delete({
        where: { id },
      });

      // Broadcast task deleted
      broadcastBoardEvent(member.boardId, 'taskDeleted', id);

      return id;
    },

    assignUserToTask: async (
      _parent: any,
      { taskId, userId }: { taskId: string; userId: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      
      const task = await context.prisma.task.findUnique({
        where: { id: taskId },
        include: { column: true },
      });
      if (!task) throw NotFoundError('Task not found.');
      await assertBoardAccess(context.prisma, auth.userId, task.column.boardId, BoardRole.MEMBER);

      // Verify target is member of the board
      const targetMembership = await context.prisma.boardMember.findUnique({
        where: {
          boardId_userId: { boardId: task.column.boardId, userId },
        },
      });

      if (!targetMembership) {
        throw ForbiddenError('Assigned user must be a member of the board.');
      }

      const existingAssignee = await context.prisma.taskAssignee.findUnique({
        where: {
          taskId_userId: { taskId, userId },
        },
      });

      if (!existingAssignee) {
        await context.prisma.taskAssignee.create({
          data: { taskId, userId },
        });

        // Trigger Notification
        if (auth.userId !== userId) {
          const notification = await context.prisma.notification.create({
            data: {
              userId,
              actorId: auth.userId,
              type: 'TASK_ASSIGNED',
              message: `${auth.email} assigned you to the task "${task.title}".`,
              link: `/board/${task.column.boardId}?task=${taskId}`,
            },
          });
          emitToUser(userId, 'notificationCreated', notification);
        }
      }

      const updatedTask = await context.prisma.task.findUnique({ where: { id: taskId } });
      if (updatedTask) {
        broadcastBoardEvent(task.column.boardId, 'taskUpdated', updatedTask);
      }

      return updatedTask;
    },

    unassignUserFromTask: async (
      _parent: any,
      { taskId, userId }: { taskId: string; userId: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      
      const task = await context.prisma.task.findUnique({
        where: { id: taskId },
        include: { column: true },
      });
      if (!task) throw NotFoundError('Task not found.');
      await assertBoardAccess(context.prisma, auth.userId, task.column.boardId, BoardRole.MEMBER);

      await context.prisma.taskAssignee.deleteMany({
        where: { taskId, userId },
      });

      const updatedTask = await context.prisma.task.findUnique({ where: { id: taskId } });
      if (updatedTask) {
        broadcastBoardEvent(task.column.boardId, 'taskUpdated', updatedTask);
      }

      return updatedTask;
    },

    createLabel: async (
      _parent: any,
      { boardId, name, color }: { boardId: string; name: string; color: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      await assertBoardAccess(context.prisma, auth.userId, boardId, BoardRole.ADMIN);

      if (!name.trim()) throw UserInputError('Label name cannot be empty.');
      if (!color.trim()) throw UserInputError('Label color cannot be empty.');

      return context.prisma.label.create({
        data: {
          boardId,
          name: name.trim(),
          color: color.trim(),
        },
      });
    },

    deleteLabel: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      
      const label = await context.prisma.label.findUnique({
        where: { id },
      });
      if (!label) throw NotFoundError('Label not found.');
      await assertBoardAccess(context.prisma, auth.userId, label.boardId, BoardRole.ADMIN);

      await context.prisma.label.delete({
        where: { id },
      });

      return id;
    },

    addLabelToTask: async (
      _parent: any,
      { taskId, labelId }: { taskId: string; labelId: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertTaskAccess(context.prisma, auth.userId, taskId, BoardRole.MEMBER);

      const label = await context.prisma.label.findUnique({
        where: { id: labelId },
      });
      if (!label) throw NotFoundError('Label not found.');

      const updatedTask = await context.prisma.task.update({
        where: { id: taskId },
        data: {
          labels: {
            connect: { id: labelId },
          },
        },
      });

      broadcastBoardEvent(member.boardId, 'taskUpdated', updatedTask);

      return updatedTask;
    },

    removeLabelFromTask: async (
      _parent: any,
      { taskId, labelId }: { taskId: string; labelId: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertTaskAccess(context.prisma, auth.userId, taskId, BoardRole.MEMBER);

      const updatedTask = await context.prisma.task.update({
        where: { id: taskId },
        data: {
          labels: {
            disconnect: { id: labelId },
          },
        },
      });

      broadcastBoardEvent(member.boardId, 'taskUpdated', updatedTask);

      return updatedTask;
    },
  },

  // Field Resolvers
  Task: {
    assignees: async (task: any, _args: any, context: GraphQLContext) => {
      const taskAssignees = await context.prisma.taskAssignee.findMany({
        where: { taskId: task.id },
        include: { user: true },
      });
      return taskAssignees.map((ta) => ta.user);
    },
    comments: async (task: any, _args: any, context: GraphQLContext) => {
      return context.prisma.comment.findMany({
        where: { taskId: task.id },
        orderBy: { createdAt: 'desc' },
      });
    },
    labels: async (task: any, _args: any, context: GraphQLContext) => {
      return context.prisma.label.findMany({
        where: {
          tasks: {
            some: { id: task.id },
          },
        },
      });
    },
    dueDate: (task: any) => {
      return task.dueDate ? task.dueDate.toISOString() : null;
    },
    createdAt: (task: any) => task.createdAt.toISOString(),
    updatedAt: (task: any) => task.updatedAt.toISOString(),
  },
};
