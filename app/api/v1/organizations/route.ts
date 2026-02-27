import { OrganizationService } from "@/src/modules/org/org.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2)
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = schema.parse(await req.json());
  const service = new OrganizationService();
  const org = await service.create(input);
  return NextResponse.json(org, { status: 201 });
}
