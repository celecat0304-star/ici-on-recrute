import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, estSessionAdminValide } from "@/lib/adminAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (pathname === "/api/admin/login") return NextResponse.next();

  const cookie = request.cookies.get(adminCookieName())?.value;
  if (!(await estSessionAdminValide(cookie))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
