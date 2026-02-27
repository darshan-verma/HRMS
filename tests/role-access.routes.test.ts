import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as postEmployee } from "@/app/api/v1/employees/route";
import { POST as postAttendance } from "@/app/api/v1/attendance/route";
import { POST as postLeave } from "@/app/api/v1/leave/route";
import { POST as postShift } from "@/app/api/v1/shifts/route";
import { POST as postLeaveDecision } from "@/app/api/v1/leave/requests/decision/route";

function toNextRequest(url: string, payload: unknown): NextRequest {
  return new NextRequest(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

describe("role-based route access", () => {
  it("denies EMPLOYEE from employee creation", async () => {
    const req = toNextRequest("http://localhost/api/v1/employees", {
      orgId: "org-1",
      actorRole: "EMPLOYEE",
      employeeCode: "E-001",
      fullName: "Test User",
      designation: "Engineer"
    });
    const res = await postEmployee(req);
    expect(res.status).toBe(403);
  });

  it("denies EMPLOYEE from attendance write", async () => {
    const req = toNextRequest("http://localhost/api/v1/attendance", {
      orgId: "org-1",
      actorRole: "EMPLOYEE",
      employeeId: "emp-1",
      attendanceDate: new Date().toISOString(),
      status: "PRESENT"
    });
    const res = await postAttendance(req);
    expect(res.status).toBe(403);
  });

  it("denies EMPLOYEE from leave write", async () => {
    const req = toNextRequest("http://localhost/api/v1/leave", {
      orgId: "org-1",
      actorRole: "EMPLOYEE",
      employeeId: "emp-1",
      leavePolicyId: "lp-1",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString()
    });
    const res = await postLeave(req);
    expect(res.status).toBe(403);
  });

  it("denies EMPLOYEE from shift create", async () => {
    const req = toNextRequest("http://localhost/api/v1/shifts", {
      orgId: "org-1",
      actorRole: "EMPLOYEE",
      name: "General",
      startMinute: 540,
      endMinute: 1080
    });
    const res = await postShift(req);
    expect(res.status).toBe(403);
  });

  it("denies EMPLOYEE from leave approval action", async () => {
    const req = toNextRequest("http://localhost/api/v1/leave/requests/decision", {
      orgId: "org-1",
      actorRole: "EMPLOYEE",
      actorUserId: "usr-1",
      leaveRequestId: "lr-1",
      decision: "APPROVED"
    });
    const res = await postLeaveDecision(req);
    expect(res.status).toBe(403);
  });
});
