import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, adminCookieValue } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const { motDePasse } = await request.json();

  if (motDePasse !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName(), await adminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
