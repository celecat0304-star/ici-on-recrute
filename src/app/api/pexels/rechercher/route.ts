import { NextRequest, NextResponse } from "next/server";
import { rechercherPhotosPexels } from "@/lib/pexels";

export async function GET(request: NextRequest) {
  const poste = request.nextUrl.searchParams.get("poste");
  if (!poste) {
    return NextResponse.json({ error: "Poste manquant." }, { status: 400 });
  }

  try {
    const photos = await rechercherPhotosPexels(poste);
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
