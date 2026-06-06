import { GraphQLContext } from '../context';
import { requireAuth } from '../../utils/rbac';

export const notificationResolvers = {
  Query: {
    notifications: async (_parent: any, _args: any, context: GraphQLContext) => {
      const auth = requireAuth(context.currentUser);

      return context.prisma.notification.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    markNotificationsAsRead: async (
      _parent: any,
      { ids }: { ids: string[] },
      context: GraphQLContext
    ) => {
      const auth = requireAuth(context.currentUser);

      await context.prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: auth.userId,
        },
        data: {
          isRead: true,
        },
      });

      return context.prisma.notification.findMany({
        where: {
          id: { in: ids },
          userId: auth.userId,
        },
      });
    },
  },

  // Field Resolvers
  Notification: {
    actor: async (notification: any, _args: any, context: GraphQLContext) => {
      if (!notification.actorId) return null;
      return context.prisma.user.findUnique({
        where: { id: notification.actorId },
      });
    },
    createdAt: (notification: any) => notification.createdAt.toISOString(),
  },
};
