import { PrismaClient, BoardMember } from '@prisma/client';
import { UnauthenticatedError, ForbiddenError, NotFoundError } from './errors';
import { TokenPayload } from './auth';

// Define enums locally for SQLite compatibility
export enum BoardRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

const ROLE_RANKING: Record<BoardRole, number> = {
  [BoardRole.OWNER]: 3,
  [BoardRole.ADMIN]: 2,
  [BoardRole.MEMBER]: 1,
};

export const requireAuth = (currentUser: TokenPayload | null): TokenPayload => {
  if (!currentUser) {
    throw UnauthenticatedError();
  }
  return currentUser;
};

export const getBoardMembership = async (
  prisma: PrismaClient,
  userId: string,
  boardId: string
): Promise<BoardMember> => {
  const member = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
  });

  if (!member) {
    throw ForbiddenError('You are not a member of this board.');
  }

  // Cast member.role string from database to BoardRole enum
  return {
    ...member,
    role: member.role as any,
  };
};

export const assertBoardAccess = async (
  prisma: PrismaClient,
  userId: string,
  boardId: string,
  minRole: BoardRole = BoardRole.MEMBER
): Promise<BoardMember> => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw NotFoundError('Board not found.');
  }

  const member = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
  });

  if (!member) {
    if (board.isPublic && minRole === BoardRole.MEMBER) {
      return {
        id: 'guest',
        boardId,
        userId,
        role: BoardRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    throw ForbiddenError('You are not authorized to access this board.');
  }

  const userRole = member.role as BoardRole;
  if (ROLE_RANKING[userRole] < ROLE_RANKING[minRole]) {
    throw ForbiddenError(`You must be at least a ${minRole} to perform this action.`);
  }

  return {
    ...member,
    role: userRole as any,
  };
};

export const assertColumnAccess = async (
  prisma: PrismaClient,
  userId: string,
  columnId: string,
  minRole: BoardRole = BoardRole.MEMBER
): Promise<BoardMember> => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });

  if (!column) {
    throw NotFoundError('Column not found.');
  }

  return assertBoardAccess(prisma, userId, column.boardId, minRole);
};

export const assertTaskAccess = async (
  prisma: PrismaClient,
  userId: string,
  taskId: string,
  minRole: BoardRole = BoardRole.MEMBER
): Promise<BoardMember> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: {
        select: { boardId: true },
      },
    },
  });

  if (!task) {
    throw NotFoundError('Task not found.');
  }

  return assertBoardAccess(prisma, userId, task.column.boardId, minRole);
};
