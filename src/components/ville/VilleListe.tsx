"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OffreAffichee } from "@/lib/types";

type Filtre = "toutes" | "commerces" | "cdi" | "temps_partiel";

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: "toutes", libelle: "Toutes les offres" },
  { valeur: "commerces", libelle: "Commerces du coin" },
  { valeur: "cdi", libelle: "CDI" },
  { valeur: "temps_partiel", libelle: "Temps partiel" },
];

function champs(offre: OffreAffichee) {
  if (offre.source === "commercant") {
    return {
      titre: offre.poste,
      sousTitre: offre.nom_commerce,
      lieu: offre.quartier,
      contrat: offre.type_contrat,
      tempsTravail: offre.temps_travail,
    };
  }
  return {
    titre: offre.intitule,
    sousTitre: offre.entreprise_nom,
    lieu: offre.lieu_travail,
    contrat: offre.type_contrat,
    tempsTravail: offre.duree_travail,
  };
}

export default function VilleListe({
  offres,
  villeSlug,
}: {
  offres: OffreAffichee[];
  villeSlug: string;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const offresFiltrees = useMemo(() => {
    const rechercheMinuscule = recherche.trim().toLowerCase();
    return offres.filter((offre) => {
      const { titre, sousTitre, tempsTravail, contrat } = champs(offre);

      if (filtre === "commerces" && offre.source !== "commercant") return false;
      if (filtre === "cdi" && contrat !== "CDI") return false;
      if (
        filtre === "temps_partiel" &&
        !(tempsTravail ?? "").toLowerCase().includes("partiel")
      )
        return false;

      if (!rechercheMinuscule) return true;
      return `${titre} ${sousTitre ?? ""}`
        .toLowerCase()
        .includes(rechercheMinuscule);
    });
  }, [offres, recherche, filtre]);

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        placeholder="Rechercher un métier, une entreprise..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full rounded-xl bg-surface-sombre border border-white/10 px-4 py-3 text-lg outline-none focus:border-vert-clair focus:ring-2 focus:ring-vert-clair/30"
      />

      <div className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.valeur}
            onClick={() => setFiltre(f.valeur)}
            className={
              "px-4 py-2 rounded-full font-bold text-sm border " +
              (filtre === f.valeur
                ? "bg-jaune text-texte border-jaune shadow-md shadow-jaune/20"
                : "bg-surface-sombre text-texte-sombre border-white/10 hover:border-vert-clair/50 hover:text-vert-clair")
            }
          >
            {f.libelle}
          </button>
        ))}
      </div>

      <p className="opacity-70 text-sm uppercase tracking-wide">
        {offresFiltrees.length} offre{offresFiltrees.length > 1 ? "s" : ""}
      </p>

      <ul className="flex flex-col gap-4">
        {offresFiltrees.map((offre) => {
          const { titre, sousTitre, lieu, contrat, tempsTravail } = champs(offre);
          const estCommercant = offre.source === "commercant";
          return (
            <li key={`${offre.source}-${offre.id}`}>
              <Link
                href={`/ville/${villeSlug}/offres/${offre.id}`}
                className={
                  "group block bg-surface-sombre rounded-xl p-5 border-l-4 border border-white/10 hover:-translate-y-0.5 hover:shadow-lg hover:border-white/20 " +
                  (estCommercant ? "border-l-jaune" : "border-l-vert-clair")
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold group-hover:text-vert-clair">
                    {titre}
                  </h2>
                  {estCommercant && (
                    <span className="bg-jaune text-texte text-xs font-bold px-3 py-1 rounded-full shrink-0">
                      Commerçant du coin
                    </span>
                  )}
                </div>
                {sousTitre && <p className="opacity-80">{sousTitre}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {contrat && (
                    <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded-full opacity-80">
                      {contrat}
                    </span>
                  )}
                  {[tempsTravail, lieu].filter(Boolean).map((v) => (
                    <span key={v} className="text-xs px-2 py-1 rounded-full opacity-60">
                      {v}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
        {offresFiltrees.length === 0 && (
          <p className="opacity-60">Aucune offre ne correspond à ta recherche.</p>
        )}
      </ul>
    </div>
  );
}
