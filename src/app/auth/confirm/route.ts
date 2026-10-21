import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Recovery links from the email template land here:
 *   /auth/confirm?token_hash=…&type=recovery&next=/reset-password
 * The token is exchanged for a session (cookies attach via redirect()),
 * then the browser continues to the password form.
 */
function safeNext(raw: string | null): string {
  const fallback = "/reset-password";
  if (!raw) return fallback;
  try {
    const base = new URL("http://n");
    const target = new URL(raw, base);
    if (target.origin !== base.origin) return fallback;
    const path = target.pathname + target.search + target.hash;
    // Post-resolution "//…" or "/\…" would be protocol-relative in a
    // Location header — never allow it even from a local-looking input.
    if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!tokenHash || type !== "recovery") {
    redirect("/reset-password?error=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/reset-password?error=1");
  }

  redirect(safeNext(searchParams.get("next")));
}
