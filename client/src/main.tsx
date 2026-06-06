import React from 'react';
import ReactDOM from 'react-dom/client';

// Error Interceptors for debugging blank screen
window.addEventListener('error', (e) => {
  console.error("Caught Global Error:", e);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 30px; color: #ff6b6b; background: #111; min-height: 100vh; font-family: monospace; line-height: 1.6;">
      <h1 style="color: #ff4a4a; margin-bottom: 15px;">🚨 Runtime Script Error</h1>
      <p><strong>Message:</strong> ${e.message}</p>
      <p><strong>Source:</strong> ${e.filename}:${e.lineno}:${e.colno}</p>
      <p><strong>Stack:</strong></p>
      <pre style="background: #222; padding: 15px; border-radius: 8px; overflow-x: auto; color: #eee;">${e.error?.stack || 'No stack trace'}</pre>
    </div>`;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error("Caught Unhandled Promise Rejection:", e);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 30px; color: #ffa834; background: #111; min-height: 100vh; font-family: monospace; line-height: 1.6;">
      <h1 style="color: #ff9f1a; margin-bottom: 15px;">⚠️ Unhandled Promise Rejection</h1>
      <p><strong>Reason:</strong> ${e.reason}</p>
      <p><strong>Stack:</strong></p>
      <pre style="background: #222; padding: 15px; border-radius: 8px; overflow-x: auto; color: #eee;">${e.reason?.stack || 'No stack trace'}</pre>
    </div>`;
  }
});

import App from './App';
import './index.css';
import { ApolloProvider } from '@apollo/client';
import client from './graphql/client';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

console.log("🚀 main.tsx loaded, rendering React root...");

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
