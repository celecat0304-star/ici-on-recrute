"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OffreAffichee } from "@/lib/types";
import {
  IconeGrille,
  IconeBoutique,
  IconeDocument,
  IconeCalendrier,
  IconePin,
  IconeChevron,
} from "@/components/icones/Icones";

type Filtre = "toutes" | "commerces" | "cdi" | "temps_partiel";

const FILTRES: { valeur: Filtre; libelle: string; Icone: typeof IconeGrille }[] = [
  { valeur: "toutes", libelle: "Toutes", Icone: IconeGrille },
  { valeur: "commerces", libelle: "Commerces du coin", Icone: IconeBoutique },
  { valeur: "cdi", libelle: "CDI", Icone: IconeDocument },
  { valeur: "temps_partiel", libelle: "Temps partiel", Icone: IconeCalendrier },
];

const PALETTE_AVATAR = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

function couleurAvatar(texte: string) {
  const somme = texte
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE_AVATAR[somme % PALETTE_AVATAR.length];
}

function couleurContrat(contrat: string | null) {
  if (!contrat) return "#94a3b8";
  const c = contrat.toLowerCase();
  if (c.includes("cdi")) return "#16a34a";
  if (c.includes("intérim") || c.includes("interim")) return "#ea580c";
  if (c.includes("cdd")) return "#2563eb";
  return "#94a3b8";
}

function champs(offre: OffreAffichee) {
  if (offre.source === "commercant") {
    return {
      titre: offre.poste,
      sousTitre: offre.nom_commerce,
      lieu: offre.quartier,
      contrat: offre.type_contrat,
      tempsTravail: offre.temps_travail,
      logo: offre.image_url,
    };
  }
  return {
    titre: offre.intitule,
    sousTitre: offre.entreprise_nom,
    lieu: offre.lieu_travail,
    contrat: offre.type_contrat,
    tempsTravail: offre.duree_travail,
    logo: offre.entreprise_logo_url,
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
    <div id="offres" className="flex flex-col gap-6 scroll-mt-24">
      <input
        type="search"
        placeholder="Rechercher un métier, une entreprise..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full rounded-xl bg-white border border-black/10 shadow-sm px-4 py-3 text-lg outline-none focus:border-vert focus:ring-2 focus:ring-vert/20"
      />

      <div className="flex flex-wrap gap-2">
        {FILTRES.map(({ valeur, libelle, Icone }) => (
          <button
            key={valeur}
            onClick={() => setFiltre(valeur)}
            className={
              "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border " +
              (filtre === valeur
                ? "bg-vert text-white border-vert shadow-md shadow-vert/20"
                : "bg-white text-texte/70 border-black/10 hover:border-vert/40 hover:text-vert")
            }
          >
            <Icone className="w-4 h-4" />
            {libelle}
          </button>
        ))}
      </div>

      <p className="opacity-60 text-sm uppercase tracking-wide">
        {offresFiltrees.length} offre{offresFiltrees.length > 1 ? "s" : ""}
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {offresFiltrees.map((offre) => {
          const { titre, sousTitre, lieu, contrat, tempsTravail, logo } =
            champs(offre);
          const estCommercant = offre.source === "commercant";
          const initiale = (sousTitre || titre).charAt(0).toUpperCase();
          return (
            <li key={`${offre.source}-${offre.id}`}>
              <Link
                href={`/ville/${villeSlug}/offres/${offre.id}`}
                className="group flex items-start gap-3 bg-white rounded-xl p-4 border border-black/5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg h-full"
              >
                <div
                  className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-lg"
                  style={{ background: couleurAvatar(sousTitre || titre) }}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="w-full h-full object-contain bg-white p-1" />
                  ) : (
                    initiale
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-bold leading-snug group-hover:text-vert">
                    {titre}
                  </h2>
                  <p className="opacity-70 text-sm truncate">{sousTitre}</p>
                  {estCommercant && (
                    <span className="inline-block mt-1 bg-jaune text-texte text-[11px] font-bold px-2 py-0.5 rounded-full">
                      Commerçant du coin
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs opacity-70">
                    {contrat && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: couleurContrat(contrat) }}
                        />
                        {contrat}
                      </span>
                    )}
                    {tempsTravail && (
                      <span className="flex items-center gap-1">
                        <IconeCalendrier className="w-3.5 h-3.5" />
                        {tempsTravail}
                      </span>
                    )}
                    {lieu && (
                      <span className="flex items-center gap-1">
                        <IconePin className="w-3.5 h-3.5" />
                        {lieu}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="shrink-0 w-8 h-8 rounded-full bg-vert/10 text-vert flex items-center justify-center group-hover:bg-vert group-hover:text-white"
                >
                  <IconeChevron className="w-4 h-4" />
                </span>
              </Link>
            </li>
          );
        })}
        {offresFiltrees.length === 0 && (
          <p className="opacity-60 col-span-2">
            Aucune offre ne correspond à ta recherche.
          </p>
        )}
      </ul>
    </div>
  );
}
