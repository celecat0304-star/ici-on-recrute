"use client";

import { useEffect, useState } from "react";
import PhotoChooser, { type SelectionPhoto } from "./PhotoChooser";

const CONTRATS = ["CDI", "CDD", "Saisonnier", "Extra", "Apprentissage"];

export default function CommercantForm({
  villes,
}: {
  villes: { id: string; nom: string }[];
}) {
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [description, setDescription] = useState("");
  const [poste, setPoste] = useState("");
  const [selectionPhoto, setSelectionPhoto] = useState<SelectionPhoto>({
    sourceImage: "aucune",
  });

  const [captcha, setCaptcha] = useState<{ a: number; b: number } | null>(
    null
  );

  useEffect(() => {
    setCaptcha({
      a: Math.ceil(Math.random() * 8),
      b: Math.ceil(Math.random() * 8),
    });
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!captcha) return;
    setErreur("");
    setEnvoiEnCours(true);

    const donnees = new FormData(e.currentTarget);
    const payload = {
      nomCommerce: donnees.get("nomCommerce"),
      villeId: donnees.get("villeId"),
      poste: donnees.get("poste"),
      typeContrat: donnees.get("typeContrat"),
      tempsTravail: donnees.get("tempsTravail"),
      horaires: donnees.get("horaires"),
      quartier: donnees.get("quartier"),
      description: donnees.get("description"),
      commentPostuler: donnees.get("commentPostuler"),
      emailContact: donnees.get("emailContact"),
      siret: donnees.get("siret"),
      siteWeb: donnees.get("siteWeb"),
      captchaA: captcha.a,
      captchaB: captcha.b,
      captchaReponse: donnees.get("captchaReponse"),
      ...selectionPhoto,
    };

    const res = await fetch("/api/commercant/deposer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setEnvoiEnCours(false);

    if (res.ok) {
      setEnvoye(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error ?? "Une erreur est survenue, merci de réessayer.");
    }
  };

  if (envoye) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center flex flex-col gap-3">
        <h2 className="font-title text-2xl font-bold text-vert">
          Merci !
        </h2>
        <p className="text-lg">
          Votre offre a bien été envoyée. Elle sera vérifiée puis publiée sous
          peu sur les bornes et le site emploi de votre ville.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl shadow p-8 flex flex-col gap-4"
    >
      <Champ label="Nom du commerce" required>
        <input name="nomCommerce" required className="input" />
      </Champ>

      <Champ label="Ville" required>
        <select name="villeId" required className="input">
          <option value="">Choisissez une ville</option>
          {villes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nom}
            </option>
          ))}
        </select>
      </Champ>

      <Champ label="Poste" required>
        <input
          name="poste"
          required
          value={poste}
          onChange={(e) => setPoste(e.target.value)}
          className="input"
        />
      </Champ>

      <Champ label="Contrat" required>
        <select name="typeContrat" required className="input">
          <option value="">Choisissez un contrat</option>
          {CONTRATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Champ>

      <Champ label="Temps de travail">
        <input
          name="tempsTravail"
          placeholder="Ex : Temps plein, Temps partiel"
          className="input"
        />
      </Champ>

      <Champ label="Horaires">
        <input name="horaires" placeholder="Ex : 9h-12h / 14h-18h" className="input" />
      </Champ>

      <Champ label="Quartier">
        <input name="quartier" className="input" />
      </Champ>

      <Champ label="Description" required>
        <textarea
          name="description"
          required
          maxLength={400}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
        <p className="text-sm opacity-60 text-right">
          {description.length}/400
        </p>
      </Champ>

      <Champ label="Comment postuler ?" required>
        <input
          name="commentPostuler"
          required
          placeholder="Ex : venir déposer un CV sur place, téléphoner au..."
          className="input"
        />
      </Champ>

      <Champ label="E-mail pour recevoir les candidatures en ligne" required>
        <input
          name="emailContact"
          type="email"
          required
          placeholder="vous@votre-commerce.fr"
          className="input"
        />
      </Champ>

      <Champ label="Numéro de SIRET (si vous l'avez)">
        <input name="siret" placeholder="14 chiffres" className="input" />
      </Champ>

      <PhotoChooser poste={poste} onChange={setSelectionPhoto} />

      <div className="hidden" aria-hidden="true">
        <label>
          Ne pas remplir
          <input name="siteWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {captcha && (
        <Champ
          label={`Anti-robot : combien font ${captcha.a} + ${captcha.b} ?`}
          required
        >
          <input
            name="captchaReponse"
            type="number"
            required
            className="input"
          />
        </Champ>
      )}

      {erreur && <p className="text-red-600">{erreur}</p>}

      <button
        type="submit"
        disabled={envoiEnCours}
        className="min-h-[56px] rounded-xl bg-vert text-white text-lg font-bold mt-2"
      >
        {envoiEnCours ? "Envoi..." : "Envoyer l'offre"}
      </button>

      <style jsx>{`
        .input {
          border: 2px solid rgba(30, 90, 64, 0.3);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          width: 100%;
          font-size: 1rem;
          min-height: 48px;
        }
      `}</style>
    </form>
  );
}

function Champ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 font-bold">
      <span>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}
