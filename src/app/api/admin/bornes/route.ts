import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { villeId, nom, lieu } = await request.json();

  if (!villeId || !nom || !lieu) {
    return NextResponse.json(
      { error: "Ville, nom et lieu obligatoires." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bornes")
    .insert({ ville_id: villeId, nom, lieu });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
