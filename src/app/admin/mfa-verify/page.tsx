"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function MfaVerifyPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    const chargerFacteur = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setErreur(error.message);
        return;
      }
      const facteur = data.totp[0];
      if (facteur) setFactorId(facteur.id);
      setPret(true);
    };
    chargerFacteur();
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
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="font-title text-2xl font-bold">
          Code de double authentification
        </h1>
        <label className="flex flex-col gap-1">
          <span>Code à 6 chiffres de votre application</span>
          <input
            type="text"
            inputMode="numeric"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="border-2 border-vert/30 rounded-lg px-3 py-2 min-h-[48px]"
          />
        </label>
        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        <button
          type="submit"
          disabled={envoi || !pret || !factorId}
          className="min-h-[48px] rounded-lg bg-vert text-white font-bold"
        >
          {envoi ? "Vérification..." : "Valider"}
        </button>
      </form>
    </div>
  );
}
