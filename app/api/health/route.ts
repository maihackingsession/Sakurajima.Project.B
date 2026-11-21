import { connection } from "next/server";
import { isMockMode } from "@/lib/claude";

// connection() keeps this dynamic, so the mock flag reflects the live env (not build time).
export async function GET() {
  await connection();
  return Response.json({ ok: true, mock: isMockMode(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "lokal" });
}
