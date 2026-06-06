import { GraphQLContext } from '../context';
import { requireAuth, assertBoardAccess, getBoardMembership, BoardRole } from '../../utils/rbac';
import { UserInputError, NotFoundError, ForbiddenError } from '../../utils/errors';

export const boardResolvers = {
  Query: {
    boards: async (_parent: any, _args: any, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      
      // Get all boards where the user is a member
      return context.prisma.board.findMany({
        where: {
          members: {
            some: {
              userId: auth.userId,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    board: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      
      // Assert visibility access (public boards visible, private requires membership)
      await assertBoardAccess(context.prisma, auth.userId, id, BoardRole.MEMBER);

      return context.prisma.board.findUnique({
        where: { id },
      });
    },
  },

  Mutation: {
    createBoard: async (
      _parent: any,
      { title, description }: { title: string; description?: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);

      if (!title.trim()) {
        throw UserInputError('Board title cannot be empty.');
      }

      // Create board and owner membership within a transaction
      return context.prisma.$transaction(async (tx) => {
        const board = await tx.board.create({
          data: {
            title: title.trim(),
            description: description?.trim(),
          },
        });

        await tx.boardMember.create({
          data: {
            boardId: board.id,
            userId: auth.userId,
            role: BoardRole.OWNER,
          },
        });

        return board;
      });
    },

    updateBoard: async (
      _parent: any,
      { id, title, description, isPublic }: { id: string; title?: string; description?: string; isPublic?: boolean },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      await assertBoardAccess(context.prisma, auth.userId, id, BoardRole.ADMIN);

      const updateData: any = {};
      if (title !== undefined) {
        if (!title.trim()) throw UserInputError('Board title cannot be empty.');
        updateData.title = title.trim();
      }
      if (description !== undefined) updateData.description = description?.trim();
      if (isPublic !== undefined) updateData.isPublic = isPublic;

      return context.prisma.board.update({
        where: { id },
        data: updateData,
      });
    },

    deleteBoard: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);
      await assertBoardAccess(context.prisma, auth.userId, id, BoardRole.OWNER);

      await context.prisma.board.delete({
        where: { id },
      });

      return id;
    },

    addBoardMember: async (
      _parent: any,
      { boardId, email, role }: { boardId: string; email: string; role: BoardRole },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      await assertBoardAccess(context.prisma, auth.userId, boardId, BoardRole.ADMIN);

      const targetUser = await context.prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!targetUser) {
        throw NotFoundError(`User with email '${email}' not found.`);
      }

      // Check if already a member
      const existingMember = await context.prisma.boardMember.findUnique({
        where: {
          boardId_userId: { boardId, userId: targetUser.id },
        },
      });

      if (existingMember) {
        throw UserInputError('User is already a member of this board.');
      }

      // Admin cannot invite/set OWNER role
      if (role === BoardRole.OWNER) {
        throw ForbiddenError('Only board owners can assign other owner memberships.');
      }

      return context.prisma.boardMember.create({
        data: {
          boardId,
          userId: targetUser.id,
          role,
        },
      });
    },

    updateBoardMemberRole: async (
      _parent: any,
      { boardId, userId, role }: { boardId: string; userId: string; role: BoardRole },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      
      // Only the OWNER of the board can update member roles
      await assertBoardAccess(context.prisma, auth.userId, boardId, BoardRole.OWNER);

      if (userId === auth.userId) {
        throw UserInputError('You cannot modify your own membership role.');
      }

      const existingMember = await context.prisma.boardMember.findUnique({
        where: {
          boardId_userId: { boardId, userId },
        },
      });

      if (!existingMember) {
        throw NotFoundError('User is not a member of this board.');
      }

      return context.prisma.$transaction(async (tx) => {
        // If promoting to OWNER, demote current owner to ADMIN
        if (role === BoardRole.OWNER) {
          await tx.boardMember.update({
            where: {
              boardId_userId: { boardId, userId: auth.userId },
            },
            data: { role: BoardRole.ADMIN },
          });
        }

        return tx.boardMember.update({
          where: {
            boardId_userId: { boardId, userId },
          },
          data: { role },
        });
      });
    },

    removeBoardMember: async (
      _parent: any,
      { boardId, userId }: { boardId: string; userId: string },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);
      const requesterMembership = await assertBoardAccess(context.prisma, auth.userId, boardId, BoardRole.ADMIN);
      
      const targetMembership = await getBoardMembership(context.prisma, userId, boardId);

      if (targetMembership.role === BoardRole.OWNER) {
        throw ForbiddenError('The owner of the board cannot be removed.');
      }

      // Admin can only remove Members, Owner can remove anyone
      if (requesterMembership.role === BoardRole.ADMIN && targetMembership.role === BoardRole.ADMIN) {
        throw ForbiddenError('Board admins cannot remove other board admins.');
      }

      await context.prisma.boardMember.delete({
        where: {
          boardId_userId: { boardId, userId },
        },
      });

      return userId;
    },
  },

  // Field Resolvers
  Board: {
    members: async (board: any, _args: any, context: GraphQLContext) => {
      return context.prisma.boardMember.findMany({
        where: { boardId: board.id },
      });
    },
    columns: async (board: any, _args: any, context: GraphQLContext) => {
      return context.prisma.column.findMany({
        where: { boardId: board.id },
        orderBy: { position: 'asc' },
      });
    },
    labels: async (board: any, _args: any, context: GraphQLContext) => {
      return context.prisma.label.findMany({
        where: { boardId: board.id },
      });
    },
  },

  BoardMember: {
    user: async (boardMember: any, _args: any, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: boardMember.userId },
      });
    },
  },
};
