import { Request } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth';
import prisma from '../config/db';
import { PrismaClient, User } from '@prisma/client';

export interface GraphQLContext {
  prisma: PrismaClient;
  currentUser: TokenPayload | null;
}

export const createContext = async ({ req }: { req: Request }): Promise<GraphQLContext> => {
  const authHeader = req.headers.authorization || '';
  let currentUser: TokenPayload | null = null;

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    currentUser = verifyToken(token);
  }

  return {
    prisma,
    currentUser,
  };
};
