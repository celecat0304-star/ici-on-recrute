"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createPublicClient } from "@/lib/supabase/public";
import type { OffreAffichee } from "@/lib/types";

const DELAI_INACTIVITE_MS = 60_000;
const SEUIL_GLISSEMENT_PX = 50;
const DELAI_ENVOI_STATS_MS = 10_000;
const DELAI_ROTATION_ATTENTE_MS = 12_000;
const MAX_SELECTION = 10;

type Props = {
  borne: { id: string; nom: string; lieu: string };
  villeId: string;
  villeNom: string;
  villeSlug: string;
  offres: OffreAffichee[];
  caseA: OffreAffichee[];
  caseB: OffreAffichee[];
  offresCommercantsCount?: number;
};

type EvenementStat = {
  type: "vue" | "interet" | "qr_affiche" | "selection";
  origine: "borne";
  ville_id: string;
  borne_id: string;
  offre_type: "france_travail" | "commercant";
  offre_id: string;
};

type ElementSelection = { source: "commercant" | "france_travail"; id: string };

function champsAffichage(offre: OffreAffichee) {
  if (offre.source === "commercant") {
    return {
      titre: offre.poste,
      sousTitre: offre.nom_commerce,
      lieu: offre.quartier,
      contrat: offre.type_contrat,
      tempsTravail: offre.temps_travail,
      description: offre.description,
      sourceLabel: "Commerçant du coin",
      imageUrl: offre.image_url,
      estLogo: false,
      creditPexels:
        offre.image_source === "pexels" ? offre.pexels_photographe : null,
      grandeEntreprise: offre.categorie === "entreprise",
    };
  }
  return {
    titre: offre.intitule,
    sousTitre: offre.entreprise_nom,
    lieu: offre.lieu_travail,
    contrat: offre.type_contrat,
    tempsTravail: offre.duree_travail,
    description: offre.description,
    sourceLabel: "France Travail",
    imageUrl: offre.entreprise_logo_url,
    estLogo: true,
    creditPexels: null as string | null,
    grandeEntreprise: false,
  };
}

