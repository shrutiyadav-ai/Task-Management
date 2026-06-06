import { GraphQLContext } from '../context';
import { requireAuth, assertBoardAccess, assertColumnAccess, BoardRole } from '../../utils/rbac';
import { UserInputError } from '../../utils/errors';
import { broadcastBoardEvent } from '../../sockets';

export const columnResolvers = {
  Mutation: {
    createColumn: async (
      _parent: any,
      { boardId, title, position }: { boardId: string; title: string; position: number },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      await assertBoardAccess(context.prisma, auth.userId, boardId, BoardRole.ADMIN);

      if (!title.trim()) {
        throw UserInputError('Column title cannot be empty.');
      }

      const column = await context.prisma.column.create({
        data: {
          boardId,
          title: title.trim(),
          position,
        },
      });

      // Broadcast column created
      broadcastBoardEvent(boardId, 'columnCreated', column);

      return column;
    },

    updateColumn: async (
      _parent: any,
      { id, title, position }: { id: string; title?: string; position?: number },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertColumnAccess(context.prisma, auth.userId, id, BoardRole.ADMIN);

      const updateData: any = {};
      if (title !== undefined) {
        if (!title.trim()) throw UserInputError('Column title cannot be empty.');
        updateData.title = title.trim();
      }
      if (position !== undefined) {
        updateData.position = position;
      }

      const updatedColumn = await context.prisma.column.update({
        where: { id },
        data: updateData,
      });

      // Broadcast column updated
      broadcastBoardEvent(member.boardId, 'columnUpdated', updatedColumn);

      return updatedColumn;
    },

    deleteColumn: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      const member = await assertColumnAccess(context.prisma, auth.userId, id, BoardRole.ADMIN);

      await context.prisma.column.delete({
        where: { id },
      });

      // Broadcast column deleted
      broadcastBoardEvent(member.boardId, 'columnDeleted', id);

      return id;
    },
  },

  // Field Resolvers
  Column: {
    tasks: async (column: any, _args: any, context: GraphQLContext) => {
      return context.prisma.task.findMany({
        where: { columnId: column.id },
        orderBy: { position: 'asc' },
      });
    },
  },
};
