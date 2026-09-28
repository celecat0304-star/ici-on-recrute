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
        className="w-full rounded-xl bg-white border border-black/10 shadow-sm px-4 py-3 text-lg outline-none focus:border-vert focus:ring-2 focus:ring-vert/20"
      />

      <div className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.valeur}
            onClick={() => setFiltre(f.valeur)}
            className={
              "px-4 py-2 rounded-full font-bold text-sm border " +
              (filtre === f.valeur
                ? "bg-vert text-white border-vert shadow-md shadow-vert/20"
                : "bg-white text-texte/70 border-black/10 hover:border-vert/40 hover:text-vert")
            }
          >
            {f.libelle}
          </button>
        ))}
      </div>

      <p className="opacity-60 text-sm uppercase tracking-wide">
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
                className="group flex items-center gap-4 bg-white rounded-xl p-5 border border-black/5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold group-hover:text-vert">
                      {titre}
                    </h2>
                    {estCommercant && (
                      <span className="bg-jaune text-texte text-xs font-bold px-3 py-1 rounded-full shrink-0">
                        Commerçant du coin
                      </span>
                    )}
                  </div>
                  {sousTitre && <p className="opacity-70">{sousTitre}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {contrat && (
                      <span className="text-xs font-bold bg-vert/10 text-vert px-2 py-1 rounded-full">
                        {contrat}
                      </span>
                    )}
                    {[tempsTravail, lieu].filter(Boolean).map((v) => (
                      <span
                        key={v}
                        className="text-xs px-2 py-1 rounded-full bg-black/5 opacity-70"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="shrink-0 w-9 h-9 rounded-full bg-vert/10 text-vert flex items-center justify-center group-hover:bg-vert group-hover:text-white"
                >
                  →
                </span>
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
