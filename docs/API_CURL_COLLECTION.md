# HRMS API Curl Collection

Base URL:

```bash
export BASE_URL="http://localhost:3000"
```

## Setup and Seed

```bash
docker compose up -d postgres redis
cp .env.example .env
npm run prisma:migrate
npm run prisma:seed
```

## Org and Auth

```bash
curl -X POST "$BASE_URL/api/v1/organizations" \
  -H "content-type: application/json" \
  -d '{"name":"Acme HRMS"}'
```

```bash
curl -X POST "$BASE_URL/api/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","orgId":"seed-org"}'
```

## Employee and Department

```bash
curl -X POST "$BASE_URL/api/v1/departments" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","name":"Engineering"}'
```

```bash
curl -X POST "$BASE_URL/api/v1/employees" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","employeeCode":"EMP001","fullName":"Asha Verma","designation":"Engineer"}'
```

## Phase 2: Shift, Attendance, Leave

```bash
curl -X POST "$BASE_URL/api/v1/shifts" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","name":"General","startMinute":540,"endMinute":1080,"graceMinutes":15}'
```

```bash
curl -X POST "$BASE_URL/api/v1/attendance/check-in" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","employeeId":"<EMP_ID>","at":"2026-03-01T09:05:00.000Z"}'
```

```bash
curl -X POST "$BASE_URL/api/v1/leave/policies" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","leaveType":"CL","annualQuota":12,"carryForward":false,"accrualPerMonth":"1.00"}'
```

```bash
curl -X POST "$BASE_URL/api/v1/leave/accrual/run" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN"}'
```

## Phase 3: Payroll

```bash
curl -X POST "$BASE_URL/api/v1/payroll/salary-structures" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","employeeId":"<EMP_ID>","basic":"30000","hra":"12000","specialAllowance":"8000","effectiveFrom":"2026-03-01T00:00:00.000Z"}'
```

```bash
curl -X POST "$BASE_URL/api/v1/payroll/runs" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","period":"2026-03"}'
```

```bash
curl -X POST "$BASE_URL/api/v1/payroll/runs/generate" \
  -H "content-type: application/json" \
  -d '{"orgId":"seed-org","actorRole":"HR_ADMIN","payrollRunId":"<RUN_ID>","regime":"NEW","runInline":true}'
```

```bash
curl "$BASE_URL/api/v1/payroll/runs/bank-export?orgId=seed-org&actorRole=HR_ADMIN&payrollRunId=<RUN_ID>"
```
