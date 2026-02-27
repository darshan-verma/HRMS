# Enterprise HRMS Architecture

## System Overview
- **Frontend**: Next.js App Router + TypeScript + Tailwind + ShadCN-ready component layer.
- **Backend**: Modular service design inside the same repository, with clear domain boundaries and API handlers.
- **Data**: PostgreSQL + Prisma for normalized transactional schema.
- **Async + Cache**: Redis + BullMQ for jobs, rate limiting, and report/session caching.

## Skill Alignment (Requested + Mapped)
- Frontend: `frontend-design`, `frontend-dev-guidelines`, `frontend-developer`
- Backend: `backend-architect`, `backend-dev-guidelines`, `backend-development-feature-development`, `backend-security-coder`
- Database: `database-architect`, `postgresql`
- Security/Auth: mapped to `auth-implementation-patterns`, `backend-security-coder`, `file-uploads`
- Payroll/Finance: implemented via decimal-safe modeling and pipeline placeholders (`decimal.js`)
- Scale/Perf: `bullmq-specialist`, Redis caching patterns, horizontal stateless API shape
- Observability: `observability-engineer`
- Quality/DevOps: `test-automator`, `github-actions-templates`, `docker-expert`

## Monorepo Structure

```txt
app/
modules/
components/
lib/
hooks/
services/
types/

src/
  modules/
    employee/
    payroll/
    attendance/
    leave/
    auth/
    analytics/
    recruitment/
  common/
  config/
  jobs/
  middlewares/
```

## Cross-Cutting Architecture Rules
- Strict separation of concerns.
- No business logic in route handlers.
- Centralized RBAC authorization primitives.
- Multi-tenant boundary via `org_id` on all tenant-owned data.
- Immutable audit logging for sensitive actions.
- Decimal precision for payroll and tax calculations.
- Zod validation for all external input.
- Zero hardcoded secrets.

## Security Design
- JWT access + refresh token model.
- Google OAuth entrypoint for enterprise login.
- AES-256-GCM field-level encryption for salary/bank columns.
- Signed URL design for secure document access.
- Rate limiting middleware (Redis-backed design).
- CSRF protection middleware for state-changing API calls.

## Performance Design
- Mandatory pagination for list endpoints.
- Redis cache for report and hot-read data.
- BullMQ queues for payroll generation, reports, and async audit fanout.
- DB indexes on FK and frequently filtered dimensions.

## Observability Design
- Structured logs with correlation IDs.
- Audit trail tables for compliance events.
- Trace/metrics/log hooks designed for OpenTelemetry-compatible export.
- SLO targets:
  - p95 API latency < 300ms (core endpoints)
  - queue processing success > 99.9%

## Phase 1 Delivery in This Scaffold
- Bootstrapped app + configs + Docker + CI.
- Base Prisma schema with tenant-aware core modules.
- Auth/RBAC/security/audit foundation files.
- Domain module skeletons for employee, attendance, leave.
