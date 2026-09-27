type PieceJointe = { filename: string; content: string };

export async function envoyerEmail(params: {
  a: string;
  sujet: string;
  html: string;
  repondreA?: string;
  pieceJointe?: PieceJointe;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ici on recrute <onboarding@resend.dev>",
      to: params.a,
      subject: params.sujet,
      html: params.html,
      ...(params.repondreA ? { reply_to: params.repondreA } : {}),
      ...(params.pieceJointe ? { attachments: [params.pieceJointe] } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Échec de l'envoi d'e-mail (${res.status}) : ${await res.text()}`);
  }
}
