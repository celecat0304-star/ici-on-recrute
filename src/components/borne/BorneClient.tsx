"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createPublicClient } from "@/lib/supabase/public";
import type { OffreAffichee } from "@/lib/types";
import HeaderHorloge from "@/components/ville/HeaderHorloge";
import {
  IconeMallette,
  IconePin,
  IconeDocument,
  IconeCalendrier,
  IconeLoupe,
  IconeChevron,
  IconeGrille,
  IconeBoutique,
  IconeEtoile,
} from "@/components/icones/Icones";

const DELAI_INACTIVITE_MS = 60_000;
const SEUIL_GLISSEMENT_PX = 50;
const DELAI_ENVOI_STATS_MS = 10_000;
const DELAI_ROTATION_ATTENTE_MS = 12_000;
const MAX_SELECTION = 10;
const DELAI_MAX_ENTRE_APPUIS_MS = 1500;
const APPUIS_POUR_SORTIE = 3;

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
type Filtre = "toutes" | "commerces" | "cdi" | "temps_partiel";

const FILTRES: { valeur: Filtre; libelle: string; Icone: typeof IconeGrille }[] = [
  { valeur: "toutes", libelle: "Toutes", Icone: IconeGrille },
  { valeur: "commerces", libelle: "Commerces du coin", Icone: IconeBoutique },
  { valeur: "cdi", libelle: "CDI", Icone: IconeDocument },
  { valeur: "temps_partiel", libelle: "Temps partiel", Icone: IconeCalendrier },
];

const PALETTE_AVATAR = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777"];

