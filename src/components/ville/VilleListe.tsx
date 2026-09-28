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
  IconeLoupe,
} from "@/components/icones/Icones";
import {
  champsAffichage,
  couleurContrat,
  initiales,
  nettoyerLieu,
  tronquer,
} from "@/components/borne/borneUtils";

type Filtre = "toutes" | "commerces" | "cdi" | "temps_partiel";

const FILTRES: { valeur: Filtre; libelle: string; Icone: typeof IconeGrille }[] = [
  { valeur: "toutes", libelle: "Toutes", Icone: IconeGrille },
  { valeur: "commerces", libelle: "Commerces du coin", Icone: IconeBoutique },
  { valeur: "cdi", libelle: "CDI", Icone: IconeDocument },
  { valeur: "temps_partiel", libelle: "Temps partiel", Icone: IconeCalendrier },
];

const PAGE = 20;
const TEINTES = ["#0F1A45", "#0E8A4A", "#2B3BE0", "#8A4200", "#7A2E6E", "#3B4152"];

function teinte(texte: string) {
  let h = 0;
  for (let i = 0; i < texte.length; i++) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

export default function VilleListe({
  offres,
  villeSlug,
  departement,
}: {
  offres: OffreAffichee[];
  villeSlug: string;
  departement?: string;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [visibles, setVisibles] = useState(PAGE);

  const offresFiltrees = useMemo(() => {
    const rechercheMinuscule = recherche.trim().toLowerCase();
    return offres.filter((offre) => {
      const c = champsAffichage(offre);
      if (filtre === "commerces" && offre.source !== "commercant") return false;
      if (filtre === "cdi" && c.contratNom !== "CDI") return false;
      if (
        filtre === "temps_partiel" &&
        !(c.tempsTravail ?? "").toLowerCase().includes("partiel")
      )
        return false;
      if (!rechercheMinuscule) return true;
      return `${c.titre} ${c.sousTitre ?? ""}`.toLowerCase().includes(rechercheMinuscule);
    });
  }, [offres, recherche, filtre]);

  const affichees = offresFiltrees.slice(0, visibles);
  const restantes = offresFiltrees.length - affichees.length;

  return (
    <div id="offres" className="flex flex-col gap-5 scroll-mt-6">
      <div className="relative">
        <IconeLoupe className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[#545A6B]" />
        <input
          type="search"
          placeholder="Métier, entreprise…"
          aria-label="Rechercher un métier ou une entreprise"
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setVisibles(PAGE);
          }}
          className="h-14 w-full rounded-2xl border border-[#E4E0D6] bg-white pl-12 pr-4 text-base outline-none shadow-sm focus:border-[#2B3BE0] focus:ring-2 focus:ring-[#2B3BE0]/20"
        />
      </div>

      <div
        className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, #000 calc(100% - 48px), transparent 100%)",
          maskImage: "linear-gradient(90deg, #000 calc(100% - 48px), transparent 100%)",
        }}
      >
        <div className="flex w-max gap-2 pr-12">
          {FILTRES.map(({ valeur, libelle, Icone }) => (
            <button
              key={valeur}
              onClick={() => {
                setFiltre(valeur);
                setVisibles(PAGE);
              }}
              className={
                "flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-base font-bold " +
                (filtre === valeur
                  ? "border-[#2B3BE0] bg-[#2B3BE0] text-white"
                  : "border-[#E4E0D6] bg-white text-[#3B4152]")
              }
            >
              <Icone className="h-4 w-4" />
              {libelle}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-[#545A6B]">
        {offresFiltrees.length} offre{offresFiltrees.length > 1 ? "s" : ""}
      </p>

      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
        {affichees.map((offre) => {
          const c = champsAffichage(offre);
          const nomEntreprise = c.sousTitre || c.titre;
          const lieu = nettoyerLieu(c.lieu, departement);
          const contrat = [c.contratNom, c.contratDuree].filter(Boolean).join(" · ");
          return (
            <li key={`${offre.source}-${offre.id}`}>
              <Link
                href={`/ville/${villeSlug}/offres/${offre.id}`}
                className="flex min-h-[88px] items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_0_#E4E0D6,0_6px_18px_rgba(15,26,69,0.05)] hover:-translate-y-0.5"
              >
                {c.imageUrl && c.estLogo ? (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[#E4E0D6] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                  </span>
                ) : (
                  <span
                    className="font-title flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-xl font-bold text-white"
                    style={{ background: teinte(nomEntreprise) }}
                  >
                    {initiales(nomEntreprise).charAt(0)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-snug">{tronquer(c.titre, 80)}</h2>
                  {c.sousTitre && (
                    <p className="truncate text-sm font-semibold uppercase tracking-wide text-[#545A6B]">
                      {c.sousTitre}
                    </p>
                  )}
                  {offre.source === "commercant" && (
                    <span className="mt-1 inline-block rounded-full bg-[#E3F4EC] px-2.5 py-0.5 text-sm font-bold text-[#0A5C39]">
                      Commerçant du coin
                    </span>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#3B4152]">
                    {contrat && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: couleurContrat(c.contratNom) }}
                        />
                        {contrat}
                      </span>
                    )}
                    {c.tempsTravail && (
                      <span className="flex items-center gap-1">
                        <IconeCalendrier className="h-4 w-4" />
                        {c.tempsTravail}
                      </span>
                    )}
                    {lieu && (
                      <span className="flex items-center gap-1">
                        <IconePin className="h-4 w-4" />
                        {lieu}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1EEE6] text-[#0F1A45]"
                >
                  <IconeChevron className="h-5 w-5" />
                </span>
              </Link>
            </li>
          );
        })}
        {offresFiltrees.length === 0 && (
          <li className="py-8 text-center text-[#545A6B] lg:col-span-2">
            Aucune offre ne correspond à votre recherche.
          </li>
        )}
      </ul>

      {restantes > 0 && (
        <button
          onClick={() => setVisibles((v) => v + PAGE)}
          className="flex h-[52px] w-full items-center justify-center rounded-2xl border-2 border-[#2B3BE0] bg-white text-base font-bold text-[#2B3BE0]"
        >
          Voir {Math.min(PAGE, restantes)} offre{Math.min(PAGE, restantes) > 1 ? "s" : ""} de plus
        </button>
      )}
    </div>
  );
}
