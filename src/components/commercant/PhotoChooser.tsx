"use client";

import { useEffect, useState } from "react";
import { compresserImage } from "@/lib/compressImage";
import type { PhotoPexels } from "@/lib/pexels";

export type SelectionPhoto =
  | { sourceImage: "aucune" }
  | { sourceImage: "upload"; photoBase64: string; consentementPhoto: boolean }
  | {
      sourceImage: "pexels";
      pexelsUrl: string;
      pexelsPhotographe: string;
      pexelsLienPhoto: string;
    };

export default function PhotoChooser({
  poste,
  onChange,
}: {
  poste: string;
  onChange: (selection: SelectionPhoto) => void;
}) {
  const [mode, setMode] = useState<"aucune" | "upload" | "pexels">("aucune");
  const [apercu, setApercu] = useState<string | null>(null);
  const [consentement, setConsentement] = useState(false);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreurPexels, setErreurPexels] = useState("");
  const [photosPexels, setPhotosPexels] = useState<PhotoPexels[]>([]);
  const [photoChoisie, setPhotoChoisie] = useState<PhotoPexels | null>(null);

  useEffect(() => {
    if (mode === "aucune") {
      onChange({ sourceImage: "aucune" });
    } else if (mode === "upload" && apercu) {
      onChange({ sourceImage: "upload", photoBase64: apercu, consentementPhoto: consentement });
    } else if (mode === "pexels" && photoChoisie) {
      onChange({
        sourceImage: "pexels",
        pexelsUrl: photoChoisie.url,
        pexelsPhotographe: photoChoisie.photographe,
        pexelsLienPhoto: photoChoisie.lienPexels,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, apercu, consentement, photoChoisie]);

  const onFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    const dataUrl = await compresserImage(fichier);
    setApercu(dataUrl);
  };

  const chercherPhotos = async () => {
    setErreurPexels("");
    setRechercheEnCours(true);
    setPhotosPexels([]);
    setPhotoChoisie(null);
    try {
      const res = await fetch(
        `/api/pexels/rechercher?poste=${encodeURIComponent(poste)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de recherche");
      setPhotosPexels(data.photos);
    } catch (err) {
      setErreurPexels((err as Error).message);
    } finally {
      setRechercheEnCours(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-bold">Photo de l&apos;annonce</span>
      <div className="flex flex-wrap gap-4">
        {(
          [
            ["aucune", "Sans photo"],
            ["upload", "Une photo de mon commerce"],
            ["pexels", "Une photo Pexels"],
          ] as const
        ).map(([valeur, libelle]) => (
          <label key={valeur} className="flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="modePhoto"
              checked={mode === valeur}
              onChange={() => setMode(valeur)}
            />
            {libelle}
          </label>
        ))}
      </div>

      {mode === "upload" && (
        <div className="flex flex-col gap-3">
          <input type="file" accept="image/*" onChange={onFichier} />
          {apercu && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu} alt="Aperçu" className="max-w-xs rounded-lg" />
          )}
          <label className="flex items-start gap-2 font-normal text-sm">
            <input
              type="checkbox"
              required={mode === "upload"}
              checked={consentement}
              onChange={(e) => setConsentement(e.target.checked)}
              className="mt-1"
            />
            Cette photo m&apos;appartient et les personnes visibles ont donné
            leur accord pour apparaître sur l&apos;annonce.
          </label>
        </div>
      )}

      {mode === "pexels" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={chercherPhotos}
            disabled={!poste || rechercheEnCours}
            className="min-h-[48px] px-6 rounded-lg border-2 border-vert text-vert font-bold self-start disabled:opacity-40"
          >
            {rechercheEnCours ? "Recherche..." : "Chercher des photos"}
          </button>
          {!poste && (
            <p className="text-sm opacity-60">
              Renseignez d&apos;abord le poste ci-dessus.
            </p>
          )}
          {erreurPexels && <p className="text-red-600 text-sm">{erreurPexels}</p>}
          {photosPexels.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photosPexels.map((photo) => (
                <button
                  type="button"
                  key={photo.url}
                  onClick={() => setPhotoChoisie(photo)}
                  className={
                    "rounded-lg overflow-hidden border-4 " +
                    (photoChoisie?.url === photo.url
                      ? "border-vert"
                      : "border-transparent")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="w-full h-24 object-cover" />
                </button>
              ))}
            </div>
          )}
          {photoChoisie && (
            <p className="text-sm opacity-70">
              Photo : {photoChoisie.photographe} / Pexels
            </p>
          )}
        </div>
      )}
    </div>
  );
}
