"use client";

import { useEffect, useState } from "react";

export default function HeaderHorloge() {
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  useEffect(() => {
    setMaintenant(new Date());
    const intervalle = setInterval(() => setMaintenant(new Date()), 30_000);
    return () => clearInterval(intervalle);
  }, []);

  if (!maintenant) return null;

  const date = maintenant.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const heure = maintenant.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="text-right">
      <p className="text-sm font-bold capitalize">{date}</p>
      <p className="text-xl font-bold text-vert">{heure}</p>
    </div>
  );
}
