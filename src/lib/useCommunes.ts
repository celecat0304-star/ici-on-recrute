"use client";

import { useEffect, useState } from "react";

export type CommuneSuggeree = {
  nom: string;
  codePostal: string;
  latitude: number;
  longitude: number;
};

// Cherche des communes par nom ou code postal (API officielle, sans clé).
export function useCommunes(saisie: string) {
  const [suggestions, setSuggestions] = useState<CommuneSuggeree[]>([]);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const q = saisie.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setEnCours(false);
      return;
    }
    let annule = false;
    const minuteur = setTimeout(async () => {
      setEnCours(true);
      try {
        const critere = /^\d{5}$/.test(q) ? `codePostal=${q}` : `nom=${encodeURIComponent(q)}`;
        const res = await fetch(
          `https://geo.api.gouv.fr/communes?${critere}&fields=nom,centre,codesPostaux&boost=population&limit=5`
        );
        const data = res.ok
          ? ((await res.json()) as {
              nom: string;
              codesPostaux?: string[];
              centre?: { coordinates: [number, number] };
            }[])
          : [];
        if (annule) return;
        setSuggestions(
          data
            .filter((c) => c.centre?.coordinates)
            .map((c) => ({
              nom: c.nom,
              codePostal: c.codesPostaux?.[0] ?? "",
              latitude: c.centre!.coordinates[1],
              longitude: c.centre!.coordinates[0],
            }))
        );
      } catch {
        if (!annule) setSuggestions([]);
      } finally {
        if (!annule) setEnCours(false);
      }
    }, 300);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [saisie]);

  return { suggestions, enCours };
}
