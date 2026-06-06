import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';
import { createContext } from './graphql/context';
import { initializeSockets } from './sockets';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Initialize Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // For local development, restrict in production
      methods: ['GET', 'POST'],
    },
  });

  // Setup Socket.io event handling & JWT auth
  initializeSockets(io);

  // Apollo Server setup
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError, error) => {
      // Custom error formatter
      console.error('GraphQL Error:', error);
      return {
        message: formattedError.message,
        locations: formattedError.locations,
        path: formattedError.path,
        extensions: {
          code: formattedError.extensions?.code || 'INTERNAL_SERVER_ERROR',
          invalidArgs: formattedError.extensions?.invalidArgs,
        },
      };
    },
  });

  await server.start();

  // Middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: createContext,
    })
  );

  // Simple health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Start Server
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSockets listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Error starting the server:', error);
});
