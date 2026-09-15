import { NextResponse } from "next/server";
import { nestAuthRequest, readResponsePayload } from "@/lib/auth/server-api";

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const upstream = await nestAuthRequest("/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(await readResponsePayload(upstream), {
    status: upstream.status,
  });
}
