"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function MfaSetupPage() {
  const router = useRouter();
  const [uri, setUri] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const inscrire = async () => {
      const supabase = createBrowserSupabaseClient();

      const { data: facteurs } = await supabase.auth.mfa.listFactors();
      for (const facteur of facteurs?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: facteur.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error) {
        setErreur(error.message);
        return;
      }
      setUri(data.totp.uri);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    };
    inscrire();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);

    const supabase = createBrowserSupabaseClient();
    const { data: challenge, error: erreurChallenge } =
      await supabase.auth.mfa.challenge({ factorId });

    if (erreurChallenge) {
      setErreur(erreurChallenge.message);
      setEnvoi(false);
      return;
    }

    const { error: erreurVerif } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    setEnvoi(false);

    if (erreurVerif) {
      setErreur("Code incorrect, réessayez.");
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-fond text-texte px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4">
        <h1 className="font-title text-2xl font-bold">
          Activer la double authentification
        </h1>
        <p className="text-sm opacity-80">
          Scannez ce code avec une application comme Google Authenticator ou
          Authy, puis entrez le code à 6 chiffres qu&apos;elle affiche.
        </p>

        {uri ? (
          <div className="self-center">
            <QRCodeSVG value={uri} size={180} />
          </div>
        ) : (
          <p>Préparation du code...</p>
        )}

        {secret && (
          <p className="text-xs opacity-60 break-all">
            Clé manuelle (si vous ne pouvez pas scanner) : {secret}
          </p>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span>Code à 6 chiffres</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border-2 border-vert/30 rounded-lg px-3 py-2 min-h-[48px]"
            />
          </label>
          {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
          <button
            type="submit"
            disabled={envoi || !factorId}
            className="min-h-[48px] rounded-lg bg-vert text-white font-bold"
          >
            {envoi ? "Vérification..." : "Confirmer"}
          </button>
        </form>
      </div>
    </div>
  );
}
