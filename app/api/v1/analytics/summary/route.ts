import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AnalyticsService } from "@/src/modules/analytics/analytics.service";

const querySchema = z.object({
  orgId: z.string().min(1)
});

const analyticsService = new AnalyticsService();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { orgId } = querySchema.parse(params);
    const data = await analyticsService.getOrgMetrics(orgId);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to fetch analytics summary." }, { status: 500 });
  }
}
