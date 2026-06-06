import { GraphQLContext } from '../context';
import { hashPassword, comparePassword, generateToken } from '../../utils/auth';
import { UserInputError, UnauthenticatedError } from '../../utils/errors';

export const userResolvers = {
  Query: {
    me: async (_parent: any, _args: any, context: GraphQLContext) => {
      if (!context.currentUser) return null;
      return context.prisma.user.findUnique({
        where: { id: context.currentUser.userId },
      });
    },
  },
  Mutation: {
    register: async (
      _parent: any,
      { email, password, name }: any,
      context: GraphQLContext
    ) => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password || !name.trim()) {
        throw UserInputError('Missing required fields.');
      }

      // Check if user already exists
      const existingUser = await context.prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (existingUser) {
        throw UserInputError('A user with this email address already exists.');
      }

      const hashedPassword = await hashPassword(password);
      const user = await context.prisma.user.create({
        data: {
          email: trimmedEmail,
          password: hashedPassword,
          name: name.trim(),
        },
      });

      const token = generateToken({ userId: user.id, email: user.email });

      return {
        token,
        user,
      };
    },

    login: async (
      _parent: any,
      { email, password }: any,
      context: GraphQLContext
    ) => {
      const trimmedEmail = email.trim().toLowerCase();
      const user = await context.prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (!user) {
        throw UserInputError('Invalid email or password.');
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw UserInputError('Invalid email or password.');
      }

      const token = generateToken({ userId: user.id, email: user.email });

      return {
        token,
        user,
      };
    },

    updateProfile: async (
      _parent: any,
      { name, avatarUrl }: any,
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw UnauthenticatedError();
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      return context.prisma.user.update({
        where: { id: context.currentUser.userId },
        data: updateData,
      });
    },
  },
};
