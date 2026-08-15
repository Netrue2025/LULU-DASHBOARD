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
    return await forwardJson("/api/reminders");
  } catch {
    return NextResponse.json({ detail: "LULU reminders endpoint is not reachable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";

  try {
    if (action === "update") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return NextResponse.json({ detail: "Reminder id is required" }, { status: 400 });
      return await forwardJson(`/api/reminders/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(body.reminder ?? {})
      });
    }

    if (action === "delete") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return NextResponse.json({ detail: "Reminder id is required" }, { status: 400 });
      return await forwardJson(`/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" });
    }

    if (action === "clear_history") {
      return await forwardJson("/api/reminders/history/clear", { method: "DELETE" });
    }

    return await forwardJson("/api/reminders", {
      method: "POST",
      body: JSON.stringify(body.reminder ?? body)
    });
  } catch {
    return NextResponse.json({ detail: "LULU reminders endpoint is not reachable" }, { status: 503 });
  }
}
