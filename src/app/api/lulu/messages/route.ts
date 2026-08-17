import { NextResponse } from "next/server";
import { LULU_API_BASE_URL } from "@/lib/lulu-api";

async function forwardJson(path: string, init?: RequestInit) {
  const response = await fetch(`${LULU_API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function GET() {
  try {
    return await forwardJson("/api/messages");
  } catch {
    return NextResponse.json({ detail: "LULU messages endpoint is not reachable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const payload = body && typeof body.message === "object" && !Array.isArray(body.message) ? body.message : body;

  try {
    return await forwardJson("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch {
    return NextResponse.json({ detail: "LULU messages endpoint is not reachable" }, { status: 503 });
  }
}
