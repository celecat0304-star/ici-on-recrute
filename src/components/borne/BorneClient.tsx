"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { OffreAffichee } from "@/lib/types";

const DELAI_INACTIVITE_MS = 60_000;
const SEUIL_GLISSEMENT_PX = 50;

type Props = {
  borne: { id: string; nom: string; lieu: string };
  villeNom: string;
  villeSlug: string;
  offres: OffreAffichee[];
  offresCommercantsCount?: number;
};

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
  };
}

export default function BorneClient({
  borne,
  villeNom,
  villeSlug,
  offres,
  offresCommercantsCount = 0,
}: Props) {
  const [mode, setMode] = useState<"attente" | "navigation">("attente");
  const [index, setIndex] = useState(0);
  const [detailOuvert, setDetailOuvert] = useState(false);
  const [qrOuvert, setQrOuvert] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const offre = offres[index];
  const infos = offre ? champsAffichage(offre) : null;
  const estCommercant = offre?.source === "commercant";
  const offresFranceTravailCount = offres.length - offresCommercantsCount;

  const lienOffre = useMemo(() => {
    if (typeof window === "undefined" || !offre) return "";
    return `${window.location.origin}/ville/${villeSlug}/offres/${offre.id}`;
  }, [offre, villeSlug]);

  const revenirAAttente = () => {
    setMode("attente");
    setIndex(0);
    setDetailOuvert(false);
    setQrOuvert(false);
  };

  const reinitialiserInactivite = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mode === "navigation") {
      timerRef.current = setTimeout(revenirAAttente, DELAI_INACTIVITE_MS);
    }
  };

  useEffect(() => {
    reinitialiserInactivite();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, index, detailOuvert, qrOuvert]);

  const commencerNavigation = () => {
    setMode("navigation");
    setIndex(0);
  };

  const suivante = () => {
    setDetailOuvert(false);
    setQrOuvert(false);
    setIndex((i) => Math.min(i + 1, offres.length - 1));
  };

  const precedente = () => {
    setDetailOuvert(false);
    setQrOuvert(false);
    setIndex((i) => Math.max(i - 1, 0));
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
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center text-center gap-6 px-8 cursor-pointer bg-fond text-texte"
        onClick={commencerNavigation}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && commencerNavigation()}
      >
        <h1 className="font-title text-7xl font-bold text-vert">
          On recrute.
        </h1>
        <p className="text-3xl">à {villeNom}</p>
        <div className="flex gap-10 text-2xl mt-6">
          <p>
            <span className="font-bold text-4xl block">
              {offresFranceTravailCount}
            </span>
            offres aujourd&apos;hui
          </p>
          <p>
            <span className="font-bold text-4xl block">
              {offresCommercantsCount}
            </span>
            offres de commerçants du coin
          </p>
        </div>
        <p className="text-xl mt-10 opacity-70">
          Touchez l&apos;écran pour commencer
        </p>
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

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-fond text-texte"
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

          {infos.contrat && (
            <span className="self-start bg-jaune text-texte font-bold px-4 py-2 rounded-full text-lg">
              {infos.contrat}
            </span>
          )}
          <h2 className="font-title text-4xl font-bold">{infos.titre}</h2>
          {infos.sousTitre && <p className="text-2xl">{infos.sousTitre}</p>}
          <p className="text-xl opacity-80">
            {[infos.lieu, infos.tempsTravail].filter(Boolean).join(" · ")}
          </p>

          {detailOuvert && infos.description && (
            <p className="text-xl mt-2 whitespace-pre-line">
              {infos.description}
            </p>
          )}

          {detailOuvert && estCommercant && offre.source === "commercant" && (
            <p className="text-lg mt-1">
              <strong>Comment postuler :</strong> {offre.comment_postuler}
            </p>
          )}

          <p className="text-base opacity-60 mt-2">
            Source : {infos.sourceLabel}
          </p>

          <div className="flex flex-wrap gap-4 mt-4">
            <button
              onClick={() => setDetailOuvert((v) => !v)}
              className="min-h-[72px] px-8 rounded-xl bg-vert text-white text-xl font-bold flex-1"
            >
              {detailOuvert ? "Réduire" : "Ça m'intéresse"}
            </button>
            <button
              onClick={() => setQrOuvert((v) => !v)}
              className="min-h-[72px] px-8 rounded-xl bg-jaune text-texte text-xl font-bold flex-1"
            >
              Recevoir sur mon téléphone
            </button>
          </div>

          {qrOuvert && lienOffre && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <QRCodeSVG value={lienOffre} size={180} />
              <p className="text-lg text-center">
                Scannez pour retrouver cette offre sur votre téléphone
              </p>
            </div>
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
    </div>
  );
}
