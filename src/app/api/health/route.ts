import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "unknown";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "unreachable";
  }
  return NextResponse.json({
    status: "ok",
    app: "Sevika",
    database,
    time: new Date().toISOString(),
  });
}
