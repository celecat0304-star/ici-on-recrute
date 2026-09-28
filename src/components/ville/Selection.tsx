"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { Ic } from "@/components/borne/BorneComposants";

export type ElementSelection = { source: "commercant" | "france_travail"; id: string };

const MAX_SELECTION = 10;
const EVENEMENT = "selection-maj";

function lire(slug: string): ElementSelection[] {
  try {
    const v = localStorage.getItem(`selection-${slug}`);
    return v ? (JSON.parse(v) as ElementSelection[]) : [];
  } catch {
    return [];
  }
}

function ecrire(slug: string, liste: ElementSelection[]) {
  try {
    localStorage.setItem(`selection-${slug}`, JSON.stringify(liste));
  } catch {
    // stockage indisponible (navigation privée) : la sélection ne survivra pas au rechargement
  }
  window.dispatchEvent(new Event(EVENEMENT));
}

// Sélection d'offres mémorisée sur le téléphone du candidat, partagée entre la liste, les fiches et la barre du bas.
export function useSelection(slug: string, villeId: string) {
  const [liste, setListe] = useState<ElementSelection[]>([]);
  const supabase = useMemo(() => createPublicClient(), []);

  useEffect(() => {
    const maj = () => setListe(lire(slug));
    maj();
    window.addEventListener(EVENEMENT, maj);
    window.addEventListener("storage", maj);
    return () => {
      window.removeEventListener(EVENEMENT, maj);
      window.removeEventListener("storage", maj);
    };
  }, [slug]);

  const contient = (o: ElementSelection) =>
    liste.some((s) => s.source === o.source && s.id === o.id);

  const basculer = (o: ElementSelection): "ajoutee" | "retiree" | "limite" => {
    const actuelle = lire(slug);
    if (actuelle.some((s) => s.source === o.source && s.id === o.id)) {
      ecrire(slug, actuelle.filter((s) => !(s.source === o.source && s.id === o.id)));
      return "retiree";
    }
    if (actuelle.length >= MAX_SELECTION) return "limite";
    ecrire(slug, [...actuelle, o]);
    supabase
      .from("evenements")
      .insert({ type: "selection", origine: "site", ville_id: villeId, offre_type: o.source, offre_id: o.id })
      .then(() => {});
    return "ajoutee";
  };

  const vider = () => ecrire(slug, []);

  return { liste, contient, basculer, vider };
}

export function BoutonInteresse({
  slug,
  villeId,
  offre,
  variante = "rond",
}: {
  slug: string;
  villeId: string;
  offre: ElementSelection;
  variante?: "rond" | "large";
}) {
  const { contient, basculer } = useSelection(slug, villeId);
  const actif = contient(offre);

  const clic = () => {
    if (basculer(offre) === "limite") {
      window.alert("Vous pouvez sélectionner 10 offres au maximum. Retirez-en une pour en ajouter une autre.");
    }
  };

  if (variante === "large") {
    return (
      <button
        onClick={clic}
        aria-pressed={actif}
        className={
          "flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold " +
          (actif
            ? "bg-[#E3F4EC] text-[#0A5C39] shadow-[inset_0_0_0_3px_#0E8A4A]"
            : "bg-white text-[#0E8A4A] shadow-[inset_0_0_0_2px_#0E8A4A]")
        }
      >
        <Ic n={actif ? "coche" : "coeur"} s={24} sw={2.6} />
        {actif ? "Dans ma sélection" : "Ça m’intéresse : l’ajouter à ma sélection"}
      </button>
    );
  }

  return (
    <button
      onClick={clic}
      aria-pressed={actif}
      aria-label={actif ? "Retirer de ma sélection" : "Ajouter à ma sélection"}
      className={
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full " +
        (actif ? "bg-[#0E8A4A] text-white" : "bg-[#F1EEE6] text-[#0E8A4A]")
      }
    >
      <Ic n={actif ? "coche" : "coeur"} s={22} sw={2.4} />
    </button>
  );
}

export function BarreSelection({ slug, villeId }: { slug: string; villeId: string }) {
  const { liste, vider } = useSelection(slug, villeId);
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  if (liste.length === 0) return null;

  // Le panier est créé à ce moment-là : il porte le lien et la candidature commune
  const postuler = async () => {
    setErreur("");
    setEnvoi(true);
    try {
      const res = await fetch("/api/panier/creer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villeId, offres: liste }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.panierId) {
        vider();
        router.push(`/panier/${data.panierId}`);
      } else {
        setErreur(data.error ?? "Une erreur est survenue, merci de réessayer.");
      }
    } catch {
      setErreur("Connexion impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
    <div className="h-20" aria-hidden="true" />
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0F1A45] px-4 py-3 text-white shadow-[0_-8px_24px_rgba(15,26,69,0.25)]">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-bold">
            <Ic n="coeur" s={20} rempli />
            {liste.length} offre{liste.length > 1 ? "s" : ""} sélectionnée{liste.length > 1 ? "s" : ""}
          </p>
          {erreur ? (
            <p role="alert" className="text-sm text-[#FFB4AB]">
              {erreur}
            </p>
          ) : (
            <button onClick={vider} className="text-sm text-white/80 underline">
              Tout retirer
            </button>
          )}
        </div>
        <button
          onClick={postuler}
          disabled={envoi}
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#0E8A4A] px-5 text-base font-bold text-white disabled:opacity-60"
        >
          {envoi ? "Un instant…" : "Postuler"}
          <Ic n="fleche" s={20} sw={2.4} />
        </button>
      </div>
    </div>
    </>
  );
}
