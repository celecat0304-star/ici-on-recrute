import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action, motif } = await request.json();

  if (!["publier", "refuser"].includes(action)) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const nouveauStatut = action === "publier" ? "publiee" : "refusee";

  const dateExpiration =
    action === "publier"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;

  const { error } = await supabase
    .from("offres_commercants")
    .update({
      statut: nouveauStatut,
      motif_refus: action === "refuser" ? motif ?? null : null,
      date_expiration: dateExpiration,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
