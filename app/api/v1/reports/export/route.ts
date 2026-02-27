import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AnalyticsService } from "@/src/modules/analytics/analytics.service";

const querySchema = z.object({
  orgId: z.string().min(1),
  type: z.enum(["payroll", "leave", "headcount"])
});

const analyticsService = new AnalyticsService();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { orgId, type } = querySchema.parse(params);
    const csv = await analyticsService.exportCsv(orgId, type);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to export report." }, { status: 500 });
  }
}
