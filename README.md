# Enterprise HRMS Platform

Production-grade HRMS scaffold using:
- Next.js App Router + TypeScript
- Tailwind CSS + ShadCN-style UI components (`components/ui/*`)
- PostgreSQL + Prisma
- Redis + BullMQ

## Quick Start
1. Copy `.env.example` to `.env`
2. Install dependencies: `npm install`
3. Start infrastructure: `docker compose up -d postgres redis`
4. Apply DB migration: `npm run prisma:migrate`
5. Seed baseline org/admin: `npm run prisma:seed`
6. Generate Prisma client: `npm run prisma:generate`
7. Run app: `npm run dev`

## Key Documents
- `WORK_PLAN.md`
- `COMPLETION_CRITERIA.md`
- `ARCHITECTURE.md`
- `ERD.md`
- `docs/API_CURL_COLLECTION.md`

## UI Routes
- `/` - module launcher
- `/dashboard`
- `/shifts`
- `/attendance-ui`
- `/leave-ui`
- `/payroll-ui`
- `/recruitment-ui`
- `/analytics`
