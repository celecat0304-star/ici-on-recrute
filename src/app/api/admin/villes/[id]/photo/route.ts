import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET_PHOTOS = "offres-commercants";
const TAILLE_MAX_OCTETS = 4 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { photoBase64, type } = await request.json();
  const estLogo = type === "logo";

  const correspondance =
    typeof photoBase64 === "string"
      ? photoBase64.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/)
      : null;
  if (!correspondance) {
    return NextResponse.json({ error: "Image invalide." }, { status: 400 });
  }

  const tampon = Buffer.from(correspondance[2], "base64");
  if (tampon.byteLength > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ error: "Image trop volumineuse." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const extension = correspondance[1] === "jpeg" ? "jpg" : correspondance[1];
  const chemin = `villes/${estLogo ? "logo" : "photo"}-${id}-${Date.now()}.${extension}`;

  const { error: erreurUpload } = await supabase.storage
    .from(BUCKET_PHOTOS)
    .upload(chemin, tampon, { contentType: `image/${correspondance[1]}` });
  if (erreurUpload) {
    return NextResponse.json({ error: erreurUpload.message }, { status: 500 });
  }

  const url = supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(chemin).data.publicUrl;

  const { error } = await supabase
    .from("villes")
    .update(estLogo ? { logo_url: url } : { photo_hero_url: url })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url });
}