function couleurAvatar(texte: string) {
  const somme = texte.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
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
      imageAlt: `Photo de ${offre.nom_commerce}`,
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
    imageAlt: offre.entreprise_nom ? `Logo de ${offre.entreprise_nom}` : "",
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
  const router = useRouter();
  const [mode, setMode] = useState<"attente" | "liste" | "detail">("attente");
  const [indexAttente, setIndexAttente] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [indexDetail, setIndexDetail] = useState(0);
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
  const [codeSortieOuvert, setCodeSortieOuvert] = useState(false);
  const [codeSortieValeur, setCodeSortieValeur] = useState("");
  const [codeSortieErreur, setCodeSortieErreur] = useState(false);
  const [origine, setOrigine] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const evenementsEnAttente = useRef<EvenementStat[]>([]);
  const appuisLogo = useRef<{ nombre: number; dernier: number }>({
    nombre: 0,
    dernier: 0,
  });
  const supabase = useMemo(() => createPublicClient(), []);

  useEffect(() => {
    setOrigine(window.location.origin);
  }, []);

  const offresFranceTravailCount = offres.length - offresCommercantsCount;

  const offresFiltrees = useMemo(() => {
    const rechercheMinuscule = recherche.trim().toLowerCase();
    return offres.filter((o) => {
      const { titre, sousTitre, tempsTravail, contrat } = champsAffichage(o);
      if (filtre === "commerces" && o.source !== "commercant") return false;
      if (filtre === "cdi" && contrat !== "CDI") return false;
      if (
        filtre === "temps_partiel" &&
        !(tempsTravail ?? "").toLowerCase().includes("partiel")
      )
        return false;
      if (!rechercheMinuscule) return true;
      return `${titre} ${sousTitre ?? ""}`.toLowerCase().includes(rechercheMinuscule);
    });
  }, [offres, recherche, filtre]);

  const offreCourante = mode === "detail" ? offresFiltrees[indexDetail] : undefined;
  const infos = offreCourante ? champsAffichage(offreCourante) : null;
  const estCommercant = offreCourante?.source === "commercant";

  // Mode hors ligne : un service worker garde en cache la dernière version
  // affichée avec succès, pour ne jamais montrer un écran d'erreur du navigateur.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-borne.js", { scope: "/borne/" })
        .catch(() => {});
    }
  }, []);

  const estDansSelection = (o: OffreAffichee) =>
    selection.some((s) => s.source === o.source && s.id === o.id);

  const enregistrerEvenement = (
    type: EvenementStat["type"],
    cible: OffreAffichee | undefined
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
    if (mode === "detail" && offreCourante) {
      enregistrerEvenement("vue", offreCourante);
      enregistrerEvenement("qr_affiche", offreCourante);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offreCourante?.id, mode]);

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
    setIndexDetail(0);
    setDetailOuvert(false);
    setSelection([]);
    setEmailFormOuvert(false);
    setPanierConfirmation(null);
    setErreurPanier("");
    setRecherche("");
    setFiltre("toutes");
  };

  const reinitialiserInactivite = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (
      (mode === "liste" || mode === "detail") &&
      !emailFormOuvert &&
      !panierConfirmation
    ) {
      timerRef.current = setTimeout(revenirAAttente, DELAI_INACTIVITE_MS);
    }
  };

  useEffect(() => {
    reinitialiserInactivite();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, indexDetail, detailOuvert, emailFormOuvert, panierConfirmation]);

  const commencerNavigation = () => {
    setMode("liste");
  };

  const ouvrirDetail = (i: number) => {
    setIndexDetail(i);
    setDetailOuvert(false);
    setMode("detail");
  };

  const ouvrirOffreDepuisAccueil = (o: OffreAffichee) => {
    setRecherche("");
    setFiltre("toutes");
    const idx = offres.findIndex((x) => x.source === o.source && x.id === o.id);
    setIndexDetail(idx === -1 ? 0 : idx);
    setDetailOuvert(false);
    setMode("detail");
  };

  const suivante = () => {
    setDetailOuvert(false);
    setIndexDetail((i) => Math.min(i + 1, offresFiltrees.length - 1));
  };

  const precedente = () => {
    setDetailOuvert(false);
    setIndexDetail((i) => Math.max(i - 1, 0));
  };

  const toggleSelection = () => {
    if (!offreCourante) return;
    if (estDansSelection(offreCourante)) {
      setSelection((s) =>
        s.filter((x) => !(x.source === offreCourante.source && x.id === offreCourante.id))
      );
      return;
    }
    if (selection.length >= MAX_SELECTION) {
      setMessageLimite(true);
      setTimeout(() => setMessageLimite(false), 3000);
      return;
    }
    setSelection((s) => [...s, { source: offreCourante.source, id: offreCourante.id }]);
    enregistrerEvenement("selection", offreCourante);
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

  const onTapLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const maintenant = Date.now();
    if (maintenant - appuisLogo.current.dernier > DELAI_MAX_ENTRE_APPUIS_MS) {
      appuisLogo.current.nombre = 0;
    }
    appuisLogo.current.nombre += 1;
    appuisLogo.current.dernier = maintenant;
    if (appuisLogo.current.nombre >= APPUIS_POUR_SORTIE) {
      appuisLogo.current.nombre = 0;
      setCodeSortieOuvert(true);
      setCodeSortieValeur("");
      setCodeSortieErreur(false);
    }
  };

  const validerCodeSortie = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeSortieValeur === process.env.NEXT_PUBLIC_CODE_SORTIE_BORNE) {
      router.push("/admin");
    } else {
      setCodeSortieErreur(true);
    }
  };

  let contenu: React.ReactNode;

  if (mode === "attente") {
    const offreA = caseA.length > 0 ? caseA[indexAttente % caseA.length] : null;
    const offreB = caseB.length > 0 ? caseB[indexAttente % caseB.length] : null;

    contenu = (
      <div
        className="min-h-screen w-full flex flex-col bg-fond text-texte cursor-pointer"
        onClick={commencerNavigation}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && commencerNavigation()}
      >
        <header className="flex items-center justify-between px-8 py-6">
          <div>
            <p className="font-title text-2xl font-black leading-none">
              ICI <span className="text-vert">✌</span>
              <br />
              ON RECRUTE
            </p>
            <p className="text-sm opacity-60 mt-1">Les emplois près de chez vous</p>
          </div>
          <HeaderHorloge />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center gap-8 px-8 pb-14 text-center">
          <div>
            <h1 className="font-title text-5xl sm:text-6xl font-black leading-tight">
              Trouvez un emploi
              <br />
              <span className="text-jaune">à {villeNom}</span>
            </h1>
            <p className="text-xl opacity-70 mt-3">
              Des centaines d&apos;offres près de chez vous
            </p>
          </div>

          {(offreA || offreB) && (
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
              {offreA && (
                <CarteAnnonce
                  offre={offreA}
                  etiquette="Offre à la une"
                  onClick={(e) => {
                    e.stopPropagation();
                    ouvrirOffreDepuisAccueil(offreA);
                  }}
                />
              )}
              {offreB && (
                <CarteAnnonce
                  offre={offreB}
                  etiquette="Commerçant du coin"
                  onClick={(e) => {
                    e.stopPropagation();
                    ouvrirOffreDepuisAccueil(offreB);
                  }}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
            <StatPilleBorne
              Icone={IconeMallette}
              valeur={offresFranceTravailCount}
              label="offres aujourd'hui"
            />
            <StatPilleBorne
              Icone={IconeBoutique}
              valeur={offresCommercantsCount}
              label="offres de commerçants du coin"
            />
          </div>

          <button
            onClick={commencerNavigation}
            className="min-h-[88px] px-14 rounded-2xl bg-vert text-white text-2xl font-bold shadow-xl shadow-vert/25 flex items-center gap-3 hover:-translate-y-0.5"
          >
            Voir toutes les offres <IconeChevron className="w-7 h-7" />
          </button>
        </main>
      </div>
    );
  } else if (panierConfirmation) {
    contenu = (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-fond text-texte px-8 text-center">
        <h2 className="font-title text-3xl font-bold text-vert">C&apos;est envoyé !</h2>
        <p className="text-xl max-w-md">
          Un lien a été envoyé à {panierConfirmation.email}. Vous pouvez aussi
          scanner ce code pour retrouver vos offres sur votre téléphone :
        </p>
        <div className="bg-white rounded-2xl p-6 shadow-md border border-black/5">
          <QRCodeSVG value={panierConfirmation.lien} size={220} />
        </div>
        <button
          onClick={revenirAAttente}
          className="min-h-[72px] px-10 rounded-2xl bg-vert text-white text-xl font-bold mt-4"
        >
          Terminé
        </button>
      </div>
    );
  } else if (emailFormOuvert) {
    contenu = (
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
          <label htmlFor="email-panier" className="sr-only">
            Votre e-mail
          </label>
          <input
            id="email-panier"
            name="email"
            type="email"
            required
            autoFocus
            placeholder="vous@exemple.fr"
            className="min-h-[64px] text-xl text-center rounded-2xl border-2 border-vert/40 px-4"
          />
          {erreurPanier && <p className="text-red-600">{erreurPanier}</p>}
          <button
            type="submit"
            disabled={envoiPanierEnCours}
            className="min-h-[64px] rounded-2xl bg-vert text-white text-xl font-bold"
          >
            {envoiPanierEnCours ? "Envoi..." : "Envoyer"}
          </button>
          <button
            type="button"
            onClick={() => setEmailFormOuvert(false)}
            className="min-h-[56px] rounded-2xl border-2 border-vert text-vert text-lg font-bold"
          >
            Annuler
          </button>
        </form>
      </div>
    );
  } else if (mode === "liste") {
    contenu = (
      <div
        className="min-h-screen w-full flex flex-col bg-fond text-texte pb-24"
        onClick={reinitialiserInactivite}
      >
        <EnTeteBorne
          onRetour={revenirAAttente}
          labelRetour="Accueil"
          sousTitre={`${villeNom} · ${borne.lieu}`}
        />

        <div className="px-6 flex flex-col gap-4 pb-2">
          <div className="relative max-w-2xl mx-auto w-full">
            <IconeLoupe className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Métier, entreprise, mot-clé..."
              className="w-full rounded-2xl bg-white border border-black/10 shadow-sm pl-12 pr-4 py-4 text-xl outline-none focus:border-vert focus:ring-2 focus:ring-vert/20"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {FILTRES.map(({ valeur, libelle, Icone }) => (
              <button
                key={valeur}
                onClick={() => setFiltre(valeur)}
                className={
                  "flex items-center gap-2 px-5 py-3 rounded-full font-bold text-base border min-h-[52px] " +
                  (filtre === valeur
                    ? "bg-vert text-white border-vert shadow-md shadow-vert/20"
                    : "bg-white text-texte/70 border-black/10")
                }
              >
                <Icone className="w-4 h-4" />
                {libelle}
              </button>
            ))}
          </div>

          <p className="opacity-60 text-sm uppercase tracking-wide text-center">
            {offresFiltrees.length} offre{offresFiltrees.length > 1 ? "s" : ""}
          </p>
        </div>

        <main className="flex-1 px-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {offresFiltrees.map((o, i) => (
              <CarteOffreGrille
                key={`${o.source}-${o.id}`}
                offre={o}
                selectionnee={estDansSelection(o)}
                onClick={() => ouvrirDetail(i)}
              />
            ))}
            {offresFiltrees.length === 0 && (
              <p className="opacity-60 col-span-2 text-center py-12 text-lg">
                Aucune offre ne correspond à votre recherche.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  } else if (!offreCourante || !infos) {
    contenu = (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-fond text-texte px-8 text-center">
        <p className="text-2xl">Aucune offre disponible pour le moment.</p>
        <button
          onClick={() => setMode("liste")}
          className="min-h-[72px] px-8 rounded-2xl bg-vert text-white text-xl font-bold"
        >
          Retour à la liste
        </button>
      </div>
    );
  } else {
    contenu = (
      <div
        className="min-h-screen w-full flex flex-col bg-fond text-texte pb-24"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={reinitialiserInactivite}
      >
        <EnTeteBorne
          onRetour={() => setMode("liste")}
          labelRetour="Retour à la liste"
          sousTitre={villeNom}
        />

        <main className="flex-1 flex flex-col items-center gap-6 px-6 pb-10">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl shadow-black/5 border border-black/5 overflow-hidden">
            <div className="min-h-[200px] bg-vert/90 flex items-center justify-center relative">
              {infos.imageUrl ? (
                <div
                  className={
                    infos.estLogo
                      ? "bg-white rounded-2xl p-6 m-8"
                      : "w-full h-full"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={infos.imageUrl}
                    alt={infos.imageAlt}
                    className={
                      infos.estLogo
                        ? "max-h-28 max-w-full object-contain"
                        : "w-full h-full max-h-72 object-cover"
                    }
                  />
                </div>
              ) : (
                <IconeMallette className="w-16 h-16 text-white/70" />
              )}
            </div>
            {infos.creditPexels && (
              <p className="text-xs opacity-50 px-8 pt-2">
                Photo : {infos.creditPexels} / Pexels
              </p>
            )}

            <div className="p-8 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {infos.contrat && (
                  <span className="flex items-center gap-2 bg-jaune text-texte font-bold px-4 py-2 rounded-full text-base">
                    <IconeDocument className="w-4 h-4" />
                    {infos.contrat}
                  </span>
                )}
                {infos.grandeEntreprise && (
                  <span className="flex items-center gap-2 bg-vert text-white font-bold px-4 py-2 rounded-full text-base">
                    <IconeEtoile className="w-4 h-4" />
                    Offre à la une
                  </span>
                )}
                {estCommercant && (
                  <span className="flex items-center gap-2 bg-jaune/20 text-texte font-bold px-4 py-2 rounded-full text-base">
                    <IconeBoutique className="w-4 h-4" />
                    Commerçant du coin
                  </span>
                )}
              </div>

              <h2 className="font-title text-3xl sm:text-4xl font-bold leading-tight">
                {infos.titre}
              </h2>
              {infos.sousTitre && <p className="text-xl opacity-80">{infos.sousTitre}</p>}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-lg opacity-70">
                {infos.lieu && (
                  <span className="flex items-center gap-2">
                    <IconePin className="w-5 h-5" />
                    {infos.lieu}
                  </span>
                )}
                {infos.tempsTravail && (
                  <span className="flex items-center gap-2">
                    <IconeCalendrier className="w-5 h-5" />
                    {infos.tempsTravail}
                  </span>
                )}
              </div>

              {infos.description && (
                <button
                  onClick={() => {
                    if (!detailOuvert) enregistrerEvenement("interet", offreCourante);
                    setDetailOuvert(!detailOuvert);
                  }}
                  aria-expanded={detailOuvert}
                  className="self-start text-vert font-bold underline text-lg"
                >
                  {detailOuvert ? "Réduire" : "Lire la description complète"}
                </button>
              )}

              {detailOuvert && infos.description && (
                <p className="text-lg mt-1 whitespace-pre-line leading-relaxed opacity-90">
                  {infos.description}
                </p>
              )}

              {detailOuvert && estCommercant && offreCourante.source === "commercant" && (
                <p className="text-lg mt-1">
                  <strong>Comment postuler :</strong> {offreCourante.comment_postuler}
                </p>
              )}

              <p className="text-sm opacity-50">Source : {infos.sourceLabel}</p>
            </div>
          </div>

          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl shadow-black/5 border-2 border-vert/20 p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-fond rounded-2xl p-4 shrink-0">
              {origine && (
                <QRCodeSVG
                  value={`${origine}/ville/${villeSlug}/offres/${offreCourante.id}`}
                  size={160}
                />
              )}
            </div>
            <div className="text-center sm:text-left">
              <p className="font-title text-2xl font-bold text-vert">
                📱 Scannez pour postuler
              </p>
              <p className="text-lg opacity-70 mt-1">
                Postulez directement depuis votre téléphone en scannant ce code.
              </p>
            </div>
          </div>

          <button
            onClick={toggleSelection}
            aria-pressed={estDansSelection(offreCourante)}
            className={
              "min-h-[80px] w-full max-w-3xl rounded-2xl text-xl font-bold flex items-center justify-center gap-2 " +
              (estDansSelection(offreCourante)
                ? "bg-vert text-white"
                : "border-2 border-vert text-vert bg-white")
            }
          >
            <span aria-hidden="true">{estDansSelection(offreCourante) ? "✓" : "✚"}</span>
            {estDansSelection(offreCourante) ? "Dans ma sélection" : "Ajouter à ma sélection"}
          </button>
          {messageLimite && (
            <p className="text-red-600 text-sm" role="alert">
              Vous avez déjà {MAX_SELECTION} offres sélectionnées.
            </p>
          )}

          {offresFiltrees.length > 1 && (
            <div className="flex gap-4 w-full max-w-3xl">
              <button
                onClick={precedente}
                disabled={indexDetail === 0}
                className="min-h-[64px] flex-1 rounded-2xl border-2 border-vert text-vert text-lg font-bold disabled:opacity-30 bg-white"
              >
                ← Précédente
              </button>
              <button
                onClick={suivante}
                disabled={indexDetail === offresFiltrees.length - 1}
                className="min-h-[64px] flex-1 rounded-2xl border-2 border-vert text-vert text-lg font-bold disabled:opacity-30 bg-white"
              >
                Suivante →
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  const afficherBarreSelection =
    (mode === "liste" || mode === "detail") &&
    !emailFormOuvert &&
    !panierConfirmation &&
    selection.length > 0;

  return (
    <>
      {contenu}

      {afficherBarreSelection && (
        <div className="fixed bottom-0 left-0 right-0 bg-vert text-white px-6 py-4 flex items-center justify-between gap-4 shadow-lg">
          <p className="text-lg font-bold">
            <span aria-hidden="true">🧺</span> {selection.length} offre
            {selection.length > 1 ? "s" : ""} sélectionnée
            {selection.length > 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setEmailFormOuvert(true)}
            className="min-h-[56px] px-6 rounded-2xl bg-jaune text-texte font-bold text-lg"
          >
            Recevoir par e-mail →
          </button>
        </div>
      )}

      <button
        onClick={onTapLogo}
        aria-hidden="true"
        tabIndex={-1}
        className="fixed bottom-2 right-2 w-9 h-9 rounded-full bg-vert/10 flex items-center justify-center text-vert/40 text-xs font-bold"
      >
        N
      </button>

      {codeSortieOuvert && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <form
            onSubmit={validerCodeSortie}
            className="bg-white rounded-3xl p-8 flex flex-col gap-4 w-full max-w-xs"
          >
            <p className="font-bold text-lg">Code de sortie</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={codeSortieValeur}
              onChange={(e) => {
                setCodeSortieValeur(e.target.value);
                setCodeSortieErreur(false);
              }}
              className="border-2 border-vert/40 rounded-2xl px-4 py-3 text-xl text-center"
            />
            {codeSortieErreur && (
              <p className="text-red-600 text-sm">Code incorrect.</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCodeSortieOuvert(false)}
                className="flex-1 min-h-[48px] rounded-2xl border-2 border-vert text-vert font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[48px] rounded-2xl bg-vert text-white font-bold"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function EnTeteBorne({
  onRetour,
  labelRetour,
  sousTitre,
}: {
  onRetour: () => void;
  labelRetour: string;
  sousTitre?: string;
}) {
  return (
    <header className="flex flex-wrap items-center gap-4 px-6 py-5">
      <button
        onClick={onRetour}
        className="min-h-[64px] px-6 rounded-2xl border-2 border-vert text-vert text-lg font-bold shrink-0 flex items-center gap-2 bg-white"
        aria-label={labelRetour}
      >
        <IconeChevron className="w-5 h-5 rotate-180" />
        {labelRetour}
      </button>
      {sousTitre && (
        <p className="text-lg font-bold flex-1 min-w-[100px] truncate">{sousTitre}</p>
      )}
      <HeaderHorloge />
    </header>
  );
}

function StatPilleBorne({
  Icone,
  valeur,
  label,
}: {
  Icone: typeof IconeMallette;
  valeur: number;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md shadow-black/5 border border-black/5 px-5 py-4 flex items-center gap-4">
      <span className="shrink-0 w-12 h-12 rounded-full bg-vert/10 text-vert flex items-center justify-center">
        <Icone className="w-6 h-6" />
      </span>
      <div className="text-left">
        <p className="font-title text-2xl font-black leading-none">{valeur}</p>
        <p className="text-sm opacity-70 mt-1">{label}</p>
      </div>
    </div>
  );
}

function CarteAnnonce({
  offre,
  etiquette,
  onClick,
}: {
  offre: OffreAffichee;
  etiquette: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const infos = champsAffichage(offre);
  return (
    <button
      onClick={onClick}
      className="flex-1 bg-white rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-6 text-left flex flex-col gap-2 hover:-translate-y-0.5"
    >
      <span className="self-start bg-jaune text-texte font-bold px-3 py-1 rounded-full text-sm">
        {etiquette}
      </span>
      {infos.imageUrl && (
        <div
          className={
            infos.estLogo
              ? "w-full h-32 flex items-center justify-center bg-white rounded-xl"
              : ""
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={infos.imageUrl}
            alt={infos.imageAlt}
            className={
              infos.estLogo
                ? "max-h-24 max-w-[80%] object-contain"
                : "w-full h-32 object-cover rounded-xl"
            }
          />
        </div>
      )}
      <h3 className="font-title text-2xl font-bold">{infos.titre}</h3>
      {infos.sousTitre && <p className="opacity-70">{infos.sousTitre}</p>}
      {infos.contrat && <p className="text-sm opacity-60">{infos.contrat}</p>}
    </button>
  );
}

function CarteOffreGrille({
  offre,
  selectionnee,
  onClick,
}: {
  offre: OffreAffichee;
  selectionnee: boolean;
  onClick: () => void;
}) {
  const { titre, sousTitre, lieu, contrat, tempsTravail, imageUrl, estLogo } =
    champsAffichage(offre);
  const estCommercant = offre.source === "commercant";
  const initiale = (sousTitre || titre).charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 bg-white rounded-2xl p-5 border border-black/5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg text-left relative min-h-[120px]"
    >
      {selectionnee && (
        <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-vert text-white flex items-center justify-center text-sm font-bold">
          ✓
        </span>
      )}
      <div
        className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-xl"
        style={{ background: couleurAvatar(sousTitre || titre) }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className={
              estLogo
                ? "w-full h-full object-contain bg-white p-1"
                : "w-full h-full object-cover"
            }
          />
        ) : (
          initiale
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg leading-snug group-hover:text-vert">{titre}</h3>
        <p className="opacity-70 truncate">{sousTitre}</p>
        {estCommercant && (
          <span className="inline-block mt-1 bg-jaune text-texte text-xs font-bold px-2 py-0.5 rounded-full">
            Commerçant du coin
          </span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm opacity-70">
          {contrat && (
            <span className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: couleurContrat(contrat) }}
              />
              {contrat}
            </span>
          )}
          {tempsTravail && (
            <span className="flex items-center gap-1">
              <IconeCalendrier className="w-4 h-4" />
              {tempsTravail}
            </span>
          )}
          {lieu && (
            <span className="flex items-center gap-1">
              <IconePin className="w-4 h-4" />
              {lieu}
            </span>
          )}
        </div>
      </div>

      <span
        aria-hidden="true"
        className="shrink-0 w-9 h-9 rounded-full bg-vert/10 text-vert flex items-center justify-center group-hover:bg-vert group-hover:text-white mt-1"
      >
        <IconeChevron className="w-5 h-5" />
      </span>
    </button>
  );
}
