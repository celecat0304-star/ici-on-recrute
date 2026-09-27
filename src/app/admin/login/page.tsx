"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motDePasse }),
    });
    setEnvoi(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setErreur("Mot de passe incorrect.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-fond text-texte px-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="font-title text-2xl font-bold">Administration</h1>
        <label className="flex flex-col gap-1">
          <span>Mot de passe</span>
          <input
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="border-2 border-vert/30 rounded-lg px-3 py-2 min-h-[48px]"
            autoFocus
          />
        </label>
        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        <button
          type="submit"
          disabled={envoi}
          className="min-h-[48px] rounded-lg bg-vert text-white font-bold"
        >
          {envoi ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
