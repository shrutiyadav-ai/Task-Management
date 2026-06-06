import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface PresenceUser {
  userId: string;
  name: string;
  email: string;
}

interface SocketContextType {
  socket: Socket | null;
  presenceUsers: PresenceUser[];
  joinBoard: (boardId: string) => void;
  leaveBoard: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setPresenceUsers([]);
      return;
    }

    const newSocket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to real-time sync server');
    });

    newSocket.on('presenceUpdate', (users: PresenceUser[]) => {
      setPresenceUsers(users);
    });

    newSocket.on('error', (err: string) => {
      console.error('Socket error:', err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinBoard = (boardId: string) => {
    if (socket) {
      socket.emit('joinBoard', { boardId });
    }
  };

  const leaveBoard = () => {
    if (socket) {
      socket.emit('leaveBoard');
      setPresenceUsers([]);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, presenceUsers, joinBoard, leaveBoard }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
