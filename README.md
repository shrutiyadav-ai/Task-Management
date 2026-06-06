# Collaborative Kanban Task Management Platform

A production-ready collaborative Kanban board (similar to Trello/Jira) built with a modern full-stack TypeScript architecture.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 5 + Tailwind CSS 3
- **Styling**: Glassmorphism theme, responsive designs, custom animations
- **Backend**: Node.js + Express + Apollo Server 4 (GraphQL)
- **Database**: PostgreSQL + Prisma ORM
- **Real-Time Collaboration**: Socket.io (handshake auth, presence view sync, mutations broadcasts)
- **Deployment**: Docker & Docker Compose

---

## Workspace Layout
```
kanban-platform/
├── docker-compose.yml     # Multi-container coordinator
├── client/                # React Vite UI client
│   ├── Dockerfile
│   └── src/
└── server/                # Express GraphQL API server
    ├── Dockerfile
    └── src/
```

---

## Local Development (Manual Setup)

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database instance

### 1. Database Setup
Create a `.env` file inside the `server/` directory:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kanban_db?schema=public"
JWT_SECRET="your_secure_development_jwt_signing_key_here"
NODE_ENV=development
```

Run database migrations and generate the client code:
```bash
cd server
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 2. Startup Server Backend
Start the Express API development server:
```bash
npm run dev
```
- **GraphQL playground**: `http://localhost:4000/graphql`
- **Websockets port**: `ws://localhost:4000`

### 3. Startup Frontend Client
```bash
cd ../client
npm install
npm run dev
```
- **Local url**: `http://localhost:5180`

---

## Running Test Suites
We configure a native Node assertion harness to test authentication security and access control rankings:
```bash
cd server
npm run test
```

---

## Production Deployment (Docker Compose)

The root folder has a pre-configured multi-container Docker Compose configuration to orchestrate all services.

### 1. Configure Production Environment
Create `.env` variables or update the settings inside `docker-compose.yml`:
- Update `JWT_SECRET` with a strong cryptographic key.
- Verify container database connections link correctly.

### 2. Run the Container Suite
Execute compile and orchestrate tasks from the root directory:
```bash
docker-compose up --build -d
```

### Port Mapping Details
- **Frontend Client**: `http://localhost:8080` (Hosted on Nginx with fallback paths to prevent 404s on SPA routing refresh)
- **Backend API**: `http://localhost:4000/graphql`
- **Database Server**: `postgresql://localhost:5432`
