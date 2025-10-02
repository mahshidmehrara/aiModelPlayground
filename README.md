# AI Model Playground

This repo is a skeleton for the AI Model Playground project: a web app that sends a single prompt to multiple LLMs and streams their outputs side-by-side.

## Local quickstart

### Requirements
- Node 18+
- npm or yarn
- Postgres (local or Docker)

### Backend
```bash
cd backend
cp .env.example .env
# fill in .env with OpenAI key + DATABASE_URL
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

### Frontend
```bash
cd frontend
cp ../.env.example .env.local # optional
npm install
npm run dev
```

Open http://localhost:3000 (frontend). Backend default port is 3001 in this skeleton; adjust envs if needed.

--- 

This skeleton contains a minimal NestJS backend (with Prisma) and a Next.js frontend demonstrating SSE streaming per-model.
