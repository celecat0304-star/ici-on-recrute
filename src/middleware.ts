import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CHEMINS_ADMIN_LIBRES = [
  "/admin/login",
  "/admin/mfa-setup",
  "/admin/mfa-verify",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const estAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const estMairie = pathname.startsWith("/mairie") || pathname.startsWith("/api/mairie");

  if (!estAdmin && !estMairie) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rediriger = (chemin: string) => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = chemin;
    return NextResponse.redirect(url);
  };

  if (estMairie) {
    if (pathname.startsWith("/mairie/login")) {
      if (user) return rediriger("/mairie");
      return response;
    }
    if (!user) return rediriger("/mairie/login");
    return response;
  }

  // À partir d'ici : routes /admin
  const estCheminLibre = CHEMINS_ADMIN_LIBRES.some((c) => pathname.startsWith(c));

  if (!user) {
    return estCheminLibre ? response : rediriger("/admin/login");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    if (pathname.startsWith("/admin/mfa-verify")) return response;
    return rediriger("/admin/mfa-verify");
  }

  if (aal?.nextLevel === "aal1") {
    if (pathname.startsWith("/admin/mfa-setup")) return response;
    return rediriger("/admin/mfa-setup");
  }

  if (pathname === "/admin/login") return rediriger("/admin");

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/mairie/:path*", "/api/mairie/:path*"],
};
