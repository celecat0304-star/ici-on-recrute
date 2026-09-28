"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { createPublicClient } from "@/lib/supabase/public";
import type { OffreAffichee } from "@/lib/types";
import { BarreNav, Clavier, EnTete, Ic, Logo, LogoFranceTravail, Scene, Vignette } from "./BorneComposants";
import { imageIllustration } from "@/lib/imagesThemes";
import {
  CONTRATS,
  FILTRES_VIDES,
  SECTEURS,
  capitaliser,
  champsAffichage,
  correspond,
  couleurAvatar,
  couleurContrat,
  estNouvelle,
  initiales,
  joursDepuis,
  masquerEmail,
  tronquer,
  type Filtres,
} from "./borneUtils";

const DELAI_INACTIVITE_MS = 60_000;
const SEUIL_GLISSEMENT_PX = 50;
const DELAI_ENVOI_STATS_MS = 10_000;
const DELAI_ROTATION_ATTENTE_MS = 9_000;
const DELAI_CONFIRMATION_S = 45;
const DELAI_VEILLE_MS = 30_000;
const DUREE_COMPTEUR_MS = 1200;
const MAX_SELECTION = 10;
const PAGE = 5;
const DELAI_MAX_ENTRE_APPUIS_MS = 1500;
const APPUIS_POUR_SORTIE = 3;

