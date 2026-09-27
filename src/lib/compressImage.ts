// Compresse une image côté navigateur : largeur max 1600px, JPEG.
export async function compresserImage(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const largeurMax = 1600;
  const ratio = Math.min(1, largeurMax / bitmap.width);
  const largeur = Math.round(bitmap.width * ratio);
  const hauteur = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de traiter l'image");
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur);

  return canvas.toDataURL("image/jpeg", 0.82);
}
