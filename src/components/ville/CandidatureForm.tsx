"use client";

import { useEffect, useState } from "react";

export default function CandidatureForm({ offreId }: { offreId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [cvNom, setCvNom] = useState("");
  const [cvBase64, setCvBase64] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<{ a: number; b: number } | null>(null);

  useEffect(() => {
    if (ouvert && !captcha) {
      setCaptcha({ a: Math.ceil(Math.random() * 8), b: Math.ceil(Math.random() * 8) });
    }
  }, [ouvert, captcha]);

  const onFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (fichier.type !== "application/pdf") {
      setErreur("Le CV doit être un fichier PDF.");
      return;
    }
    setErreur("");
    setCvNom(fichier.name);
    const lecteur = new FileReader();
    lecteur.onload = () => setCvBase64(lecteur.result as string);
    lecteur.readAsDataURL(fichier);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!captcha) return;
    setErreur("");
    setEnvoiEnCours(true);

    const donnees = new FormData(e.currentTarget);
    const res = await fetch("/api/commercant/candidater", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offreId,
        nomCandidat: donnees.get("nomCandidat"),
        contactCandidat: donnees.get("contactCandidat"),
        message: donnees.get("message"),
        cvBase64,
        cvNomFichier: cvNom,
        siteWeb: donnees.get("siteWeb"),
        captchaA: captcha.a,
        captchaB: captcha.b,
        captchaReponse: donnees.get("captchaReponse"),
      }),
    });

    setEnvoiEnCours(false);

    if (res.ok) {
      setEnvoyee(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error ?? "Une erreur est survenue, merci de réessayer.");
    }
  };

  if (envoyee) {
    return (
      <div className="bg-white border border-black/5 shadow-sm rounded-xl p-5 mt-4">
        <p className="font-bold text-vert">
          Votre candidature a bien été envoyée !
        </p>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="mt-4 bg-vert text-white font-bold rounded-xl px-6 py-4 text-center hover:opacity-90"
      >
        Postuler en ligne
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-black/5 shadow-sm rounded-xl p-5 mt-4 flex flex-col gap-3"
    >
      <p className="font-bold">Postuler en ligne</p>

      <label className="flex flex-col gap-1">
        <span>Votre nom *</span>
        <input name="nomCandidat" required className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span>Votre e-mail ou téléphone *</span>
        <input name="contactCandidat" required className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span>Message (optionnel)</span>
        <textarea name="message" rows={3} className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span>Joindre un CV (PDF, optionnel)</span>
        <input type="file" accept="application/pdf" onChange={onFichier} />
        {cvNom && <span className="text-sm opacity-70">{cvNom}</span>}
      </label>

      <div className="hidden" aria-hidden="true">
        <label>
          Ne pas remplir
          <input name="siteWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {captcha && (
        <label className="flex flex-col gap-1">
          <span>Anti-robot : combien font {captcha.a} + {captcha.b} ? *</span>
          <input name="captchaReponse" type="number" required className="input" />
        </label>
      )}

      {erreur && <p className="text-red-600">{erreur}</p>}

      <button
        type="submit"
        disabled={envoiEnCours}
        className="mt-2 bg-vert text-white font-bold rounded-xl px-6 py-3"
      >
        {envoiEnCours ? "Envoi..." : "Envoyer ma candidature"}
      </button>

      <style jsx>{`
        .input {
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: white;
          border-radius: 0.5rem;
          padding: 0.6rem 0.8rem;
          color: inherit;
        }
      `}</style>
    </form>
  );
}
