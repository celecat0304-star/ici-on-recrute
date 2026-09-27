"use client";

export default function BoutonImprimer() {
  return (
    <button
      onClick={() => window.print()}
      className="min-h-[44px] px-5 rounded-lg bg-vert text-white font-bold text-sm print:hidden"
    >
      Imprimer / Exporter en PDF
    </button>
  );
}
