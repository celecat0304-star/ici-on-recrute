import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

export async function POST(request: NextRequest) {
  const { nom, codePostal, codeInsee, rayonRechercheKm } = await request.json();

  if (!nom || !codePostal) {
    return NextResponse.json(
      { error: "Nom et code postal obligatoires." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("villes").insert({
    nom,
    slug: slugify(nom),
    code_postal: codePostal,
    code_insee: codeInsee || null,
    rayon_recherche_km: rayonRechercheKm ? Number(rayonRechercheKm) : 10,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
