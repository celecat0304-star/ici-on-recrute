import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { synchroniserOffresVille } from "@/lib/franceTravail";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: ville, error: erreurVille } = await supabase
    .from("villes")
    .select("id, code_insee, rayon_recherche_km")
    .eq("id", id)
    .single();

  if (erreurVille || !ville) {
    return NextResponse.json({ error: "Ville introuvable." }, { status: 404 });
  }

  try {
    const nombre = await synchroniserOffresVille(supabase, ville);
    return NextResponse.json({ ok: true, nombre });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
