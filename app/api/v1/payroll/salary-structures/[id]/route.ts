import { PERMISSIONS } from "@/lib/auth/rbac";
import { SalaryStructureService } from "@/src/modules/payroll/salary-structure.service";
import { authorize } from "@/src/middlewares/authorize";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({ orgId: z.string().min(1), actorRole: z.string().min(1) });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = paramsSchema.parse(await params);
  const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const forbidden = authorize(query.actorRole, PERMISSIONS.PAYROLL_READ);
  if (forbidden) return forbidden;

  const service = new SalaryStructureService();
  const structure = await service.getById(query.orgId, id);
  if (!structure) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(structure);
}
