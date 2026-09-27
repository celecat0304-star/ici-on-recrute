"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type VilleAvecDetails = {
  id: string;
  nom: string;
  slug: string;
  code_postal: string;
  code_insee: string | null;
  rayon_recherche_km: number;
  bornes: { id: string; nom: string; lieu: string }[];
  aUnCompteMairie: boolean;
};

export default function VillesManager({
  villes,
}: {
  villes: VilleAvecDetails[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <NouvelleVille />
      <div className="flex flex-col gap-6">
        {villes.map((ville) => (
          <VilleCarte key={ville.id} ville={ville} />
        ))}
      </div>
    </div>
  );
}

function NouvelleVille() {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    const donnees = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/villes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: donnees.get("nom"),
        codePostal: donnees.get("codePostal"),
        codeInsee: donnees.get("codeInsee"),
        rayonRechercheKm: donnees.get("rayonRechercheKm"),
      }),
    });
    setEnvoi(false);
    if (res.ok) {
      e.currentTarget.reset();
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error ?? "Erreur");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl shadow p-6 flex flex-col gap-3"
    >
      <h2 className="font-title text-xl font-bold">Ajouter une ville</h2>
      <div className="grid grid-cols-2 gap-3">
        <input name="nom" placeholder="Nom de la ville" required className="input" />
        <input name="codePostal" placeholder="Code postal" required className="input" />
        <input name="codeInsee" placeholder="Code INSEE (pour France Travail)" className="input" />
        <input
          name="rayonRechercheKm"
          type="number"
          placeholder="Rayon de recherche (km)"
          defaultValue={10}
          className="input"
        />
      </div>
      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
      <button
        type="submit"
        disabled={envoi}
        className="self-start min-h-[44px] px-6 rounded-lg bg-vert text-white font-bold"
      >
        {envoi ? "Ajout..." : "Ajouter la ville"}
      </button>
      <style jsx>{`
        .input {
          border: 2px solid rgba(30, 90, 64, 0.3);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
        }
      `}</style>
    </form>
  );
}

function VilleCarte({ ville }: { ville: VilleAvecDetails }) {
  const router = useRouter();
  const [ajoutBorneOuvert, setAjoutBorneOuvert] = useState(false);
  const [envoiBorne, setEnvoiBorne] = useState(false);
  const [ajoutMairieOuvert, setAjoutMairieOuvert] = useState(false);
  const [envoiMairie, setEnvoiMairie] = useState(false);
  const [identifiantsMairie, setIdentifiantsMairie] = useState<{
    email: string;
    motDePasse: string;
  } | null>(null);
  const [erreur, setErreur] = useState("");
  const [syncEnCours, setSyncEnCours] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const synchroniser = async () => {
    setErreur("");
    setSyncMessage("");
    setSyncEnCours(true);
    const res = await fetch(`/api/admin/villes/${ville.id}/synchroniser`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setSyncEnCours(false);
    if (res.ok) {
      setSyncMessage(`${data.nombre} offre(s) récupérée(s).`);
      router.refresh();
    } else {
      setErreur(data.error ?? "Erreur");
    }
  };

  const ajouterBorne = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur("");
    setEnvoiBorne(true);
    const donnees = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/bornes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        villeId: ville.id,
        nom: donnees.get("nom"),
        lieu: donnees.get("lieu"),
      }),
    });
    setEnvoiBorne(false);
    if (res.ok) {
      setAjoutBorneOuvert(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error ?? "Erreur");
    }
  };

  const creerCompteMairie = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur("");
    setEnvoiMairie(true);
    const donnees = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/comptes-mairie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ villeId: ville.id, email: donnees.get("email") }),
    });
    const data = await res.json().catch(() => ({}));
    setEnvoiMairie(false);
    if (res.ok) {
      setIdentifiantsMairie({ email: data.email, motDePasse: data.motDePasse });
      setAjoutMairieOuvert(false);
      router.refresh();
    } else {
      setErreur(data.error ?? "Erreur");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-title text-xl font-bold">{ville.nom}</h2>
        <a
          href={`/ville/${ville.slug}`}
          target="_blank"
          className="text-sm underline opacity-70"
        >
          Voir le site public
        </a>
      </div>
      <p className="text-sm opacity-70">
        {ville.code_postal}
        {ville.code_insee ? ` · INSEE ${ville.code_insee}` : " · pas de code INSEE (import France Travail désactivé)"}
        {" · rayon "}
        {ville.rayon_recherche_km} km
      </p>

      {ville.code_insee && (
        <div className="flex items-center gap-3">
          <button
            onClick={synchroniser}
            disabled={syncEnCours}
            className="min-h-[40px] px-4 rounded-lg border-2 border-vert text-vert font-bold text-sm self-start"
          >
            {syncEnCours ? "Récupération..." : "Récupérer les offres France Travail maintenant"}
          </button>
          {syncMessage && <span className="text-sm opacity-70">{syncMessage}</span>}
        </div>
      )}

      <div>
        <p className="font-bold mb-1">Bornes ({ville.bornes.length})</p>
        <ul className="flex flex-col gap-1">
          {ville.bornes.map((b) => (
            <li key={b.id} className="text-sm">
              {b.nom} — {b.lieu}{" "}
              <a
                href={`/borne/${b.id}`}
                target="_blank"
                className="underline opacity-60"
              >
                ouvrir
              </a>
            </li>
          ))}
        </ul>
        {ajoutBorneOuvert ? (
          <form onSubmit={ajouterBorne} className="flex flex-wrap gap-2 mt-2">
            <input name="nom" placeholder="Nom de la borne" required className="input" />
            <input name="lieu" placeholder="Lieu" required className="input" />
            <button
              type="submit"
              disabled={envoiBorne}
              className="min-h-[40px] px-4 rounded-lg bg-vert text-white font-bold text-sm"
            >
              Ajouter
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAjoutBorneOuvert(true)}
            className="text-sm underline mt-2"
          >
            + Ajouter une borne
          </button>
        )}
      </div>

      <div>
        <p className="font-bold mb-1">Compte mairie</p>
        {ville.aUnCompteMairie ? (
          <p className="text-sm opacity-70">Un compte existe déjà.</p>
        ) : identifiantsMairie ? (
          <div className="text-sm bg-jaune/20 border border-jaune rounded-lg p-3">
            <p>Compte créé ! Note bien ces identifiants (affichés une seule fois) :</p>
            <p className="font-bold mt-1">{identifiantsMairie.email}</p>
            <p className="font-bold">{identifiantsMairie.motDePasse}</p>
          </div>
        ) : ajoutMairieOuvert ? (
          <form onSubmit={creerCompteMairie} className="flex flex-wrap gap-2">
            <input
              name="email"
              type="email"
              placeholder="E-mail de la mairie"
              required
              className="input"
            />
            <button
              type="submit"
              disabled={envoiMairie}
              className="min-h-[40px] px-4 rounded-lg bg-vert text-white font-bold text-sm"
            >
              Créer le compte
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAjoutMairieOuvert(true)}
            className="text-sm underline"
          >
            + Créer un compte mairie
          </button>
        )}
      </div>

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

      <style jsx>{`
        .input {
          border: 2px solid rgba(30, 90, 64, 0.3);
          border-radius: 0.5rem;
          padding: 0.4rem 0.6rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
