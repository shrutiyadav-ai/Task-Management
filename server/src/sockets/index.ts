import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/auth';
import prisma from '../config/db';

let ioInstance: SocketIOServer | null = null;

export const setIoInstance = (io: SocketIOServer) => {
  ioInstance = io;
};

export const getIoInstance = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.io instance not initialized.');
  }
  return ioInstance;
};

// Emit event to everyone viewing a board (optionally exclude sender)
export const broadcastBoardEvent = (
  boardId: string,
  event: string,
  payload: any,
  excludeSocketId?: string
) => {
  try {
    const io = getIoInstance();
    const roomName = `board:${boardId}`;
    if (excludeSocketId) {
      const senderSocket = io.sockets.sockets.get(excludeSocketId);
      if (senderSocket) {
        senderSocket.to(roomName).emit(event, payload);
        return;
      }
    }
    io.to(roomName).emit(event, payload);
  } catch (error) {
    console.error('Socket broadcast error:', error);
  }
};

// Emit event directly to an authenticated user
export const emitToUser = (userId: string, event: string, payload: any) => {
  try {
    const io = getIoInstance();
    io.to(`user:${userId}`).emit(event, payload);
  } catch (error) {
    console.error('Socket send to user error:', error);
  }
};

const getActiveUsersInBoard = async (io: SocketIOServer, boardId: string) => {
  const roomName = `board:${boardId}`;
  const sockets = await io.in(roomName).fetchSockets();
  const usersMap = new Map<string, { userId: string; name: string; email: string }>();

  for (const s of sockets) {
    const user = s.data.user;
    if (user) {
      usersMap.set(user.userId, {
        userId: user.userId,
        name: user.name,
        email: user.email,
      });
    }
  }

  return Array.from(usersMap.values());
};

export const initializeSockets = (io: SocketIOServer) => {
  setIoInstance(io);

  // Authenticate socket connection
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) {
        return next(new Error('Authentication failed: Token missing.'));
      }

      // Handle Bearer prefix if passed from headers
      const actualToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      const decoded = verifyToken(actualToken);

      if (!decoded) {
        return next(new Error('Authentication failed: Invalid token.'));
      }

      // Fetch user details to attach
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return next(new Error('Authentication failed: User not found.'));
      }

      socket.data.user = {
        userId: user.id,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (err) {
      next(new Error('Authentication error.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`🔌 Real-time client connected: ${user.name} (${socket.id})`);

    // Auto join personal room for individual live notifications
    socket.join(`user:${user.userId}`);

    // Join Board Room
    socket.on('joinBoard', async ({ boardId }: { boardId: string }) => {
      // Security check: Verify user is a member of the board (or board is public)
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { isPublic: true },
      });

      if (!board) {
        socket.emit('error', 'Board not found.');
        return;
      }

      const membership = await prisma.boardMember.findUnique({
        where: {
          boardId_userId: { boardId, userId: user.userId },
        },
      });

      if (!board.isPublic && !membership) {
        socket.emit('error', 'Access denied.');
        return;
      }

      const roomName = `board:${boardId}`;
      socket.join(roomName);
      socket.data.boardId = boardId;

      console.log(`👤 User ${user.name} joined room ${roomName}`);

      // Broadcast active user roster
      const roster = await getActiveUsersInBoard(io, boardId);
      io.to(roomName).emit('presenceUpdate', roster);
    });

    // Leave Board Room
    socket.on('leaveBoard', async () => {
      const boardId = socket.data.boardId;
      if (boardId) {
        const roomName = `board:${boardId}`;
        socket.leave(roomName);
        delete socket.data.boardId;

        console.log(`👤 User ${user.name} left room ${roomName}`);

        // Broadcast active user roster
        const roster = await getActiveUsersInBoard(io, boardId);
        io.to(roomName).emit('presenceUpdate', roster);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Real-time client disconnected: ${user.name} (${socket.id})`);
      const boardId = socket.data.boardId;
      if (boardId) {
        const roomName = `board:${boardId}`;
        const roster = await getActiveUsersInBoard(io, boardId);
        io.to(roomName).emit('presenceUpdate', roster);
      }
    });
  });
};
