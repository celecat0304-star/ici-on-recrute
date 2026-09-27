"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type OffreCommercantAdmin = {
  id: string;
  nom_commerce: string;
  poste: string;
  type_contrat: string;
  temps_travail: string | null;
  horaires: string | null;
  quartier: string | null;
  description: string | null;
  comment_postuler: string;
  siret: string | null;
  created_at: string;
  ville_nom: string;
  image_url: string | null;
  image_source: string | null;
  pexels_photographe: string | null;
};

type Action = "publier" | "publier_sans_image" | "refuser";

export default function AdminOffresList({
  offres,
}: {
  offres: OffreCommercantAdmin[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);

  const agir = async (id: string, action: Action) => {
    let motif: string | null = null;
    if (action === "refuser") {
      motif = window.prompt("Motif du refus (optionnel) :") ?? "";
    }
    setEnCours(id);
    const res = await fetch(`/api/admin/offres/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, motif }),
    });
    setEnCours(null);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Une erreur est survenue.");
    }
  };

  if (offres.length === 0) {
    return <p className="text-lg opacity-70">Aucune offre en attente.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {offres.map((offre) => (
        <div
          key={offre.id}
          className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="font-title text-xl font-bold">
              {offre.poste} — {offre.nom_commerce}
            </h2>
            <span className="text-sm opacity-60">{offre.ville_nom}</span>
          </div>
          <p className="text-sm opacity-70">
            {[offre.type_contrat, offre.temps_travail, offre.horaires, offre.quartier]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {offre.image_url && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={offre.image_url}
                alt=""
                className="max-w-xs max-h-48 object-cover rounded-lg"
              />
              {offre.image_source === "pexels" && offre.pexels_photographe && (
                <p className="text-xs opacity-60 mt-1">
                  Photo : {offre.pexels_photographe} / Pexels
                </p>
              )}
            </div>
          )}
          {offre.description && <p>{offre.description}</p>}
          <p className="text-sm">
            <strong>Comment postuler :</strong> {offre.comment_postuler}
          </p>
          {offre.siret && (
            <p className="text-sm opacity-70">SIRET : {offre.siret}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-3">
            <button
              onClick={() => agir(offre.id, "publier")}
              disabled={enCours === offre.id}
              className="min-h-[48px] px-6 rounded-lg bg-vert text-white font-bold"
            >
              Publier
            </button>
            {offre.image_url && (
              <button
                onClick={() => agir(offre.id, "publier_sans_image")}
                disabled={enCours === offre.id}
                className="min-h-[48px] px-6 rounded-lg border-2 border-vert text-vert font-bold"
              >
                Publier sans l&apos;image
              </button>
            )}
            <button
              onClick={() => agir(offre.id, "refuser")}
              disabled={enCours === offre.id}
              className="min-h-[48px] px-6 rounded-lg border-2 border-red-600 text-red-600 font-bold"
            >
              Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
