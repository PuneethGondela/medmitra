// lib/supabase-server.ts
// Server-side client that respects RLS (uses user's session)
// For Next.js App Router API routes
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  // Get the session from cookies
  const accessToken = cookieStore.get("sb-access-token")?.value;
  const refreshToken = cookieStore.get("sb-refresh-token")?.value;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // If we have tokens, set the session
  if (accessToken) {
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (user) {
      // Session is set via the token
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      });
    }
  }

  return supabase;
}

// Alternative: Get user from Authorization header (for API routes)
export async function getSupabaseClientFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    // Try to get from cookies
    return createServerSupabaseClient();
  }

  const token = authHeader.replace("Bearer ", "");
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  await supabase.auth.setSession({
    access_token: token,
    refresh_token: "",
  });

  return supabase;
}

