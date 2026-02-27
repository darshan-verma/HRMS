# Enterprise HRMS Work Plan

## Phase 0 - Setup
- Setup Next.js + TypeScript
- Setup Prisma + PostgreSQL
- Configure ESLint + Prettier
- Configure Tailwind + ShadCN-ready component structure
- Setup environment variable structure
- Setup Docker and Docker Compose
- Setup CI/CD pipeline

## Phase 1 - Core System
- Auth system (JWT access + refresh, Google auth entrypoint)
- RBAC (centralized roles and permission checks)
- Organization structure and multi-tenant `org_id` boundaries
- Employee CRUD foundation
- Secure document upload scaffolding (S3 signed URL approach)
- Immutable audit logs

## Phase 2 - Attendance & Leave
- Shift management
- Attendance tracking
- Leave policy engine
- Leave approval workflow
- Accrual logic

## Phase 3 - Payroll Engine
- Salary structure modeling
- Tax calculation logic (India compliant)
- PF/ESI/TDS logic
- Decimal precision financial engine
- Payslip generation pipeline
- Bank export system

## Phase 4 - Performance
- OKR module
- KPI tracking
- Review workflows
- Increment history

## Phase 5 - Recruitment
- Job posting
- Candidate pipeline
- Interview scheduler
- Candidate to Employee conversion

## Phase 6 - Analytics & Optimization
- Dashboard metrics
- Redis caching for expensive reports
- Heavy query optimization
- Report export pipelines

## Phase 7 - Production Hardening
- Load testing
- Security audit
- Monitoring and alerting setup
- Backup and restore validation
- Final performance tuning
