"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type OffrePublieeAdmin = {
  id: string;
  nom_commerce: string;
  poste: string;
  date_expiration: string | null;
  ville_nom: string;
  categorie: "commercant" | "entreprise";
  abonnement_actif: boolean;
};

export default function OffresPublieesListe({
  offres,
}: {
  offres: OffrePublieeAdmin[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);

  const agir = async (
    id: string,
    action: "retirer" | "renouveler" | "activer_abonnement" | "desactiver_abonnement"
  ) => {
    setEnCours(id);
    const res = await fetch(`/api/admin/offres/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setEnCours(null);
    if (res.ok) router.refresh();
    else alert("Une erreur est survenue.");
  };

  if (offres.length === 0) {
    return <p className="text-lg opacity-70">Aucune offre publiée.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {offres.map((offre) => (
        <div
          key={offre.id}
          className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <p className="font-bold">
              {offre.poste} — {offre.nom_commerce}
              {offre.categorie === "entreprise" && (
                <span className="ml-2 bg-vert text-white text-xs font-bold px-2 py-1 rounded-full align-middle">
                  Grande entreprise
                </span>
              )}
            </p>
            <p className="text-sm opacity-60">
              {offre.ville_nom} · expire le{" "}
              {offre.date_expiration
                ? new Date(offre.date_expiration).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {offre.categorie === "entreprise" && (
              <button
                onClick={() =>
                  agir(
                    offre.id,
                    offre.abonnement_actif ? "desactiver_abonnement" : "activer_abonnement"
                  )
                }
                disabled={enCours === offre.id}
                className={
                  "min-h-[40px] px-4 rounded-lg font-bold text-sm " +
                  (offre.abonnement_actif
                    ? "bg-jaune text-texte"
                    : "border-2 border-jaune text-texte")
                }
              >
                {offre.abonnement_actif ? "Abonnement actif ✓" : "Activer l'abonnement"}
              </button>
            )}
            <button
              onClick={() => agir(offre.id, "renouveler")}
              disabled={enCours === offre.id}
              className="min-h-[40px] px-4 rounded-lg border-2 border-vert text-vert font-bold text-sm"
            >
              Renouveler 30 jours
            </button>
            <button
              onClick={() => agir(offre.id, "retirer")}
              disabled={enCours === offre.id}
              className="min-h-[40px] px-4 rounded-lg border-2 border-red-600 text-red-600 font-bold text-sm"
            >
              Retirer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
