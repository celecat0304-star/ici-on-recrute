import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { synchroniserOffresVille } from "@/lib/franceTravail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const authHeader = request.headers.get("authorization");

  if (isProd && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: villes, error: villesError } = await supabase
    .from("villes")
    .select("id, nom, code_insee, rayon_recherche_km");

  if (villesError) {
    return NextResponse.json({ error: villesError.message }, { status: 500 });
  }

  const resultats: Record<string, number | string> = {};
  let total = 0;

  for (const ville of villes ?? []) {
    if (!ville.code_insee) {
      resultats[ville.nom] = "ignorée (pas de code INSEE)";
      continue;
    }
    try {
      const nombre = await synchroniserOffresVille(supabase, ville);
      resultats[ville.nom] = nombre;
      total += nombre;
    } catch (err) {
      resultats[ville.nom] = `erreur : ${(err as Error).message}`;
    }
  }

  return NextResponse.json({ ok: true, total, villes: resultats });
}