type Props = {
  borne: { id: string; nom: string; lieu: string };
  villeId: string;
  villeNom: string;
  villeSlug: string;
  villePhotoUrl?: string | null;
  villeLogoUrl?: string | null;
  rayonKm?: number;
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
type Ecran = "accueil" | "recherche" | "offres" | "offre" | "candidature" | "confirmation";

export default function BorneClient({
  borne,
  villeId,
  villeNom,
  villePhotoUrl = null,
  villeLogoUrl = null,
  rayonKm = 10,
  offres,
  caseA,
  caseB,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Ecran>("accueil");
  const [indexAttente, setIndexAttente] = useState(0);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [clavierOuvert, setClavierOuvert] = useState(false);
  const [nbVisibles, setNbVisibles] = useState(PAGE);
  const [indexDetail, setIndexDetail] = useState(0);
  const [selection, setSelection] = useState<ElementSelection[]>([]);
  const [messageLimite, setMessageLimite] = useState(false);
  const [email, setEmail] = useState("");
  const [envoiPanierEnCours, setEnvoiPanierEnCours] = useState(false);
  const [erreurPanier, setErreurPanier] = useState("");
  const [panierConfirmation, setPanierConfirmation] = useState<{
    email: string;
    lien: string;
  } | null>(null);
  const [panierQr, setPanierQr] = useState<{ id: string; lien: string } | null>(null);
  const [secondes, setSecondes] = useState(DELAI_CONFIRMATION_S);
  const [veille, setVeille] = useState(false);
  const [compteur, setCompteur] = useState(offres.length);
  const veilleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codeSortieOuvert, setCodeSortieOuvert] = useState(false);
  const [codeSortieValeur, setCodeSortieValeur] = useState("");
  const [codeSortieErreur, setCodeSortieErreur] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const evenementsEnAttente = useRef<EvenementStat[]>([]);
  const appuisLogo = useRef<{ nombre: number; dernier: number }>({ nombre: 0, dernier: 0 });
  const supabase = useMemo(() => createPublicClient(), []);

  const villeAffichee = capitaliser(villeNom);

  const offresFiltrees = useMemo(
    () => offres.filter((o) => correspond(o, filtres)),
    [offres, filtres]
  );
  const offreCourante = mode === "offre" ? offresFiltrees[indexDetail] : undefined;
  const infos = offreCourante ? champsAffichage(offreCourante) : null;

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
    if (mode === "offre" && offreCourante) {
      enregistrerEvenement("vue", offreCourante);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offreCourante?.id, mode]);

  // Rotation automatique des offres mises en avant sur l'accueil
  // (un délai relancé à chaque changement garde la barre de progression alignée)
  useEffect(() => {
    if (mode !== "accueil") return;
    const minuteur = setTimeout(() => setIndexAttente((i) => i + 1), DELAI_ROTATION_ATTENTE_MS);
    return () => clearTimeout(minuteur);
  }, [mode, indexAttente]);

  // Compteur d'offres : défile de 0 au total au chargement puis toutes les 30 s
  useEffect(() => {
    if (mode !== "accueil") return;
    const total = offres.length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCompteur(total);
      return;
    }
    let raf = 0;
    const jouer = () => {
      const debut = performance.now();
      const pas = (t: number) => {
        const p = Math.min(1, (t - debut) / DUREE_COMPTEUR_MS);
        setCompteur(Math.round(total * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(pas);
      };
      raf = requestAnimationFrame(pas);
    };
    jouer();
    const intervalle = setInterval(jouer, 30_000);
    return () => {
      clearInterval(intervalle);
      cancelAnimationFrame(raf);
    };
  }, [mode, offres.length]);

  // Écran de veille : après 30 s sans contact, un bandeau invite à toucher l'écran
  const armerVeille = () => {
    if (veilleTimer.current) clearTimeout(veilleTimer.current);
    setVeille(false);
    veilleTimer.current = setTimeout(() => setVeille(true), DELAI_VEILLE_MS);
  };

  useEffect(() => {
    if (mode !== "accueil") {
      if (veilleTimer.current) clearTimeout(veilleTimer.current);
      setVeille(false);
      return;
    }
    armerVeille();
    return () => {
      if (veilleTimer.current) clearTimeout(veilleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const revenirAAttente = () => {
    setMode("accueil");
    setIndexDetail(0);
    setSelection([]);
    setEmail("");
    setPanierConfirmation(null);
    setPanierQr(null);
    setErreurPanier("");
    setFiltres(FILTRES_VIDES);
    setClavierOuvert(false);
    setNbVisibles(PAGE);
  };

  const reinitialiserInactivite = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mode === "accueil") armerVeille();
    if (mode !== "accueil" && mode !== "confirmation") {
      timerRef.current = setTimeout(revenirAAttente, DELAI_INACTIVITE_MS);
    }
  };

  useEffect(() => {
    reinitialiserInactivite();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, indexDetail, nbVisibles, filtres, email, selection.length]);

  // Compte à rebours de l'écran de confirmation : les données sont effacées ensuite
  useEffect(() => {
    if (mode !== "confirmation") return;
    setSecondes(DELAI_CONFIRMATION_S);
    const id = setInterval(() => setSecondes((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (mode === "confirmation" && secondes <= 0) revenirAAttente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, secondes]);

  const majFiltres = (partiel: Partial<Filtres>) => {
    setFiltres((f) => ({ ...f, ...partiel }));
    setNbVisibles(PAGE);
  };

  const allerAuxOffres = (partiel: Partial<Filtres> = {}) => {
    setFiltres({ ...FILTRES_VIDES, ...partiel });
    setNbVisibles(PAGE);
    setClavierOuvert(false);
    setMode("offres");
  };

  const ouvrirDetail = (o: OffreAffichee) => {
    const idx = offresFiltrees.findIndex((x) => x.source === o.source && x.id === o.id);
    setIndexDetail(idx === -1 ? 0 : idx);
    setMode("offre");
  };

  const ouvrirOffreDepuisAccueil = (o: OffreAffichee) => {
    setFiltres(FILTRES_VIDES);
    setNbVisibles(PAGE);
    const idx = offres.findIndex((x) => x.source === o.source && x.id === o.id);
    setIndexDetail(idx === -1 ? 0 : idx);
    setMode("offre");
  };

  const suivante = () => setIndexDetail((i) => Math.min(i + 1, offresFiltrees.length - 1));
  const precedente = () => setIndexDetail((i) => Math.max(i - 1, 0));

  const basculerSelection = (o: OffreAffichee) => {
    if (estDansSelection(o)) {
      setSelection((s) => s.filter((x) => !(x.source === o.source && x.id === o.id)));
      return;
    }
    if (selection.length >= MAX_SELECTION) {
      setMessageLimite(true);
      setTimeout(() => setMessageLimite(false), 3000);
      return;
    }
    setSelection((s) => [...s, { source: o.source, id: o.id }]);
    enregistrerEvenement("interet", o);
    enregistrerEvenement("selection", o);
  };

  const offresSelectionnees = selection
    .map((s) => offres.find((o) => o.source === s.source && o.id === s.id))
    .filter((o): o is OffreAffichee => Boolean(o));

  const emailValide = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);

  // Le QR code est prêt dès l'ouverture de l'écran, sans attendre d'e-mail :
  // on crée le panier tout de suite (sans adresse) et on le recrée si la sélection change.
  const cleSelection = selection.map((s) => `${s.source}:${s.id}`).join(",");
  useEffect(() => {
    if (mode !== "candidature" || selection.length === 0) return;
    let annule = false;
    setPanierQr(null);
    fetch("/api/panier/creer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ villeId, offres: selection }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (annule || !data.lien) return;
        setPanierQr({ id: data.panierId, lien: data.lien });
        offresSelectionnees.forEach((o) => enregistrerEvenement("qr_affiche", o));
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cleSelection]);

  const envoyerPanier = async () => {
    setErreurPanier("");
    setEnvoiPanierEnCours(true);
    try {
      const res = await fetch("/api/panier/creer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villeId, email, offres: selection, panierId: panierQr?.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (!panierQr) offresSelectionnees.forEach((o) => enregistrerEvenement("qr_affiche", o));
        setPanierConfirmation({ email, lien: data.lien });
        setEmail("");
        setMode("confirmation");
      } else {
        setErreurPanier(data.error ?? "Une erreur est survenue.");
      }
    } catch {
      setErreurPanier("Connexion impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setEnvoiPanierEnCours(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > SEUIL_GLISSEMENT_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) suivante();
      else precedente();
    }
    touchStart.current = null;
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

  const nbSelection = selection.length;
  const versCandidature = () => {
    if (nbSelection > 0) setMode("candidature");
  };

  let ecran: React.ReactNode;

  if (mode === "accueil") {
    const vedettes = (caseB.length > 0 ? caseB : caseA.length > 0 ? caseA : offres).slice(0, 6);
    const employeurs = caseB.length > 0 ? caseA.slice(0, 18) : [];
    const actif = vedettes.length > 0 ? indexAttente % vedettes.length : 0;
    const ligneVille = `${rayonKm} km de ${villeAffichee}`;
    const taillePitch = Math.min(118, Math.floor(900 / (Math.max(10, ligneVille.length) * 0.47)));

    let colonnes: OffreAffichee[][] = [];
    for (let k = 0; k < employeurs.length; k += 3) colonnes.push(employeurs.slice(k, k + 3));
    while (colonnes.length > 0 && colonnes.length < 3) colonnes = colonnes.concat(colonnes);

    ecran = (
      <>
        <section className="relative shrink-0 overflow-hidden bg-[#F7F5F0]" style={{ height: 548 }}>
          {villePhotoUrl && (
            <div className="absolute right-0 top-0 overflow-hidden" style={{ width: 756, height: 540 }}>
              <div
                className="bc-zoom h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${villePhotoUrl})`,
                  filter: "brightness(1.1) saturate(1.15)",
                }}
              />
            </div>
          )}
          <div
            className="absolute left-0 top-0"
            style={{
              width: 1080,
              height: 548,
              background:
                "linear-gradient(90deg, #EEF2F7 0%, rgba(238,242,247,0.96) 44%, rgba(238,242,247,0.6) 62%, rgba(238,242,247,0) 88%)",
            }}
          />
          <div
            className="absolute -bottom-0.5 left-0"
            style={{
              width: 1080,
              height: 200,
              background:
                "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.85) 60%, #F7F5F0 100%)",
            }}
          />
          <header className="absolute left-14" style={{ top: 28 }}>
            <Logo taille={40} />
          </header>
          <span
            className="absolute left-14 flex items-center gap-3 rounded-full bg-[#0E8A4A] pl-4 pr-6 font-bold text-white"
            style={{ top: 128, height: 56, fontSize: 26 }}
          >
            <Ic n="horloge" s={30} sw={2.4} />
            2 minutes chrono
          </span>
          <h1
            className="absolute left-14 font-bold text-[#0F1A45]"
            style={{ top: 204, fontSize: taillePitch, lineHeight: 0.95, letterSpacing: "-0.04em" }}
          >
            Un emploi
            <br />à moins de
            <br />
            <span className="text-[#0E8A4A]">{rayonKm} km</span> de {villeAffichee}
          </h1>
        </section>

        <main className="relative flex grow flex-col justify-between px-12 pb-5 pt-4">
          {vedettes.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="relative" style={{ height: 340 }}>
                {vedettes.map((o, k) => {
                  const c = champsAffichage(o);
                  const visible = k === actif;
                  return (
                    <button
                      key={`${o.source}-${o.id}`}
                      onClick={() => ouvrirOffreDepuisAccueil(o)}
                      aria-hidden={!visible}
                      tabIndex={visible ? 0 : -1}
                      className="bc-fondu absolute left-0 top-0 flex overflow-hidden rounded-[32px] bg-white"
                      style={{
                        width: 984,
                        height: 340,
                        boxShadow: "0 24px 60px rgba(15,26,69,0.18)",
                        opacity: visible ? 1 : 0,
                        transform: visible ? "translateX(0)" : "translateX(24px)",
                        pointerEvents: visible ? "auto" : "none",
                      }}
                    >
                      <div className="relative shrink-0" style={{ width: 440, height: 340, background: "#F1F4F9" }}>
                        {c.imageUrl && !c.estLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.imageUrl} alt={c.imageAlt} className="h-full w-full object-cover" />
                        ) : c.imageUrl ? (
                          <div className="flex h-full w-full items-center justify-center" style={{ background: "#F1F4F9" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.imageUrl}
                              alt={c.imageAlt}
                              className="object-contain"
                              style={{ width: "75%", maxHeight: "80%" }}
                            />
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageIllustration(c.titre, c.sousTitre, o.id).url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 grow flex-col gap-2.5 px-8 py-[26px]">
                        <span
                          className="d block shrink-0 truncate font-semibold uppercase text-[#545A6B]"
                          style={{ fontSize: 22, letterSpacing: "0.04em" }}
                        >
                          {c.sousTitre}
                        </span>
                        <p
                          className="d line-clamp-2 shrink-0 font-bold"
                          style={{ fontSize: 52, lineHeight: 1.06, letterSpacing: "-0.02em" }}
                        >
                          {tronquer(c.titre, 36)}
                        </p>
                        <div className="flex shrink-0 items-center gap-[22px] whitespace-nowrap text-[22px] text-[#3B4152]">
                          {c.lieu && (
                            <span className="flex items-center gap-1.5">
                              <Ic n="pin" s={24} sw={2} />
                              <span className="max-w-[170px] truncate">{c.lieu}</span>
                            </span>
                          )}
                          {c.contratNom && (
                            <span className="flex items-center gap-1.5">
                              <Ic n="doc" s={24} sw={2} />
                              {c.contratNom}
                            </span>
                          )}
                          {c.tempsTravail && (
                            <span className="flex items-center gap-1.5">
                              <Ic n="horloge" s={24} sw={2} />
                              {c.tempsTravail}
                            </span>
                          )}
                        </div>
                        {c.description && c.titre.length <= 20 && (
                          <p className="line-clamp-2 shrink-0 text-[23px] text-[#262B3A]" style={{ lineHeight: 1.4 }}>
                            {c.description}
                          </p>
                        )}
                        <span className="mt-auto flex items-center justify-center gap-3.5 rounded-[20px] bg-[#2B3BE0] text-[28px] font-bold text-white" style={{ height: 76 }}>
                          Voir l’offre
                          <Ic n="fleche" s={30} sw={2.4} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {vedettes.length > 1 && (
                <div className="flex justify-center">
                  {vedettes.map((_, k) => (
                    <button
                      key={k}
                      onClick={() => setIndexAttente(k)}
                      aria-label={`Offre ${k + 1} sur ${vedettes.length}`}
                      className="flex h-10 w-12 items-center justify-center"
                    >
                      <span
                        className="relative overflow-hidden rounded-full transition-[width] duration-300"
                        style={{ height: 10, width: k === actif ? 40 : 10, background: "#C9C4B6" }}
                      >
                        {k === actif && (
                          <span
                            key={indexAttente}
                            className="bc-remplir absolute inset-y-0 left-0 rounded-full bg-[#0F1A45]"
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span
                className="d font-bold tabular-nums text-[#0E8A4A]"
                style={{ fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.04em" }}
              >
                {compteur}
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="d font-bold" style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
                  offres disponibles
                  <br />
                  aujourd’hui
                </span>
                <span className="flex items-center gap-2.5 font-semibold text-[#0E8A4A]" style={{ fontSize: 20 }}>
                  <span className="relative flex h-3 w-3">
                    <span className="bc-ping absolute inset-0 rounded-full bg-[#0E8A4A]" />
                    <span className="relative h-3 w-3 rounded-full bg-[#0E8A4A]" />
                  </span>
                  en direct
                </span>
              </div>
            </div>
            <button
              onClick={() => setMode("recherche")}
              className="flex shrink-0 items-center gap-3 rounded-full bg-white pl-[22px] pr-7 text-2xl font-bold text-[#2B3BE0] shadow-[inset_0_0_0_2px_#2B3BE0]"
              style={{ height: 76 }}
            >
              <Ic n="loupe" s={28} />
              Rechercher
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="min-w-0 grow overflow-x-auto"
              style={{
                scrollbarWidth: "none",
                WebkitMaskImage: "linear-gradient(90deg, #000 calc(100% - 60px), transparent 100%)",
                maskImage: "linear-gradient(90deg, #000 calc(100% - 60px), transparent 100%)",
              }}
            >
              <div className="flex w-max gap-3">
                <button
                  onClick={() => allerAuxOffres()}
                  className="flex items-center gap-3 rounded-[22px] bg-[#2B3BE0] pl-5 pr-[26px] font-bold text-white"
                  style={{ height: 84, fontSize: 26 }}
                >
                  <Ic n="grille" s={28} sw={2} />
                  Tous
                </button>
                {SECTEURS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => allerAuxOffres({ secteur: s.id })}
                    className="bc-anneau flex items-center gap-3 rounded-[22px] bg-white pl-5 pr-[26px] font-bold"
                    style={{ height: 84, fontSize: 26 }}
                  >
                    {s.libelle}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {colonnes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[26px] font-bold text-[#545A6B]">Ils recrutent aussi à {villeAffichee}</h2>
              <div
                className="bc-defilant -mx-12 overflow-hidden pb-1"
                style={{
                  WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 90px, #000 990px, transparent 1080px)",
                  maskImage: "linear-gradient(90deg, transparent 0, #000 90px, #000 990px, transparent 1080px)",
                }}
              >
                <div
                  className="bc-piste flex w-max"
                  style={{ marginLeft: 48, animationDuration: `${colonnes.length * 32}s` }}
                >
                  {[...colonnes, ...colonnes].map((col, ci) => (
                    <div key={ci} className="mr-4 flex shrink-0 flex-col gap-3.5" style={{ width: 484 }}>
                      {col.map((o) => {
                        const c = champsAffichage(o);
                        return (
                          <button
                            key={`${o.source}-${o.id}`}
                            onClick={() => ouvrirOffreDepuisAccueil(o)}
                            className="bc-carte box-border flex items-center gap-4 rounded-3xl pl-[18px] pr-4"
                            style={{ height: 136 }}
                          >
                            <Vignette
                              titre={c.titre}
                              sousTitre={c.sousTitre}
                              imageUrl={c.imageUrl}
                              estLogo={c.estLogo}
                              cle={o.id}
                              className="h-[88px] w-[88px] rounded-[16px]"
                            />
                            <span className="flex min-w-0 grow flex-col gap-0.5">
                              <span className="line-clamp-2 font-bold" style={{ fontSize: 22, lineHeight: 1.2 }}>
                                {tronquer(c.titre, 58)}
                              </span>
                              <span
                                className="truncate font-semibold uppercase text-[#545A6B]"
                                style={{ fontSize: 20, letterSpacing: "0.04em" }}
                              >
                                {c.sousTitre}
                              </span>
                              <span className="flex items-center gap-3.5 whitespace-nowrap text-[20px] text-[#3B4152]">
                                {c.contratNom && (
                                  <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: couleurContrat(c.contratNom) }} />
                                    {c.contratNom}
                                  </span>
                                )}
                                {c.contratDuree && (
                                  <span className="flex items-center gap-1.5">
                                    <Ic n="calendrier" s={20} sw={2} />
                                    {c.contratDuree}
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F1EEE6]">
                              <Ic n="chevron" s={24} sw={2.4} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="relative">
            <span
              aria-hidden="true"
              className="bc-halo-cta absolute inset-0 rounded-full bg-[#0E8A4A]"
            />
            <button
              onClick={() => allerAuxOffres()}
              className="bc-vert bc-respire relative flex w-full items-center justify-center gap-6 rounded-full"
              style={{ height: 132, boxShadow: "0 16px 40px rgba(14,138,74,0.35)" }}
            >
              <Ic n="loupe" s={52} sw={2.4} />
              <span className="d text-[48px] font-bold" style={{ letterSpacing: "0.01em" }}>
                VOIR LES {offres.length} OFFRES
              </span>
              <Ic n="fleche" s={48} sw={2.4} />
            </button>
          </div>

          {veille && (
            <div
              className="bc-pulse pointer-events-none absolute left-12 right-12 flex items-center justify-center gap-4 rounded-full bg-[#0F1A45] text-white"
              style={{ bottom: 168, height: 64, fontSize: 28, fontWeight: 700 }}
            >
              <Ic n="main" s={34} sw={2} />
              Touchez l’écran pour voir les offres
            </div>
          )}
        </main>

        <footer className="relative flex shrink-0 items-center gap-5 px-12" style={{ height: 124 }}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[20px] text-[#3B4152]">Une initiative de votre ville</span>
            {villeLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={villeLogoUrl} alt={`Logo de ${villeAffichee}`} className="h-[64px] w-auto max-w-[240px] object-contain object-left" />
            ) : (
              <span className="d text-[30px] font-bold">{villeAffichee}</span>
            )}
          </div>
          <div className="flex grow flex-col items-end gap-1.5">
            <span className="text-[20px] text-[#3B4152]">En partenariat avec</span>
            <LogoFranceTravail />
          </div>
          <span className="absolute inset-x-0 bottom-1 text-center text-[20px] text-[#545A6B]">
            Photos d’illustration : Pexels
          </span>
        </footer>
      </>
    );
  } else if (mode === "recherche") {
    const commerces = filtres.commercantsSeul;
    ecran = (
      <>
        <EnTete onAccueil={revenirAAttente} nbSelection={nbSelection} onSelection={versCandidature} ville={{ nom: villeAffichee, logoUrl: villeLogoUrl }} />
        <main className="flex min-h-0 grow flex-col gap-11 overflow-y-auto px-12 pt-[52px]">
          <div className="flex flex-col gap-3">
            <h1 className="text-[80px] font-bold" style={{ lineHeight: 1, letterSpacing: "-0.035em" }}>
              Que cherchez-vous&nbsp;?
            </h1>
            <p className="text-[28px] text-[#3B4152]" style={{ lineHeight: 1.4 }}>
              Tout est facultatif. Vous pouvez voir les offres à tout moment.
            </p>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="text-[32px] font-bold">Métier</h2>
            <div
              className="flex h-[108px] items-center gap-[18px] rounded-[28px] bg-white pl-[30px] pr-3.5"
              style={{ boxShadow: clavierOuvert ? "inset 0 0 0 3px #2B3BE0, 0 0 0 8px #E9EBFD" : "inset 0 0 0 2px #E4E0D6" }}
            >
              <Ic n="loupe" s={38} className="text-[#2B3BE0]" />
              <button
                onClick={() => setClavierOuvert(true)}
                aria-label="Saisir un métier"
                className="grow truncate text-[34px] font-bold"
              >
                {filtres.texte || <span className="font-normal text-[#8A867B]">Ex. : vendeur, cuisinier, aide à domicile</span>}
              </button>
              {filtres.texte && (
                <button
                  onClick={() => majFiltres({ texte: "" })}
                  aria-label="Effacer le métier"
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F1EEE6]"
                >
                  <Ic n="croix" s={30} sw={2.4} />
                </button>
              )}
            </div>
            {clavierOuvert && (
              <Clavier
                mode="texte"
                valeur={filtres.texte}
                onChange={(v) => majFiltres({ texte: v })}
                onFermer={() => setClavierOuvert(false)}
              />
            )}
            <div className="flex flex-wrap gap-3">
              {SECTEURS.map((s) => {
                const actif = filtres.secteur === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => majFiltres({ secteur: actif ? null : s.id })}
                    aria-pressed={actif}
                    className={
                      "flex h-20 items-center gap-3 rounded-[22px] pl-5 pr-[26px] text-2xl font-bold " +
                      (actif ? "bg-[#2B3BE0] text-white" : "bc-anneau bg-white")
                    }
                  >
                    {actif && <Ic n="coche" s={28} sw={3} />}
                    {s.libelle}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[32px] font-bold">Type de contrat</h2>
              <span className="text-[22px] text-[#545A6B]">Plusieurs choix possibles</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {CONTRATS.map((nom) => {
                const actif = filtres.contrats.includes(nom);
                return (
                  <button
                    key={nom}
                    onClick={() =>
                      majFiltres({
                        contrats: actif
                          ? filtres.contrats.filter((x) => x !== nom)
                          : [...filtres.contrats, nom],
                      })
                    }
                    aria-pressed={actif}
                    className={
                      "flex h-[84px] items-center gap-3 rounded-[22px] pr-7 text-[26px] font-bold " +
                      (actif ? "bg-[#2B3BE0] pl-5 text-white" : "bc-anneau bg-white pl-[22px]")
                    }
                  >
                    {actif ? (
                      <Ic n="coche" s={28} sw={3} />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full" style={{ background: couleurContrat(nom) }} />
                    )}
                    {nom}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4 pb-6">
            <h2 className="text-[32px] font-bold">Commerces</h2>
            <button
              role="switch"
              aria-checked={commerces}
              onClick={() => majFiltres({ commercantsSeul: !commerces })}
              className="bc-carte flex h-[108px] items-center justify-between rounded-[28px] pl-[30px] pr-6 text-[28px]"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E9EBFD] text-[#2B3BE0]">
                  <Ic n="boutique" s={28} sw={2} />
                </span>
                Seulement les commerçants du coin
              </span>
              <span
                className="flex h-[58px] w-[100px] shrink-0 items-center rounded-full p-[5px]"
                style={{ background: commerces ? "#0E8A4A" : "#C9C4B6", justifyContent: commerces ? "flex-end" : "flex-start" }}
              >
                <span className="h-12 w-12 rounded-full bg-white" />
              </span>
            </button>
          </section>
        </main>

        <div className="flex gap-4 px-12 py-7">
          <button
            onClick={() => {
              setFiltres(FILTRES_VIDES);
              setNbVisibles(PAGE);
            }}
            className="flex h-[132px] w-[260px] shrink-0 items-center justify-center rounded-full bg-white text-[28px] font-bold shadow-[inset_0_0_0_2px_#0F1A45]"
          >
            Tout effacer
          </button>
          <button
            onClick={() => {
              setClavierOuvert(false);
              setMode("offres");
            }}
            className="bc-vert flex h-[132px] grow items-center justify-center gap-5 rounded-full"
          >
            <Ic n="loupe" s={46} sw={2.4} />
            <span className="d text-[42px] font-bold" style={{ letterSpacing: "0.01em" }}>
              VOIR LES {offresFiltrees.length} OFFRES
            </span>
            <Ic n="fleche" s={44} sw={2.4} />
          </button>
        </div>
        <BarreNav onRetour={revenirAAttente} labelRetour="Accueil" />
      </>
    );
  } else if (mode === "offres") {
    const visibles = offresFiltrees.slice(0, nbVisibles);
    const restantes = offresFiltrees.length - visibles.length;
    const resume = [
      filtres.texte && `« ${filtres.texte} »`,
      filtres.secteur && SECTEURS.find((s) => s.id === filtres.secteur)?.libelle,
      ...filtres.contrats,
      filtres.commercantsSeul && "Commerçants du coin",
    ].filter(Boolean) as string[];

    ecran = (
      <>
        <EnTete onAccueil={revenirAAttente} nbSelection={nbSelection} onSelection={versCandidature} ville={{ nom: villeAffichee, logoUrl: villeLogoUrl }} />
        <div className="flex flex-col gap-6 px-12 pb-5 pt-10">
          <div className="flex items-end justify-between gap-6">
            <h1 className="whitespace-nowrap text-[44px] font-bold" style={{ lineHeight: 1, letterSpacing: "-0.025em" }}>
              <span className="text-[88px] text-[#0E8A4A]" style={{ letterSpacing: "-0.04em" }}>
                {offresFiltrees.length}
              </span>{" "}
              offre{offresFiltrees.length > 1 ? "s" : ""} pour vous
            </h1>
            <button
              onClick={() => setMode("recherche")}
              className="flex h-20 shrink-0 items-center gap-3 rounded-full bg-white pl-[22px] pr-7 text-2xl font-bold text-[#2B3BE0] shadow-[inset_0_0_0_2px_#2B3BE0]"
            >
              <Ic n="filtres" s={28} />
              Modifier
            </button>
          </div>
          {resume.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {resume.map((t) => (
                <span key={t} className="flex h-14 items-center rounded-full bg-[#E9EBFD] px-5 text-[22px] font-bold text-[#1A249E]">
                  {t}
                </span>
              ))}
            </div>
          )}
          {messageLimite && (
            <p role="alert" className="text-[24px] font-bold text-[#B42318]">
              Vous avez déjà {MAX_SELECTION} offres sélectionnées.
            </p>
          )}
        </div>

        <div className="min-h-0 grow overflow-y-auto px-12">
          {offresFiltrees.length === 0 ? (
            <div className="bc-carte flex flex-col items-center gap-6 rounded-[28px] px-10 py-16 text-center">
              <p className="text-[34px] font-bold">Aucune offre ne correspond.</p>
              <p className="text-[26px] text-[#3B4152]">Essayez avec moins de critères.</p>
              <button
                onClick={() => {
                  setFiltres(FILTRES_VIDES);
                  setNbVisibles(PAGE);
                }}
                className="flex h-20 items-center rounded-full bg-[#2B3BE0] px-8 text-2xl font-bold text-white"
              >
                Tout effacer
              </button>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
              {visibles.map((o) => {
                const c = champsAffichage(o);
                const sel = estDansSelection(o);
                return (
                  <li
                    key={`${o.source}-${o.id}`}
                    className="box-border flex h-[190px] shrink-0 items-center overflow-hidden rounded-[28px] bg-white"
                    style={{ boxShadow: sel ? "inset 0 0 0 3px #0E8A4A" : "0 1px 0 #E4E0D6, 0 6px 18px rgba(15,26,69,0.05)" }}
                  >
                    <button
                      onClick={() => ouvrirDetail(o)}
                      className="box-border flex h-[190px] min-w-0 grow items-center gap-5 pl-[22px] pr-3"
                    >
                      <Vignette
                        titre={c.titre}
                        sousTitre={c.sousTitre}
                        imageUrl={c.imageUrl}
                        estLogo={c.estLogo}
                        cle={o.id}
                        className="h-24 w-24 rounded-[20px]"
                      />
                      <span className="flex min-w-0 grow flex-col gap-1">
                        <span className="flex items-center gap-3">
                          <span className="d line-clamp-2 text-[30px] font-bold" style={{ lineHeight: 1.12, letterSpacing: "-0.015em" }}>
                            {tronquer(c.titre, 54)}
                          </span>
                          {estNouvelle(o) && (
                            <span className="flex h-[34px] shrink-0 items-center rounded-full bg-[#E3F4EC] px-3 text-[19px] font-bold text-[#0A5C39]">
                              Nouveau
                            </span>
                          )}
                        </span>
                        <span className="truncate text-[23px] text-[#545A6B]">{c.sousTitre}</span>
                        <span className="mt-2 flex items-center gap-[18px] whitespace-nowrap text-[22px] text-[#3B4152]">
                          {c.contratNom && (
                            <span className="flex items-center gap-2">
                              <span className="h-3.5 w-3.5 rounded-full" style={{ background: couleurContrat(c.contratNom) }} />
                              {c.contratNom}
                            </span>
                          )}
                          {(c.contratDuree || c.tempsTravail) && (
                            <span className="flex items-center gap-1.5">
                              <Ic n="calendrier" s={22} sw={2} />
                              {c.contratDuree || c.tempsTravail}
                            </span>
                          )}
                          {c.lieu && (
                            <span className="flex min-w-0 items-center gap-1">
                              <Ic n="pin" s={22} sw={2} />
                              <span className="truncate">{c.lieu}</span>
                            </span>
                          )}
                        </span>
                      </span>
                      <Ic n="chevron" s={36} sw={2.4} className="shrink-0 text-[#9A968A]" />
                    </button>
                    <button
                      onClick={() => basculerSelection(o)}
                      aria-pressed={sel}
                      aria-label={sel ? "Retirer de ma sélection" : "Ajouter à ma sélection"}
                      className="flex h-[190px] w-[150px] shrink-0 flex-col items-center justify-center gap-2 border-l-2 border-[#F1EEE6] text-center text-xl font-bold"
                      style={{ background: sel ? "#0E8A4A" : "#FFFFFF", color: sel ? "#FFFFFF" : "#0E8A4A" }}
                    >
                      {sel ? <Ic n="coche" s={44} sw={2.8} /> : <Ic n="coeur" s={44} />}
                      <span>{sel ? "Sélectionnée" : "Ça m’intéresse"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {restantes > 0 && (
            <div className="flex items-center justify-center gap-6 py-6">
              <span className="text-[22px] text-[#545A6B]">
                Offres 1 à {visibles.length} sur {offresFiltrees.length}
              </span>
              <button
                onClick={() => setNbVisibles((n) => n + PAGE)}
                className="bc-anneau flex h-20 items-center gap-2.5 rounded-full bg-white pl-6 pr-[30px] text-2xl font-bold"
              >
                <Ic n="bas" s={28} sw={2.4} />
                Voir {Math.min(PAGE, restantes)} offre{Math.min(PAGE, restantes) > 1 ? "s" : ""} de plus
              </button>
            </div>
          )}
        </div>

        {nbSelection > 0 && (
          <div className="px-12 pb-7 pt-5">
            <button
              onClick={versCandidature}
              className="bc-vert flex h-[132px] w-full items-center gap-[22px] rounded-full pl-5 pr-10"
            >
              <span className="d flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-white text-[44px] font-bold text-[#0E8A4A]">
                {nbSelection}
              </span>
              <span className="flex grow flex-col gap-0.5">
                <span className="d text-4xl font-bold" style={{ letterSpacing: "-0.01em" }}>
                  offre{nbSelection > 1 ? "s" : ""} sélectionnée{nbSelection > 1 ? "s" : ""}
                </span>
                <span className="text-[22px] opacity-90">Les recevoir sur mon téléphone pour postuler</span>
              </span>
              <Ic n="fleche" s={46} sw={2.4} />
            </button>
          </div>
        )}
        <BarreNav onRetour={() => setMode("recherche")} labelRetour="Retour" onAccueil={revenirAAttente} />
      </>
    );
  } else if (mode === "offre" && offreCourante && infos) {
    const sel = estDansSelection(offreCourante);
    const jours = joursDepuis(infos.datePublication);
    const titreTaille = infos.titre.length <= 28 ? 88 : infos.titre.length <= 48 ? 68 : 54;
    const tuiles = [
      infos.contratNom && {
        icone: "doc" as const,
        libelle: "Contrat",
        valeur: infos.contratNom,
        point: couleurContrat(infos.contratNom),
        detail: [infos.contratDuree, infos.tempsTravail].filter(Boolean).join(" · "),
      },
      infos.lieu && { icone: "pin" as const, libelle: "Lieu", valeur: infos.lieu, detail: villeAffichee },
      infos.horaires && { icone: "horloge" as const, libelle: "Horaires", valeur: infos.horaires, detail: "" },
      jours !== null && {
        icone: "calendrier" as const,
        libelle: "Publiée",
        valeur: jours === 0 ? "Aujourd’hui" : jours === 1 ? "Hier" : `Il y a ${jours} jours`,
        detail: "",
      },
      { icone: "boutique" as const, libelle: "Source", valeur: infos.sourceLabel, detail: "" },
    ].filter(Boolean) as {
      icone: "doc" | "pin" | "horloge" | "calendrier" | "boutique";
      libelle: string;
      valeur: string;
      point?: string;
      detail: string;
    }[];

    ecran = (
      <>
        <EnTete onAccueil={revenirAAttente} nbSelection={nbSelection} onSelection={versCandidature} ville={{ nom: villeAffichee, logoUrl: villeLogoUrl }} />
        <main
          className="flex min-h-0 grow flex-col gap-8 overflow-y-auto px-12 pt-11"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative h-[260px] shrink-0 overflow-hidden rounded-[28px] bg-[#DDE3EA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                infos.imageUrl && !infos.estLogo
                  ? infos.imageUrl
                  : imageIllustration(infos.titre, infos.sousTitre, offreCourante.id).url
              }
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="flex items-center gap-4">
              <span
                className="d flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-[26px] font-bold text-white"
                style={{ background: infos.imageUrl && infos.estLogo ? "#FFFFFF" : couleurAvatar(infos.sousTitre || infos.titre), boxShadow: infos.imageUrl && infos.estLogo ? "inset 0 0 0 2px #E4E0D6" : undefined }}
              >
                {infos.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={infos.imageUrl} alt={infos.imageAlt} className={"h-full w-full " + (infos.estLogo ? "object-contain p-1" : "object-cover")} />
                ) : (
                  initiales(infos.sousTitre || infos.titre)
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="d truncate text-[26px] font-bold" style={{ letterSpacing: "0.04em" }}>
                  {(infos.sousTitre ?? "").toUpperCase()}
                </span>
                {infos.creditPexels && (
                  <span className="text-[20px] text-[#545A6B]">Photo : {infos.creditPexels} / Pexels</span>
                )}
              </span>
              {estNouvelle(offreCourante) && (
                <span className="ml-auto flex h-12 items-center rounded-full bg-[#E3F4EC] px-[18px] text-[22px] font-bold text-[#0A5C39]">
                  Nouveau
                </span>
              )}
            </div>
            <h1 className="font-bold" style={{ fontSize: titreTaille, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {infos.titre}
            </h1>
            {infos.lieu && (
              <p className="flex items-center gap-3 text-[30px] text-[#3B4152]">
                <Ic n="pin" s={34} sw={2} />
                {infos.lieu}
              </p>
            )}
          </div>

          <dl className="m-0 grid grid-cols-2 gap-4">
            {tuiles.map((t) => (
              <div key={t.libelle} className="bc-carte flex gap-[18px] rounded-[28px] px-7 py-[26px]">
                <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[#E9EBFD] text-[#2B3BE0]">
                  <Ic n={t.icone} s={30} sw={2} />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <dt className="text-[22px] text-[#545A6B]">{t.libelle}</dt>
                  <dd className="d m-0 flex items-center gap-2.5 text-[32px] font-bold">
                    {t.point && <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: t.point }} />}
                    <span className="line-clamp-2">{t.valeur}</span>
                  </dd>
                  {t.detail && <dd className="m-0 text-[23px] text-[#3B4152]">{t.detail}</dd>}
                </div>
              </div>
            ))}
          </dl>

          {infos.description && (
            <section className="bc-carte flex flex-col gap-[18px] rounded-[28px] px-9 py-8">
              <h2 className="text-[34px] font-bold" style={{ letterSpacing: "-0.015em" }}>
                Le poste en quelques mots
              </h2>
              <p className="whitespace-pre-line text-[27px] text-[#262B3A]" style={{ lineHeight: 1.4 }}>
                {infos.description}
              </p>
            </section>
          )}

          {infos.commentPostuler && (
            <section className="flex flex-col gap-3 rounded-[28px] bg-[#E3F4EC] px-9 py-7">
              <h2 className="text-[30px] font-bold text-[#0A5C39]">Comment postuler ?</h2>
              <p className="whitespace-pre-line text-[27px] text-[#0F1A45]" style={{ lineHeight: 1.4 }}>
                {infos.commentPostuler}
              </p>
            </section>
          )}

          {offresFiltrees.length > 1 && (
            <div className="flex gap-4 pb-4">
              <button
                onClick={precedente}
                disabled={indexDetail === 0}
                className="bc-anneau flex h-20 grow items-center justify-center gap-3 rounded-full bg-white text-2xl font-bold disabled:opacity-30"
              >
                <Ic n="retour" s={28} sw={2.4} /> Offre précédente
              </button>
              <button
                onClick={suivante}
                disabled={indexDetail === offresFiltrees.length - 1}
                className="bc-anneau flex h-20 grow items-center justify-center gap-3 rounded-full bg-white text-2xl font-bold disabled:opacity-30"
              >
                Offre suivante <Ic n="fleche" s={28} sw={2.4} />
              </button>
            </div>
          )}
        </main>

        <div className="flex flex-col gap-3.5 px-12 pb-7 pt-6">
          {messageLimite && (
            <p role="alert" className="text-center text-[24px] font-bold text-[#B42318]">
              Vous avez déjà {MAX_SELECTION} offres sélectionnées.
            </p>
          )}
          {!sel ? (
            <>
              <button
                onClick={() => basculerSelection(offreCourante)}
                className="bc-vert flex h-[132px] w-full items-center justify-center gap-5 rounded-full"
              >
                <Ic n="coeur" s={46} sw={2.3} />
                <span className="d text-[44px] font-bold" style={{ letterSpacing: "0.01em" }}>
                  JE SUIS INTÉRESSÉ
                </span>
              </button>
              <p className="text-center text-[22px] text-[#545A6B]">
                L’offre est ajoutée à votre sélection. Vous la recevrez sur votre téléphone pour postuler.
              </p>
            </>
          ) : (
            <>
              <div className="flex gap-3.5">
                <button
                  onClick={() => basculerSelection(offreCourante)}
                  aria-label="Retirer de ma sélection"
                  className="flex h-[132px] grow items-center justify-center gap-3.5 rounded-full bg-[#E3F4EC] text-[30px] font-bold text-[#0A5C39] shadow-[inset_0_0_0_3px_#0E8A4A]"
                >
                  <Ic n="coche" s={40} sw={3} />
                  Ajoutée à ma sélection
                </button>
                <button
                  onClick={versCandidature}
                  className="bc-vert flex h-[132px] w-[420px] shrink-0 items-center justify-center gap-3.5 rounded-full text-[30px] font-bold"
                >
                  Recevoir mes {nbSelection} offre{nbSelection > 1 ? "s" : ""}
                  <Ic n="fleche" s={36} sw={2.4} />
                </button>
              </div>
              <p className="text-center text-[22px] text-[#545A6B]">
                Vous pouvez continuer à parcourir les offres et en ajouter d’autres.
              </p>
            </>
          )}
        </div>
        <BarreNav onRetour={() => setMode("offres")} labelRetour="Retour aux offres" onAccueil={revenirAAttente} />
      </>
    );
  } else if (mode === "candidature") {
    ecran = (
      <>
        <EnTete onAccueil={revenirAAttente} badge={{ texte: "Rien n’est gardé sur la borne", icone: "cadenas" }} />
        <main className="flex min-h-0 grow flex-col gap-[26px] overflow-y-auto px-12 pt-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-[64px] font-bold" style={{ lineHeight: 1.04, letterSpacing: "-0.035em" }}>
              Recevez vos <span className="text-[#0E8A4A]">{nbSelection} offre{nbSelection > 1 ? "s" : ""}</span>
              <br />
              sur votre téléphone
            </h1>
            <p className="text-[26px] text-[#3B4152]" style={{ lineHeight: 1.4 }}>
              Relisez-les tranquillement et postulez depuis chez vous, quand vous voulez.
            </p>
          </div>

          {offresSelectionnees.length > 0 ? (
            <ul className="bc-carte m-0 max-h-[196px] shrink-0 list-none overflow-y-auto rounded-[28px] p-0">
              {offresSelectionnees.map((o) => {
                const c = champsAffichage(o);
                return (
                  <li key={`${o.source}-${o.id}`} className="flex h-24 items-center gap-4 border-b-2 border-[#F1EEE6] pl-5 pr-3">
                    <Vignette
                      titre={c.titre}
                      sousTitre={c.sousTitre}
                      imageUrl={c.imageUrl}
                      estLogo={c.estLogo}
                      cle={o.id}
                      className="h-[60px] w-[60px] rounded-[14px]"
                    />
                    <span className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="truncate text-[25px] font-bold">{c.titre}</span>
                      <span className="flex items-center gap-2 text-[21px] text-[#545A6B]">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: couleurContrat(c.contratNom) }} />
                        <span className="truncate">
                          {[c.contratNom, c.sousTitre].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </span>
                    <button
                      onClick={() => basculerSelection(o)}
                      aria-label="Retirer cette offre"
                      className="flex h-16 items-center gap-2 rounded-full pl-3.5 pr-5 text-[21px] font-bold text-[#3B4152] shadow-[inset_0_0_0_2px_#E4E0D6]"
                    >
                      <Ic n="croix" s={24} sw={2.4} />
                      Retirer
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bc-carte flex flex-col items-center gap-5 rounded-[28px] px-8 py-10 text-center">
              <p className="text-[30px] font-bold">Votre sélection est vide.</p>
              <button
                onClick={() => setMode("offres")}
                className="flex h-20 items-center rounded-full bg-[#2B3BE0] px-8 text-2xl font-bold text-white"
              >
                Voir les offres
              </button>
            </div>
          )}

          <div className="flex items-stretch gap-4">
            <section className="bc-carte flex w-[420px] shrink-0 flex-col items-center gap-3.5 rounded-[28px] p-6 text-center">
              <span className="flex h-11 items-center gap-2 rounded-full bg-[#E9EBFD] px-5 text-[22px] font-bold text-[#1A249E]">
                Option 1
              </span>
              <h2 className="text-[30px] font-bold" style={{ lineHeight: 1.1 }}>
                Scannez ce code
              </h2>
              <div className="flex h-[264px] w-[264px] items-center justify-center rounded-3xl shadow-[inset_0_0_0_3px_#0F1A45]">
                {panierQr && nbSelection > 0 ? (
                  <QRCodeSVG value={panierQr.lien} size={224} fgColor="#0F1A45" />
                ) : (
                  <span className="px-6 text-[22px] text-[#545A6B]">
                    {nbSelection > 0 ? "QR code en préparation…" : "Aucune offre"}
                  </span>
                )}
              </div>
              <p className="text-[21px] text-[#545A6B]" style={{ lineHeight: 1.3 }}>
                Avec l’appareil photo de votre téléphone
              </p>
            </section>

            <div className="flex items-center text-[28px] font-bold text-[#545A6B]">OU</div>

            <section className="bc-carte flex min-w-0 grow flex-col gap-3.5 rounded-[28px] p-6">
              <span className="flex h-11 w-fit items-center gap-2 rounded-full bg-[#E9EBFD] px-5 text-[22px] font-bold text-[#1A249E]">
                Option 2
              </span>
              <h2 className="text-[30px] font-bold" style={{ lineHeight: 1.1 }}>
                Recevez-les par e-mail
              </h2>
              <div className="flex h-[92px] items-center gap-2.5 rounded-[24px] bg-white pl-5 pr-2.5 shadow-[inset_0_0_0_3px_#2B3BE0,0_0_0_6px_#E9EBFD]">
                <Ic n="envoyer" s={30} className="shrink-0 text-[#2B3BE0]" />
                <span role="textbox" aria-label="Votre adresse e-mail" className="flex min-w-0 grow items-center overflow-hidden whitespace-nowrap text-[27px] font-bold">
                  {email || <span className="font-normal text-[#8A867B]">prenom.nom@gmail.com</span>}
                </span>
                {emailValide && <Ic n="coche" s={32} sw={2.8} className="shrink-0 text-[#0E8A4A]" />}
                <button
                  onClick={() => setEmail("")}
                  aria-label="Effacer l’adresse"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F1EEE6]"
                >
                  <Ic n="croix" s={26} sw={2.4} />
                </button>
              </div>
              <p className="text-[21px] text-[#545A6B]" style={{ lineHeight: 1.3 }}>
                Tapez votre adresse sur le clavier ci-dessous, puis touchez « Envoyer ». Elle sert uniquement à vous envoyer ces offres.
              </p>
              {erreurPanier && (
                <p role="alert" className="text-[22px] font-bold text-[#B42318]">
                  {erreurPanier}
                </p>
              )}
            </section>
          </div>

          <Clavier mode="email" valeur={email} onChange={setEmail} />
        </main>

        <div className="flex flex-col gap-3 px-12 pb-[26px] pt-6">
          <div className="flex gap-3.5">
            <button
              onClick={revenirAAttente}
              className="flex h-[132px] w-[340px] shrink-0 items-center justify-center gap-3 rounded-full bg-white text-[28px] font-bold shadow-[inset_0_0_0_2px_#0F1A45]"
            >
              <Ic n="coche" s={34} sw={2.6} />
              J’ai scanné, terminer
            </button>
            <button
              onClick={envoyerPanier}
              disabled={!emailValide || envoiPanierEnCours || nbSelection === 0}
              className="bc-vert flex h-[132px] grow items-center justify-center gap-4 rounded-full disabled:opacity-40"
            >
              <Ic n="envoyer" s={42} />
              <span className="d text-[36px] font-bold" style={{ letterSpacing: "0.01em" }}>
                {envoiPanierEnCours ? "ENVOI EN COURS…" : "ENVOYER PAR E-MAIL"}
              </span>
            </button>
          </div>
          <p className="text-center text-[21px] text-[#545A6B]">
            Au choix : scannez le code, ou recevez le lien par e-mail. Rien n’est gardé sur la borne.
          </p>
        </div>
        <BarreNav onRetour={() => setMode("offres")} labelRetour="Ajouter d’autres offres" onAccueil={revenirAAttente} labelAccueil="Annuler" />
      </>
    );
  } else if (mode === "confirmation" && panierConfirmation) {
    const nb = nbSelection;
    ecran = (
      <>
        <EnTete onAccueil={revenirAAttente} badge={{ texte: "Données effacées de la borne", icone: "bouclier" }} />
        <main className="flex min-h-0 grow flex-col gap-10 overflow-y-auto px-12 pt-14">
          <div className="flex items-center gap-9">
            <div className="relative h-[148px] w-[148px] shrink-0">
              <span className="bc-halo absolute inset-0 rounded-full bg-[#0E8A4A]" />
              <span className="bc-pop absolute inset-0 flex items-center justify-center rounded-full bg-[#0E8A4A]">
                <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path className="bc-trace" d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="text-[96px] font-bold" style={{ lineHeight: 1, letterSpacing: "-0.04em" }}>
                C’est envoyé !
              </h1>
              <p className="text-[30px] text-[#262B3A]" style={{ lineHeight: 1.35 }}>
                Vos {nb} offre{nb > 1 ? "s" : ""} sont dans votre boîte mail : {masquerEmail(panierConfirmation.email)}
              </p>
            </div>
          </div>

          <section className="flex items-center gap-10 rounded-[36px] bg-white p-10 shadow-[0_1px_0_#E4E0D6,0_16px_40px_rgba(15,26,69,0.1)]">
            <div className="flex h-[340px] w-[340px] shrink-0 items-center justify-center rounded-3xl shadow-[inset_0_0_0_3px_#0F1A45]">
              <QRCodeSVG value={panierConfirmation.lien} size={290} fgColor="#0F1A45" />
            </div>
            <div className="flex flex-col gap-[22px]">
              <h2 className="text-[40px] font-bold" style={{ lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                Ouvrez vos offres maintenant
              </h2>
              <ol className="m-0 flex list-none flex-col gap-4 p-0 text-[25px]" style={{ lineHeight: 1.3 }}>
                {["Ouvrez l’appareil photo de votre téléphone", "Visez ce code", "Touchez le lien qui apparaît"].map((t, k) => (
                  <li key={t} className="flex items-center gap-4">
                    <span className="d flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E9EBFD] text-2xl font-bold text-[#2B3BE0]">
                      {k + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="flex flex-col gap-[18px]">
            <h2 className="text-[32px] font-bold" style={{ letterSpacing: "-0.01em" }}>
              Et ensuite, sur votre téléphone
            </h2>
            <div className="grid grid-cols-3 gap-3.5">
              {[
                { icone: "doc" as const, titre: `Relisez vos ${nb} offre${nb > 1 ? "s" : ""}`, texte: "Elles vous attendent dans l’e-mail reçu.", vert: false },
                { icone: "envoyer" as const, titre: "Postulez en un geste", texte: "Chaque offre explique comment postuler.", vert: true },
                { icone: "personne" as const, titre: "Besoin d’aide ?", texte: "Demandez conseil à l’accueil du lieu.", vert: false },
              ].map((c) => (
                <div key={c.titre} className="bc-carte flex flex-col gap-3.5 rounded-[26px] p-[26px]">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: c.vert ? "#E3F4EC" : "#E9EBFD", color: c.vert ? "#0E8A4A" : "#2B3BE0" }}
                  >
                    <Ic n={c.icone} s={28} sw={2} />
                  </span>
                  <p className="text-[25px] font-bold" style={{ lineHeight: 1.25 }}>{c.titre}</p>
                  <p className="text-[21px] text-[#545A6B]" style={{ lineHeight: 1.35 }}>{c.texte}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <div className="flex gap-3.5 px-12 pb-7 pt-6">
          <button
            onClick={() => {
              setSelection([]);
              setPanierConfirmation(null);
              allerAuxOffres();
            }}
            className="bc-vert flex h-[132px] grow items-center justify-center gap-[18px] rounded-full"
          >
            <Ic n="loupe" s={44} sw={2.4} />
            <span className="d text-[38px] font-bold" style={{ letterSpacing: "0.01em" }}>
              VOIR D’AUTRES OFFRES
            </span>
          </button>
          <button
            onClick={revenirAAttente}
            className="box-border flex h-[132px] w-[300px] shrink-0 items-center gap-4 rounded-full bg-white pl-5 pr-[26px] shadow-[inset_0_0_0_2px_#0F1A45]"
          >
            <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
              <circle cx="32" cy="32" r="27" fill="none" stroke="#E4E0D6" strokeWidth="6" />
              <circle
                cx="32" cy="32" r="27" fill="none" stroke="#0F1A45" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(169.6 * Math.max(secondes, 0)) / DELAI_CONFIRMATION_S} 170`}
                transform="rotate(-90 32 32)"
              />
              <text x="32" y="41" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0F1A45">
                {Math.max(secondes, 0)}
              </text>
            </svg>
            <span className="flex flex-col gap-0.5">
              <span className="text-[30px] font-bold">Terminer</span>
              <span className="text-xl text-[#545A6B]">Accueil dans {Math.max(secondes, 0)} s</span>
            </span>
          </button>
        </div>
        <BarreNav onAccueil={revenirAAttente} />
      </>
    );
  } else {
    ecran = (
      <>
        <EnTete onAccueil={revenirAAttente} />
        <main className="flex grow flex-col items-center justify-center gap-6 px-12 text-center">
          <p className="text-[40px] font-bold">Aucune offre disponible pour le moment.</p>
          <button
            onClick={revenirAAttente}
            className="bc-vert flex h-[110px] items-center rounded-full px-12 text-[32px] font-bold"
          >
            Retour à l’accueil
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Scene onActivite={reinitialiserInactivite}>{ecran}</Scene>

      <button
        onClick={onTapLogo}
        aria-hidden="true"
        tabIndex={-1}
        className="fixed bottom-0 right-0 z-40 h-14 w-14 bg-transparent"
      ></button>

      {codeSortieOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <form
            onSubmit={validerCodeSortie}
            className="flex w-full max-w-xs flex-col gap-4 rounded-3xl bg-white p-8"
          >
            <p className="text-lg font-bold">Code de sortie</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={codeSortieValeur}
              onChange={(e) => {
                setCodeSortieValeur(e.target.value);
                setCodeSortieErreur(false);
              }}
              className="rounded-2xl border-2 border-black/20 px-4 py-3 text-center text-xl"
            />
            {codeSortieErreur && <p className="text-sm text-red-600">Code incorrect.</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCodeSortieOuvert(false)}
                className="min-h-[48px] flex-1 rounded-2xl border-2 border-[#0F1A45] font-bold"
              >
                Annuler
              </button>
              <button type="submit" className="min-h-[48px] flex-1 rounded-2xl bg-[#0E8A4A] font-bold text-white">
                Valider
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
