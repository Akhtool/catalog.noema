import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { logServerError, trackServerEvent } from "@/lib/observability";

const CLIENT_EVENT_NAMES = new Set([
  "catalog_opened",
  "product_added_to_cart",
  "order_sent",
  "client_error",
] as const);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name : null;
    const payload = isObject(body?.payload) ? body.payload : {};
    const pathname = typeof body?.pathname === "string" ? body.pathname : null;

    if (!name || !CLIENT_EVENT_NAMES.has(name as never)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }

    const host = (await headers()).get("host");
    trackServerEvent(name as never, {
      ...payload,
      pathname,
      host,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("api.events", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
