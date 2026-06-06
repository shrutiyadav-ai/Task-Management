import { GraphQLError } from 'graphql';

export const UnauthenticatedError = (message = 'You must be logged in to access this resource.') => {
  return new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED' },
  });
};

export const ForbiddenError = (message = 'You do not have permission to perform this action.') => {
  return new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN' },
  });
};

export const UserInputError = (message = 'Invalid user input.', invalidArgs?: string[]) => {
  return new GraphQLError(message, {
    extensions: { 
      code: 'BAD_USER_INPUT',
      invalidArgs
    },
  });
};

export const NotFoundError = (message = 'Resource not found.') => {
  return new GraphQLError(message, {
    extensions: { code: 'NOT_FOUND' },
  });
};
