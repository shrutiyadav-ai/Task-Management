import { GraphQLContext } from '../context';
import { requireAuth, assertTaskAccess, BoardRole } from '../../utils/rbac';
import { UserInputError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { broadcastBoardEvent, emitToUser } from '../../sockets';

export const commentResolvers = {
  Mutation: {
    addComment: async (
      _parent: any,
      { taskId, text }: { taskId: string; text: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      await assertTaskAccess(context.prisma, auth.userId, taskId, BoardRole.MEMBER);

      if (!text.trim()) {
        throw UserInputError('Comment text cannot be empty.');
      }

      const comment = await context.prisma.comment.create({
        data: {
          taskId,
          userId: auth.userId,
          text: text.trim(),
        },
        include: {
          task: {
            include: {
              column: true,
            },
          },
        },
      });

      const boardId = comment.task.column.boardId;

      // Broadcast commentAdded event to the board
      broadcastBoardEvent(boardId, 'commentAdded', comment);

      // Notify task assignees when someone adds a comment (except if commenting on their own assignment)
      const assignees = await context.prisma.taskAssignee.findMany({
        where: { taskId },
      });

      for (const assignee of assignees) {
        if (assignee.userId !== auth.userId) {
          const notification = await context.prisma.notification.create({
            data: {
              userId: assignee.userId,
              actorId: auth.userId,
              type: 'COMMENT_ADDED',
              message: `${auth.email} commented on "${comment.task.title}": "${text.substring(0, 30)}..."`,
              link: `/board/${boardId}?task=${taskId}`,
            },
          });

          // Dispatch live notification socket alert
          emitToUser(assignee.userId, 'notificationCreated', notification);
        }
      }

      return comment;
    },

    deleteComment: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      
      const comment = await context.prisma.comment.findUnique({
        where: { id },
        include: {
          task: {
            include: {
              column: true,
            },
          },
        },
      });

      if (!comment) {
        throw NotFoundError('Comment not found.');
      }

      const boardId = comment.task.column.boardId;

      // Check if requester is the author, or has OWNER/ADMIN role on the board
      const isAuthor = comment.userId === auth.userId;
      if (!isAuthor) {
        const membership = await context.prisma.boardMember.findUnique({
          where: {
            boardId_userId: { boardId, userId: auth.userId },
          },
        });

        if (!membership || (membership.role !== BoardRole.OWNER && membership.role !== BoardRole.ADMIN)) {
          throw ForbiddenError('You do not have permission to delete this comment.');
        }
      }

      await context.prisma.comment.delete({
        where: { id },
      });

      // Broadcast commentDeleted event to the board
      broadcastBoardEvent(boardId, 'commentDeleted', id);

      return id;
    },
  },

  // Field Resolvers
  Comment: {
    user: async (comment: any, _args: any, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: comment.userId },
      });
    },
    createdAt: (comment: any) => comment.createdAt.toISOString(),
    updatedAt: (comment: any) => comment.updatedAt.toISOString(),
  },
};
