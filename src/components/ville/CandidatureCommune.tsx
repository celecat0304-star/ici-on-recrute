"use client";

import { useEffect, useState } from "react";
import { Ic } from "@/components/borne/BorneComposants";

type OffreCommercant = { id: string; poste: string; nom_commerce: string };

export default function CandidatureCommune({
  panierId,
  offres,
}: {
  panierId: string;
  offres: OffreCommercant[];
}) {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState<{ envoyees: number; echecs: number } | null>(null);
  const [cvNom, setCvNom] = useState("");
  const [cvBase64, setCvBase64] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<{ a: number; b: number } | null>(null);

  // Tirés côté navigateur seulement, sinon le serveur et le navigateur afficheraient deux chiffres différents
  useEffect(() => {
    setCaptcha({ a: Math.ceil(Math.random() * 8), b: Math.ceil(Math.random() * 8) });
  }, []);

  const onFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (fichier.type !== "application/pdf") {
      setErreur("Le CV doit être un fichier PDF.");
      return;
    }
    if (fichier.size > 4 * 1024 * 1024) {
      setErreur("Le CV est trop volumineux (4 Mo maximum).");
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
    const d = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/panier/candidater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panierId,
          prenom: d.get("prenom"),
          nom: d.get("nom"),
          email: d.get("email"),
          telephone: d.get("telephone"),
          message: d.get("message"),
          cvBase64,
          cvNomFichier: cvNom,
          consentement: d.get("consentement") === "on",
          siteWeb: d.get("siteWeb"),
          captchaA: captcha.a,
          captchaB: captcha.b,
          captchaReponse: d.get("captchaReponse"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResultat({ envoyees: data.envoyees ?? offres.length, echecs: data.echecs ?? 0 });
      } else {
        setErreur(data.error ?? "Une erreur est survenue, merci de réessayer.");
      }
    } catch {
      setErreur("Connexion impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (resultat) {
    return (
      <section className="rounded-[24px] bg-[#E3F4EC] p-6 text-[#0A5C39]">
        <p className="flex items-center gap-2 text-xl font-bold">
          <Ic n="coche" s={28} sw={3} />
          Candidature envoyée à {resultat.envoyees} commerçant{resultat.envoyees > 1 ? "s" : ""} !
        </p>
        <p className="mt-2 text-base">
          Ils vous répondront directement par e-mail. Vous allez aussi recevoir un récapitulatif.
        </p>
        {resultat.echecs > 0 && (
          <p className="mt-2 text-base font-bold">
            {resultat.echecs} envoi{resultat.echecs > 1 ? "s ont" : " a"} échoué : vous pouvez
            postuler à ces offres depuis leur fiche.
          </p>
        )}
      </section>
    );
  }

  const champ =
    "h-14 w-full rounded-xl border border-[#E4E0D6] bg-white px-4 text-base outline-none focus:border-[#2B3BE0] focus:ring-2 focus:ring-[#2B3BE0]/20";

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-[24px] bg-white p-5 shadow-[0_1px_0_#E4E0D6,0_6px_18px_rgba(15,26,69,0.05)] sm:p-6"
    >
      <div>
        <h2 className="font-title text-2xl font-bold leading-tight">
          Une seule candidature pour {offres.length} offre{offres.length > 1 ? "s" : ""}
        </h2>
        <p className="mt-1 text-base text-[#545A6B]">
          Remplissez une fois : votre candidature part vers chaque commerçant ci-dessous.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-base">
        {offres.map((o) => (
          <li key={o.id} className="flex items-start gap-2">
            <Ic n="coche" s={20} sw={3} className="mt-0.5 shrink-0 text-[#0E8A4A]" />
            <span>
              <strong>{o.poste}</strong>
              <span className="text-[#545A6B]"> — {o.nom_commerce}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-base">
          <span className="font-bold">Prénom *</span>
          <input name="prenom" required autoComplete="given-name" className={champ} />
        </label>
        <label className="flex flex-col gap-1 text-base">
          <span className="font-bold">Nom *</span>
          <input name="nom" required autoComplete="family-name" className={champ} />
        </label>
        <label className="flex flex-col gap-1 text-base">
          <span className="font-bold">E-mail *</span>
          <input name="email" type="email" required autoComplete="email" className={champ} />
        </label>
        <label className="flex flex-col gap-1 text-base">
          <span className="font-bold">Téléphone (facultatif)</span>
          <input name="telephone" type="tel" autoComplete="tel" className={champ} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-base">
        <span className="font-bold">Un petit mot (facultatif)</span>
        <textarea
          name="message"
          rows={3}
          maxLength={1500}
          className="w-full rounded-xl border border-[#E4E0D6] bg-white px-4 py-3 text-base outline-none focus:border-[#2B3BE0] focus:ring-2 focus:ring-[#2B3BE0]/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-base">
        <span className="font-bold">Joindre votre CV (PDF, facultatif)</span>
        <input type="file" accept="application/pdf" onChange={onFichier} className="text-base" />
        {cvNom && <span className="text-sm text-[#545A6B]">{cvNom}</span>}
      </label>

      <div className="hidden" aria-hidden="true">
        <label>
          Ne pas remplir
          <input name="siteWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {captcha && (
        <label className="flex flex-col gap-1 text-base">
          <span className="font-bold">
            Anti-robot : combien font {captcha.a} + {captcha.b} ? *
          </span>
          <input name="captchaReponse" type="number" required inputMode="numeric" className={champ} />
        </label>
      )}

      <label className="flex items-start gap-3 text-base">
        <input name="consentement" type="checkbox" required className="mt-1 h-6 w-6 shrink-0 accent-[#0E8A4A]" />
        <span>
          J’accepte que mes coordonnées{cvNom ? " et mon CV" : ""} soient transmis aux commerçants
          ci-dessus pour cette candidature. Ils ne sont pas conservés par Ici on recrute au-delà de
          30 jours.
        </span>
      </label>

      {erreur && (
        <p role="alert" className="text-base font-bold text-[#B42318]">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={envoiEnCours}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0E8A4A] text-lg font-bold text-white disabled:opacity-60"
      >
        <Ic n="envoyer" s={24} />
        {envoiEnCours
          ? "Envoi en cours…"
          : `Envoyer ma candidature à ${offres.length} commerçant${offres.length > 1 ? "s" : ""}`}
      </button>
    </form>
  );
}
