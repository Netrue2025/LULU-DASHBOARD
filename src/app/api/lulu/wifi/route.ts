import { NextResponse } from "next/server";

const DEFAULT_LULU_SD_URL = process.env.NEXT_PUBLIC_LULU_SD_URL ?? "http://192.168.1.100";

function cleanBaseUrl(value: string | null) {
  return (value || DEFAULT_LULU_SD_URL).trim().replace(/\/$/, "");
}

async function fetchFromLulu(baseUrl: string, path: string, init?: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = cleanBaseUrl(searchParams.get("baseUrl"));

  try {
    const response = await fetchFromLulu(baseUrl, "/wifi/scan");
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "LULU WiFi scan endpoint is not reachable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const baseUrl = cleanBaseUrl(String(body.baseUrl ?? ""));
  const ssid = String(body.ssid ?? "").trim();
  const password = String(body.password ?? "");

  if (!ssid) {
    return NextResponse.json({ detail: "WiFi SSID is required" }, { status: 400 });
  }

  try {
    const response = await fetchFromLulu(baseUrl, "/wifi/connect", {
      method: "POST",
      body: new URLSearchParams({ ssid, password })
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "LULU WiFi connect endpoint is not reachable" }, { status: 503 });
  }
}
