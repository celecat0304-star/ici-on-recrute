import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action, motif } = await request.json();

  const actionsValides = [
    "publier",
    "publier_sans_image",
    "refuser",
    "retirer",
    "renouveler",
  ];
  if (!actionsValides.includes(action)) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (action === "renouveler") {
    const { error } = await supabase
      .from("offres_commercants")
      .update({
        date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const nouveauStatut =
    action === "refuser" ? "refusee" : action === "retirer" ? "expiree" : "publiee";

  const dateExpiration =
    nouveauStatut === "publiee"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;

  const { error } = await supabase
    .from("offres_commercants")
    .update({
      statut: nouveauStatut,
      motif_refus: action === "refuser" ? motif ?? null : null,
      date_expiration: dateExpiration,
      ...(action === "publier_sans_image"
        ? { image_url: null, image_source: "aucune", pexels_photographe: null, pexels_url: null }
        : {}),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
