# 📋 Collaborative Kanban Task Management Platform

A production-grade, real-time collaborative Kanban board (similar to Trello/Jira) designed for team coordination. Built with a modern full-stack TypeScript architecture, implementing responsive glassmorphic interfaces, robust database access constraints, and instant websocket synchronization.

---

## 🌟 Key Features

### 🔒 Secure Authentication & User Settings
- **JWT Session Verification**: Secure login and sign-up with encrypted passwords stored using bcrypt.
- **Context Injection**: Active user parameters are injected into the GraphQL engine context to protect operations.
- **Profile Customization**: Live updates of display names and customizable avatar image links.

### 📊 Relational Kanban Workspaces
- **Boards Manager**: Spin up private workspaces or list public boards in custom grid cards.
- **Lane Control**: Dynamic column creation, sorting positioning coefficients, and deletion.
- **Checklist Cards**: Fully customizable task cards featuring titles, descriptions, due dates, priorities, and assigned team members.
- **Label Tagging**: Visual board labels mapping custom HEX colors to classify card domains.
- **Card Conversations**: Threaded comments on task lanes with author-only delete validation safeguards.

### ⚡ Real-Time Collaboration & Sockets
- **Deduplicated Presence Roster**: Displays a live visual list of avatars currently viewing a board.
- **Optimistic UI Client Cache**: Card swaps and list reordering take effect instantly on the UI without lags, while database operations execute asynchronously in the background.
- **Live Notifications Center**: Instant socket alerts notify users immediately when they are assigned tasks or when comments are added.
- **Dynamic Board Broadcasting**: Column additions, reorder positions, commenting updates, and card removals are synced to all active browsers instantly.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client [Vite React Client]
        Vite[Vite + TS]
        React[React Core]
        Dnd[@dnd-kit Drag-and-Drop]
        ApolloClient[Apollo Client Cache]
        SocketClient[Socket.io-client]
        
        React --> Dnd
        React --> ApolloClient
        React --> SocketClient
    end

    subgraph Server [Node.js Backend]
        Express[Express Server]
        ApolloServer[Apollo Server GraphQL]
        SocketServer[Socket.io Server]
        RBAC[RBAC Guards]
        Prisma[Prisma Client]

        Express --> ApolloServer
        Express --> SocketServer
        ApolloServer --> RBAC
        ApolloServer --> Prisma
    end

    subgraph Storage [Database]
        SQLite[(SQLite file: dev.db)]
    end

    ApolloClient -- "GraphQL Queries & Mutations" --> ApolloServer
    SocketClient -- "Presence & Real-Time Sync" --> SocketServer
    Prisma -- "Prisma Engine Queries" --> SQLite
```

---

## 📂 Directory Layout

```
├── docker-compose.yml     # Multi-container orchestration (Postgres, API, UI)
├── README.md              # Document guide
├── client/                # React Vite UI client
│   ├── Dockerfile
│   ├── src/
│   │   ├── context/       # Auth & Socket state hooks
│   │   ├── graphql/       # Apollo client links & operations definitions
│   │   └── pages/         # Login, Dashboard, Board Workspace
│   └── tailwind.config.js
└── server/                # Express GraphQL API server
    ├── Dockerfile
    ├── prisma/            # SQLite migrations & schema configurations
    └── src/
        ├── graphql/       # Schema definitions & resolver files
        ├── sockets/       # Sockets room handshakes & broadcasts
        ├── tests/         # Cryptography & Access guards unit tests
        └── utils/         # Authentication & RBAC helper modules
```

---

## 🚀 Local Development Setup

Follow these manual steps to spin up the application manually:

### 1. Backend Server Setup
Create a `.env` file inside the `server/` directory:
```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="development_secret_signing_key_11223344"
NODE_ENV=development
```

Compile Prisma models and initialize the database:
```bash
cd server
npm install
npx prisma db push
```

Start the Express GraphQL API server:
```bash
npm run dev
```
- **GraphQL playground URL**: `http://localhost:4000/graphql`
- **Websockets listener port**: `ws://localhost:4000`

---

### 2. Frontend Client Setup
Vite is pre-configured to host local client scripts on **port 5180** to avoid conflicts:
```bash
cd ../client
npm install --legacy-peer-deps
npm run dev
```

- **Open Web Browser**: **`http://localhost:5180`**

---

## 🧪 Running Unit Tests
We configure a zero-dependency native assertion testing script to ensure cryptography and access guards execute correctly:
```bash
cd server
npm run test
```

---

## 🐳 Production Container Deployment
To package the stack for multi-container cloud architectures, run Docker Compose from the root workspace directory:
```bash
docker-compose up --build -d
```
- **Live web dashboard**: `http://localhost:8080` (Served over Nginx static proxies)
