# AgroConnect

**Connecting Agriculture. Empowering Markets.**

AgroConnect is a digital agricultural marketplace and supply-chain coordination platform. It brings farmers, buyers and transporters together to make agricultural trade simpler, smarter and more accessible.

This repository contains Phase 1 of the project: the initial frontend and backend foundations. Authentication, dashboards, marketplace features and database integration are intentionally not implemented yet.

## Project Structure

```text
AgroConnect/
├── backend/                  # Express.js + TypeScript API
│   ├── src/
│   │   ├── config/           # Environment configuration
│   │   ├── middleware/       # Not-found and error-handling middleware
│   │   ├── routes/           # API routes
│   │   ├── app.ts            # Express application configuration
│   │   └── server.ts         # Server startup and graceful shutdown
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                 # Next.js App Router + TypeScript frontend
│   ├── public/
│   ├── src/
│   │   ├── app/              # App Router layout, page and global styles
│   │   ├── components/       # Shared UI components
│   │   ├── features/         # Feature-specific UI
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and API helpers
│   │   └── types/            # Shared TypeScript types
│   ├── next.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .gitignore
├── README.md
└── skills.md
```

The frontend and backend are separate applications. There is no monorepo, npm workspace or shared package layer.

## Technology

### Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- ESLint
- npm

### Backend

- Node.js
- Express.js
- TypeScript
- dotenv
- tsx (development)
- ESLint
- npm

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Getting Started

Install and run each application separately.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at <http://localhost:3000>.

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs at <http://localhost:5000>.

## Environment Variables

Copy each `.env.example` file to `.env` when local overrides are needed. Never commit real secrets.

Frontend (`frontend/.env.example`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Backend (`backend/.env.example`):

```env
NODE_ENV=development
PORT=5000
```

The backend uses sensible defaults when no `.env` file is present.

## API

| Method | Endpoint     | Description          |
| ------ | ------------ | -------------------- |
| GET    | `/api/health` | API health check     |

Example response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "agroconnect-api",
    "timestamp": "2026-01-01T00:00:00.000Z",
    "uptime": 12
  }
}
```

Unknown routes return a `404` JSON response. Unhandled errors are passed through centralized error-handling middleware.

## Available Scripts

### Frontend

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start the development server   |
| `npm run build`   | Create a production build      |
| `npm run start`   | Start the production server    |
| `npm run lint`    | Run ESLint                     |

### Backend

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start in watch mode with tsx      |
| `npm run build`     | Compile TypeScript to `dist/`     |
| `npm run start`     | Run the compiled server           |
| `npm run typecheck` | Run TypeScript without emitting   |
| `npm run lint`      | Run ESLint                        |

## Phase 1 Scope

Implemented:

- Next.js landing page with AgroConnect brand identity
- Responsive, accessible layout for mobile and desktop
- Express application with JSON middleware
- `GET /api/health` endpoint
- Not-found handling and centralized error handling
- Environment variable configuration
- TypeScript, linting and production build setup

Not implemented in this phase:

- Authentication or registration
- Dashboards
- Marketplace, produce listings or orders
- PostgreSQL or any database
- Redis, Docker or other infrastructure services

Phase 2 must not begin until explicitly approved.

## Coding Rules for AI Agents

All future work must follow the rules in [`skills.md`](./skills.md). In summary:

- Read the project documentation before changing code.
- Work only on the approved development phase.
- Use TypeScript.
- Keep frontend and backend separate.
- Validate inputs and permissions.
- Write tests for implemented functionality.
- Avoid unnecessary dependencies.
- Never expose secrets.
- Review changes before finishing.
- Wait for approval before starting another phase.
# AgroConnect
