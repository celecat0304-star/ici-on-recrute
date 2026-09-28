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
  DISTANCES_KM,
  FILTRES_VIDES,
  SALAIRES_MIN,
  SECTEURS,
  champsAffichage,
  correspond,
  couleurContrat,
  distanceOffre,
  formaterEuros,
  nettoyerLieu,
  salaireAffiche,
  tronquer,
  type Domicile,
  type Filtres,
} from "@/components/borne/borneUtils";
import { Vignette } from "@/components/borne/BorneComposants";
import { useCommunes } from "@/lib/useCommunes";

type Filtre = "toutes" | "commerces" | "cdi" | "temps_partiel";

const FILTRES: { valeur: Filtre; libelle: string; Icone: typeof IconeGrille }[] = [
  { valeur: "toutes", libelle: "Toutes", Icone: IconeGrille },
  { valeur: "commerces", libelle: "Commerces du coin", Icone: IconeBoutique },
  { valeur: "cdi", libelle: "CDI", Icone: IconeDocument },
  { valeur: "temps_partiel", libelle: "Temps partiel", Icone: IconeCalendrier },
];

const PAGE = 20;

export default function VilleListe({
  offres,
  villeSlug,
  departement,
  centreVille = null,
}: {
  offres: OffreAffichee[];
  villeSlug: string;
  departement?: string;
  centreVille?: { latitude: number; longitude: number } | null;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [visibles, setVisibles] = useState(PAGE);
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [avances, setAvances] = useState<Filtres>(FILTRES_VIDES);
  const [domicile, setDomicile] = useState<Domicile | null>(null);
  const [saisieCommune, setSaisieCommune] = useState("");
  const { suggestions, enCours } = useCommunes(saisieCommune);

  const majAvances = (partiel: Partial<Filtres>) => {
    setAvances((a) => ({ ...a, ...partiel }));
    setVisibles(PAGE);
  };
  const nbCriteres =
    (domicile ? 1 : 0) +
    (avances.distanceKm != null ? 1 : 0) +
    (avances.salaireMin != null ? 1 : 0) +
    (avances.secteur ? 1 : 0);

  const ctx = useMemo(() => ({ domicile, centreVille }), [domicile, centreVille]);

  const offresFiltrees = useMemo(() => {
    const rechercheMinuscule = recherche.trim().toLowerCase();
    const liste = offres.filter((offre) => {
      if (!correspond(offre, avances, ctx)) return false;
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
    // Avec un domicile renseigné, les offres les plus proches passent en premier
    if (!ctx.domicile) return liste;
    return liste
      .map((o) => ({ o, d: distanceOffre(o, ctx) ?? Infinity }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.o);
  }, [offres, recherche, filtre, avances, ctx]);

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

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setPanneauOuvert((o) => !o)}
          aria-expanded={panneauOuvert}
          className="flex h-12 w-full items-center justify-between rounded-2xl border border-[#E4E0D6] bg-white px-4 text-base font-bold sm:w-fit sm:gap-4"
        >
          <span className="flex items-center gap-2">
            <IconePin className="h-5 w-5 text-[#2B3BE0]" />
            Affiner : distance, salaire, domaine
            {nbCriteres > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#2B3BE0] px-1.5 text-sm text-white">
                {nbCriteres}
              </span>
            )}
          </span>
          <IconeChevron className={"h-4 w-4 transition-transform " + (panneauOuvert ? "-rotate-90" : "rotate-90")} />
        </button>

        {panneauOuvert && (
          <div className="flex flex-col gap-6 rounded-2xl bg-white p-4 shadow-[0_1px_0_#E4E0D6,0_6px_18px_rgba(15,26,69,0.05)] sm:p-5">
            <section className="flex flex-col gap-3">
              <h3 className="text-lg font-bold">Où habitez-vous ?</h3>
              {domicile ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F5F0] px-4 py-3">
                  <span className="flex items-center gap-2 text-base font-bold">
                    <IconePin className="h-5 w-5 text-[#0E8A4A]" />
                    {domicile.nom}
                  </span>
                  <button
                    onClick={() => {
                      setDomicile(null);
                      majAvances({ distanceKm: null });
                    }}
                    className="h-11 rounded-full bg-white px-4 text-base font-bold shadow-[inset_0_0_0_2px_#E4E0D6]"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={saisieCommune}
                    onChange={(e) => setSaisieCommune(e.target.value)}
                    placeholder="Votre commune ou code postal"
                    aria-label="Votre commune ou code postal"
                    className="h-14 w-full rounded-xl border border-[#E4E0D6] bg-white px-4 text-base outline-none focus:border-[#2B3BE0] focus:ring-2 focus:ring-[#2B3BE0]/20"
                  />
                  {suggestions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={`${s.nom}-${s.codePostal}`}
                          onClick={() => {
                            setDomicile({ nom: s.nom, latitude: s.latitude, longitude: s.longitude });
                            setSaisieCommune("");
                            majAvances({ distanceKm: avances.distanceKm ?? 10 });
                          }}
                          className="flex h-12 items-center gap-2 rounded-xl border border-[#E4E0D6] bg-white px-4 text-left text-base font-bold"
                        >
                          <IconePin className="h-5 w-5 text-[#0E8A4A]" />
                          {s.nom} <span className="font-normal text-[#545A6B]">{s.codePostal}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {saisieCommune.trim().length >= 2 && suggestions.length === 0 && !enCours && (
                    <p className="text-sm text-[#545A6B]">Aucune commune trouvée.</p>
                  )}
                  <p className="text-sm text-[#545A6B]">
                    Les offres les plus proches de chez vous passent en premier.
                  </p>
                </>
              )}
              {domicile && (
                <div className="flex flex-wrap gap-2">
                  {[null, ...DISTANCES_KM].map((km) => (
                    <button
                      key={km ?? "tous"}
                      onClick={() => majAvances({ distanceKm: km })}
                      aria-pressed={avances.distanceKm === km}
                      className={
                        "h-11 rounded-full border px-4 text-base font-bold " +
                        (avances.distanceKm === km
                          ? "border-[#2B3BE0] bg-[#2B3BE0] text-white"
                          : "border-[#E4E0D6] bg-white text-[#3B4152]")
                      }
                    >
                      {km === null ? "Peu importe" : `Moins de ${km} km`}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-lg font-bold">Salaire minimum</h3>
              <p className="text-sm text-[#545A6B]">
                Estimation brute par mois, d’après le salaire indiqué dans l’offre.
              </p>
              <div className="flex flex-wrap gap-2">
                {[null, ...SALAIRES_MIN].map((s) => (
                  <button
                    key={s ?? "tous"}
                    onClick={() => majAvances({ salaireMin: s })}
                    aria-pressed={avances.salaireMin === s}
                    className={
                      "h-11 rounded-full border px-4 text-base font-bold " +
                      (avances.salaireMin === s
                        ? "border-[#2B3BE0] bg-[#2B3BE0] text-white"
                        : "border-[#E4E0D6] bg-white text-[#3B4152]")
                    }
                  >
                    {s === null ? "Peu importe" : `${formaterEuros(s)} et +`}
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-lg font-bold">Domaine</h3>
              <div className="flex flex-wrap gap-2">
                {SECTEURS.map((s) => {
                  const actif = avances.secteur === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => majAvances({ secteur: actif ? null : s.id })}
                      aria-pressed={actif}
                      className={
                        "h-11 rounded-full border px-4 text-base font-bold " +
                        (actif
                          ? "border-[#2B3BE0] bg-[#2B3BE0] text-white"
                          : "border-[#E4E0D6] bg-white text-[#3B4152]")
                      }
                    >
                      {s.libelle}
                    </button>
                  );
                })}
              </div>
            </section>

            {nbCriteres > 0 && (
              <button
                onClick={() => {
                  setAvances(FILTRES_VIDES);
                  setDomicile(null);
                  setSaisieCommune("");
                  setVisibles(PAGE);
                }}
                className="h-12 w-full rounded-xl border-2 border-[#0F1A45] bg-white text-base font-bold"
              >
                Tout réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-[#545A6B]">
        {offresFiltrees.length} offre{offresFiltrees.length > 1 ? "s" : ""}
      </p>

      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
        {affichees.map((offre) => {
          const c = champsAffichage(offre);
          const lieu = nettoyerLieu(c.lieu, departement);
          const contrat = [c.contratNom, c.contratDuree].filter(Boolean).join(" · ");
          return (
            <li key={`${offre.source}-${offre.id}`}>
              <Link
                href={`/ville/${villeSlug}/offres/${offre.id}`}
                className="flex min-h-[88px] items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_1px_0_#E4E0D6,0_6px_18px_rgba(15,26,69,0.05)] hover:-translate-y-0.5"
              >
                <Vignette
                  titre={c.titre}
                  sousTitre={c.sousTitre}
                  imageUrl={c.imageUrl}
                  estLogo={c.estLogo}
                  cle={offre.id}
                  className="h-14 w-14 rounded-[14px]"
                />

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
                        {distanceOffre(offre, ctx) !== null &&
                          ` · ${Math.max(1, Math.round(distanceOffre(offre, ctx)!))} km`}
                      </span>
                    )}
                  </div>
                  {salaireAffiche(c.salaireMin, c.salaireMax) && (
                    <p className="mt-1 text-sm font-bold text-[#0A5C39]">
                      {salaireAffiche(c.salaireMin, c.salaireMax)}
                    </p>
                  )}
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