export default function BorneClient({
  borne,
  villeId,
  villeNom,
  villeSlug,
  offres,
  caseA,
  caseB,
  offresCommercantsCount = 0,
}: Props) {
  const [mode, setMode] = useState<"attente" | "navigation">("attente");
  const [indexAttente, setIndexAttente] = useState(0);
  const [index, setIndex] = useState(0);
  const [detailOuvert, setDetailOuvert] = useState(false);
  const [selection, setSelection] = useState<ElementSelection[]>([]);
  const [messageLimite, setMessageLimite] = useState(false);
  const [emailFormOuvert, setEmailFormOuvert] = useState(false);
  const [envoiPanierEnCours, setEnvoiPanierEnCours] = useState(false);
  const [erreurPanier, setErreurPanier] = useState("");
  const [panierConfirmation, setPanierConfirmation] = useState<{
    email: string;
    lien: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const evenementsEnAttente = useRef<EvenementStat[]>([]);
  const supabase = useMemo(() => createPublicClient(), []);

  const offre = offres[index];
  const infos = offre ? champsAffichage(offre) : null;
  const estCommercant = offre?.source === "commercant";
  const offresFranceTravailCount = offres.length - offresCommercantsCount;

  const estDansSelection = (o: OffreAffichee) =>
    selection.some((s) => s.source === o.source && s.id === o.id);

  const enregistrerEvenement = (
    type: EvenementStat["type"],
    cible: OffreAffichee | undefined = offre
  ) => {
    if (!cible) return;
    evenementsEnAttente.current.push({
      type,
      origine: "borne",
      ville_id: villeId,
      borne_id: borne.id,
      offre_type: cible.source === "commercant" ? "commercant" : "france_travail",
      offre_id: cible.id,
    });
  };

  useEffect(() => {
    const envoyer = () => {
      if (evenementsEnAttente.current.length === 0) return;
      const lot = evenementsEnAttente.current;
      evenementsEnAttente.current = [];
      supabase.from("evenements").insert(lot).then(({ error }) => {
        if (error) evenementsEnAttente.current.push(...lot);
      });
    };
    const intervalle = setInterval(envoyer, DELAI_ENVOI_STATS_MS);
    return () => {
      clearInterval(intervalle);
      envoyer();
    };
  }, [supabase]);

  useEffect(() => {
    if (mode === "navigation" && offre) {
      enregistrerEvenement("vue");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offre?.id, mode]);

  // Rotation automatique du duo d'offres sur l'écran d'attente
  useEffect(() => {
    if (mode !== "attente") return;
    const intervalle = setInterval(() => {
      setIndexAttente((i) => i + 1);
    }, DELAI_ROTATION_ATTENTE_MS);
    return () => clearInterval(intervalle);
  }, [mode]);

  const revenirAAttente = () => {
    setMode("attente");
    setIndex(0);
    setDetailOuvert(false);
    setSelection([]);
    setEmailFormOuvert(false);
    setPanierConfirmation(null);
    setErreurPanier("");
  };

  const reinitialiserInactivite = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mode === "navigation" && !emailFormOuvert && !panierConfirmation) {
      timerRef.current = setTimeout(revenirAAttente, DELAI_INACTIVITE_MS);
    }
  };

  useEffect(() => {
    reinitialiserInactivite();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, index, detailOuvert, emailFormOuvert, panierConfirmation]);

  const commencerNavigation = () => {
    setMode("navigation");
    setIndex(0);
  };

  const suivante = () => {
    setDetailOuvert(false);
    setIndex((i) => Math.min(i + 1, offres.length - 1));
  };

  const precedente = () => {
    setDetailOuvert(false);
    setIndex((i) => Math.max(i - 1, 0));
  };

  const toggleSelection = () => {
    if (!offre) return;
    if (estDansSelection(offre)) {
      setSelection((s) => s.filter((x) => !(x.source === offre.source && x.id === offre.id)));
      return;
    }
    if (selection.length >= MAX_SELECTION) {
      setMessageLimite(true);
      setTimeout(() => setMessageLimite(false), 3000);
      return;
    }
    setSelection((s) => [...s, { source: offre.source, id: offre.id }]);
    enregistrerEvenement("selection");
  };

  const envoyerPanier = async (email: string) => {
    setErreurPanier("");
    setEnvoiPanierEnCours(true);
    const res = await fetch("/api/panier/creer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ villeId, email, offres: selection }),
    });
    const data = await res.json().catch(() => ({}));
    setEnvoiPanierEnCours(false);
    if (res.ok) {
      setPanierConfirmation({ email, lien: data.lien });
      setEmailFormOuvert(false);
    } else {
      setErreurPanier(data.error ?? "Une erreur est survenue.");
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SEUIL_GLISSEMENT_PX) {
      if (delta < 0) suivante();
      else precedente();
    }
    touchStartX.current = null;
  };

  if (mode === "attente") {
    const offreA = caseA.length > 0 ? caseA[indexAttente % caseA.length] : null;
    const offreB = caseB.length > 0 ? caseB[indexAttente % caseB.length] : null;

    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center text-center gap-6 px-6 py-8 cursor-pointer bg-fond text-texte"
        onClick={commencerNavigation}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && commencerNavigation()}
      >
        <h1 className="font-title text-6xl font-bold text-vert">On recrute.</h1>
        <p className="text-2xl">à {villeNom}</p>

        {(offreA || offreB) && (
          <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mt-4">
            {offreA && <CarteAnnonce offre={offreA} etiquette="Offre à la une" />}
            {offreB && <CarteAnnonce offre={offreB} etiquette="Commerçant du coin" />}
          </div>
        )}

        <div className="flex gap-10 text-xl mt-4">
          <p>
            <span className="font-bold text-3xl block">{offresFranceTravailCount}</span>
            offres aujourd&apos;hui
          </p>
          <p>
            <span className="font-bold text-3xl block">{offresCommercantsCount}</span>
            offres de commerçants du coin
          </p>
        </div>
        <p className="text-lg mt-4 opacity-70">Touchez l&apos;écran pour tout voir</p>
      </div>
    );
  }

  if (!offre || !infos) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-fond text-texte px-8 text-center">
        <p className="text-2xl">Aucune offre disponible pour le moment.</p>
        <button
          onClick={revenirAAttente}
          className="min-h-[72px] px-8 rounded-xl bg-vert text-white text-xl font-bold"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  if (panierConfirmation) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-fond text-texte px-8 text-center">
        <h2 className="font-title text-3xl font-bold text-vert">C&apos;est envoyé !</h2>
        <p className="text-xl max-w-md">
          Un lien a été envoyé à {panierConfirmation.email}. Vous pouvez aussi
          scanner ce code pour retrouver vos offres sur votre téléphone :
        </p>
        <QRCodeSVG value={panierConfirmation.lien} size={220} />
        <button
          onClick={revenirAAttente}
          className="min-h-[72px] px-10 rounded-xl bg-vert text-white text-xl font-bold mt-4"
        >
          Terminé
        </button>
      </div>
    );
  }

  if (emailFormOuvert) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-fond text-texte px-8 text-center">
        <h2 className="font-title text-3xl font-bold">Recevoir mes offres</h2>
        <p className="text-lg max-w-md opacity-80">
          {selection.length} offre(s) sélectionnée(s). Entrez votre e-mail pour
          recevoir le lien (et le voir aussi en QR code ici).
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const email = new FormData(e.currentTarget).get("email") as string;
            envoyerPanier(email);
          }}
          className="flex flex-col gap-4 w-full max-w-sm"
        >
          <input
            name="email"
            type="email"
            required
            autoFocus
            placeholder="vous@exemple.fr"
            className="min-h-[64px] text-xl text-center rounded-xl border-2 border-vert/40 px-4"
          />
          {erreurPanier && <p className="text-red-600">{erreurPanier}</p>}
          <button
            type="submit"
            disabled={envoiPanierEnCours}
            className="min-h-[64px] rounded-xl bg-vert text-white text-xl font-bold"
          >
            {envoiPanierEnCours ? "Envoi..." : "Envoyer"}
          </button>
          <button
            type="button"
            onClick={() => setEmailFormOuvert(false)}
            className="min-h-[56px] rounded-xl border-2 border-vert text-vert text-lg font-bold"
          >
            Annuler
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-fond text-texte pb-24"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={reinitialiserInactivite}
    >
      <header className="flex flex-wrap items-center gap-3 px-6 py-4">
        <button
          onClick={revenirAAttente}
          className="min-h-[64px] px-6 rounded-xl border-2 border-vert text-vert text-lg font-bold shrink-0"
          aria-label="Retour à l'accueil de la borne"
        >
          ← Accueil
        </button>
        <p className="text-lg font-bold truncate">
          {villeNom} · {borne.lieu}
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div
          className={
            "w-full max-w-3xl p-10 flex flex-col gap-4 relative " +
            (estCommercant
              ? "bg-[#FFFDF3] rounded-lg shadow-xl border border-dashed border-vert/30 -rotate-1"
              : "bg-white rounded-3xl shadow-lg")
          }
        >
          {estCommercant && (
            <span
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-jaune/90 rotate-2 shadow-sm"
              aria-hidden="true"
            />
          )}

          {infos.imageUrl && (
            <div
              className={
                infos.estLogo
                  ? "w-full max-h-40 flex items-center justify-center bg-white rounded-xl p-4"
                  : ""
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={infos.imageUrl}
                alt=""
                className={
                  infos.estLogo
                    ? "max-h-32 max-w-full object-contain"
                    : "w-full max-h-64 object-cover rounded-xl"
                }
              />
              {infos.creditPexels && (
                <p className="text-sm opacity-60 mt-1">
                  Photo : {infos.creditPexels} / Pexels
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {infos.contrat && (
              <span className="bg-jaune text-texte font-bold px-4 py-2 rounded-full text-lg">
                {infos.contrat}
              </span>
            )}
            {infos.grandeEntreprise && (
              <span className="bg-vert text-white font-bold px-4 py-2 rounded-full text-lg">
                Offre à la une
              </span>
            )}
          </div>
          <h2 className="font-title text-4xl font-bold">{infos.titre}</h2>
          {infos.sousTitre && <p className="text-2xl">{infos.sousTitre}</p>}
          <p className="text-xl opacity-80">
            {[infos.lieu, infos.tempsTravail].filter(Boolean).join(" · ")}
          </p>

          <button
            onClick={() => {
              if (!detailOuvert) enregistrerEvenement("interet");
              setDetailOuvert(!detailOuvert);
            }}
            className="self-start underline text-lg"
          >
            {detailOuvert ? "Réduire" : "En savoir plus"}
          </button>

          {detailOuvert && infos.description && (
            <p className="text-xl mt-2 whitespace-pre-line">{infos.description}</p>
          )}

          {detailOuvert && estCommercant && offre.source === "commercant" && (
            <p className="text-lg mt-1">
              <strong>Comment postuler :</strong> {offre.comment_postuler}
            </p>
          )}

          <p className="text-base opacity-60 mt-2">Source : {infos.sourceLabel}</p>

          <button
            onClick={toggleSelection}
            className={
              "min-h-[72px] px-8 rounded-xl text-xl font-bold mt-2 " +
              (estDansSelection(offre)
                ? "bg-vert text-white"
                : "border-2 border-vert text-vert")
            }
          >
            {estDansSelection(offre) ? "✓ Dans ma sélection" : "✚ Ajouter à ma sélection"}
          </button>
          {messageLimite && (
            <p className="text-red-600 text-sm">
              Vous avez déjà {MAX_SELECTION} offres sélectionnées.
            </p>
          )}
        </div>

        <div className="flex gap-6 w-full max-w-3xl">
          <button
            onClick={precedente}
            disabled={index === 0}
            className="min-h-[72px] flex-1 rounded-xl border-2 border-vert text-vert text-xl font-bold disabled:opacity-30"
          >
            ← Précédente
          </button>
          <button
            onClick={suivante}
            disabled={index === offres.length - 1}
            className="min-h-[72px] flex-1 rounded-xl border-2 border-vert text-vert text-xl font-bold disabled:opacity-30"
          >
            Suivante →
          </button>
        </div>

        <p className="text-lg opacity-60">
          Offre {index + 1} / {offres.length}
        </p>
      </main>

      {selection.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-vert text-white px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-lg font-bold">
            🧺 {selection.length} offre{selection.length > 1 ? "s" : ""} sélectionnée
            {selection.length > 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setEmailFormOuvert(true)}
            className="min-h-[56px] px-6 rounded-xl bg-jaune text-texte font-bold text-lg"
          >
            Recevoir par e-mail →
          </button>
        </div>
      )}
    </div>
  );
}

function CarteAnnonce({
  offre,
  etiquette,
}: {
  offre: OffreAffichee;
  etiquette: string;
}) {
  const infos = champsAffichage(offre);
  return (
    <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 text-left flex flex-col gap-2">
      <span className="self-start bg-jaune text-texte font-bold px-3 py-1 rounded-full text-sm">
        {etiquette}
      </span>
      {infos.imageUrl && (
        <div
          className={
            infos.estLogo
              ? "w-full h-32 flex items-center justify-center bg-white rounded-lg"
              : ""
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={infos.imageUrl}
            alt=""
            className={
              infos.estLogo
                ? "max-h-24 max-w-[80%] object-contain"
                : "w-full h-32 object-cover rounded-lg"
            }
          />
        </div>
      )}
      <h3 className="font-title text-2xl font-bold">{infos.titre}</h3>
      {infos.sousTitre && <p className="opacity-70">{infos.sousTitre}</p>}
      {infos.contrat && <p className="text-sm opacity-60">{infos.contrat}</p>}
    </div>
  );
}
