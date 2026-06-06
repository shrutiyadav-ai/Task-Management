import { userResolvers } from './user';
import { boardResolvers } from './board';
import { columnResolvers } from './column';
import { taskResolvers } from './task';
import { commentResolvers } from './comment';
import { notificationResolvers } from './notification';

const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...boardResolvers.Query,
    ...notificationResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...boardResolvers.Mutation,
    ...columnResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...commentResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },
  // Field Resolvers
  Board: boardResolvers.Board,
  BoardMember: boardResolvers.BoardMember,
  Column: columnResolvers.Column,
  Task: taskResolvers.Task,
  Comment: commentResolvers.Comment,
  Notification: notificationResolvers.Notification,
};

export default resolvers;
