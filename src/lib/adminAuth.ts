const COOKIE_NAME = "admin_session";

function comparaisonConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signature(): Promise<string> {
  const encodeur = new TextEncoder();
  const cle = await crypto.subtle.importKey(
    "raw",
    encodeur.encode(process.env.ADMIN_SESSION_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBrute = await crypto.subtle.sign(
    "HMAC",
    cle,
    encodeur.encode("admin-authentifie")
  );
  return Array.from(new Uint8Array(signatureBrute))
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("");
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export async function adminCookieValue(): Promise<string> {
  return signature();
}

export async function estSessionAdminValide(
  valeurCookie: string | undefined
): Promise<boolean> {
  if (!valeurCookie) return false;
  const attendu = await signature();
  return comparaisonConstante(valeurCookie, attendu);
}
