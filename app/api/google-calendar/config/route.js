import { isConfigured } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(JSON.stringify({ configured: isConfigured() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
