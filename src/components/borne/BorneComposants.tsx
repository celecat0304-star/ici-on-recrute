"use client";

import { useEffect, useState } from "react";
import { imageIllustration } from "@/lib/imagesThemes";

const ICONES = {
  coeur: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  retour: <path d="M19 12H5M11 6l-6 6 6 6" />,
  fleche: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  bas: <path d="M12 5v14M6 13l6 6 6-6" />,
  loupe: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  calendrier: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  horloge: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  coche: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  croix: <path d="M6 6l12 12M18 6L6 18" />,
  maison: (
    <>
      <path d="M4 10.5L12 4l8 6.5V20H4z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  cadenas: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  bouclier: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  envoyer: (
    <>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </>
  ),
  personne: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  etoile: <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z" />,
  boutique: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 11.5V20h14v-8.5" />
    </>
  ),
  grille: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  filtres: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
} as const;

export type NomIcone = keyof typeof ICONES;

export function Ic({
  n,
  s = 28,
  sw = 2.2,
  rempli = false,
  className,
}: {
  n: NomIcone;
  s?: number;
  sw?: number;
  rempli?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={rempli ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONES[n]}
    </svg>
  );
}

// Vignette d'une offre : logo de l'entreprise, sinon sa photo, sinon une photo d'illustration du métier.
export function Vignette({
  titre,
  sousTitre,
  imageUrl,
  estLogo,
  cle,
  className,
}: {
  titre: string;
  sousTitre: string | null;
  imageUrl: string | null;
  estLogo: boolean;
  cle: string;
  className: string;
}) {
  if (imageUrl && estLogo) {
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-[inset_0_0_0_2px_#E4E0D6] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-contain p-1.5" />
      </span>
    );
  }
  return (
    <span className={`flex shrink-0 overflow-hidden bg-[#DDE3EA] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl ?? imageIllustration(titre, sousTitre, cle).url}
        alt=""
        className="h-full w-full object-cover"
      />
    </span>
  );
}

// Le fichier /logo-france-travail.png est à déposer dans le dossier public/ ;
// tant qu'il est absent, le nom en texte s'affiche à la place.
export function LogoFranceTravail() {
  const [absent, setAbsent] = useState(false);
  if (absent) {
    return <span className="d text-[26px] font-bold text-[#0F1A45]">France Travail</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-france-travail.png"
      alt="France Travail"
      onError={() => setAbsent(true)}
      className="h-[64px] w-auto object-contain"
    />
  );
}

export function Scene({
  children,
  onActivite,
}: {
  children: React.ReactNode;
  onActivite: () => void;
}) {
  const [cadre, setCadre] = useState<{ s: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const maj = () => {
      const s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
      setCadre({
        s,
        x: (window.innerWidth - 1080 * s) / 2,
        y: (window.innerHeight - 1920 * s) / 2,
      });
    };
    maj();
    window.addEventListener("resize", maj);
    return () => window.removeEventListener("resize", maj);
  }, []);

  return (
    <div
      className="borne fixed inset-0 overflow-hidden bg-[#F7F5F0]"
      style={{ visibility: cadre ? "visible" : "hidden" }}
      onPointerDown={onActivite}
    >
      <div
        className="absolute left-0 top-0 flex flex-col overflow-hidden bg-[#F7F5F0]"
        style={{
          width: 1080,
          height: 1920,
          transformOrigin: "top left",
          transform: cadre ? `translate(${cadre.x}px, ${cadre.y}px) scale(${cadre.s})` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Logo({ taille = 30 }: { taille?: number }) {
  return (
    <span
      className="d flex flex-col font-bold text-[#0F1A45]"
      style={{ fontSize: taille, lineHeight: 0.95, letterSpacing: "0.01em" }}
    >
      <span className="flex items-center gap-1.5">
        ICI
        <svg
          width={taille * 0.87}
          height={taille * 0.87}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0E8A4A"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8.5 12V4.8a1.5 1.5 0 0 1 3 0V11" />
          <path d="M11.5 11l2.3-6.1a1.5 1.5 0 0 1 2.8 1.05L14.6 11.6" />
          <path d="M8.5 12.2a1.6 1.6 0 0 0-2.6 1.3V15a6 6 0 0 0 6 6h.6a5.5 5.5 0 0 0 5.5-5.5v-2.3a1.8 1.8 0 0 0-1.8-1.8H10a1.5 1.5 0 0 0 0 3h2.5" />
        </svg>
      </span>
      <span>ON RECRUTE</span>
    </span>
  );
}

export function EnTete({
  onAccueil,
  nbSelection,
  onSelection,
  badge,
  ville,
}: {
  onAccueil: () => void;
  nbSelection?: number;
  onSelection?: () => void;
  badge?: { texte: string; icone: NomIcone };
  ville?: { nom: string; logoUrl: string | null };
}) {
  return (
    <header className="flex h-[132px] shrink-0 items-center justify-between gap-6 bg-white px-12 shadow-[0_1px_0_#E4E0D6]">
      <button onClick={onAccueil} aria-label="Ici on recrute, retour à l’accueil">
        <Logo />
      </button>
      {ville && (
        <div className="flex min-w-0 grow items-center justify-center gap-3">
          {ville.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ville.logoUrl} alt={ville.nom} className="h-[68px] w-auto max-w-[240px] object-contain" />
          ) : (
            <span className="d truncate text-[30px] font-bold text-[#0F1A45]">{ville.nom}</span>
          )}
        </div>
      )}
      {badge && (
        <span className="flex h-16 items-center gap-2.5 rounded-full bg-[#E3F4EC] px-[22px] text-[22px] font-bold text-[#0A5C39]">
          <Ic n={badge.icone} s={24} />
          {badge.texte}
        </span>
      )}
      {nbSelection !== undefined && onSelection && (
        <button
          onClick={onSelection}
          disabled={nbSelection === 0}
          className={
            "flex h-20 items-center gap-3 rounded-full bg-white pl-6 pr-3 text-2xl font-bold " +
            (nbSelection > 0
              ? "shadow-[inset_0_0_0_2px_#0E8A4A]"
              : "bc-anneau text-[#545A6B]")
          }
        >
          <Ic n="coeur" s={28} rempli={nbSelection > 0} className={nbSelection > 0 ? "text-[#0E8A4A]" : "text-[#0E8A4A]"} />
          Ma sélection
          <span
            className={
              "flex h-[52px] min-w-[52px] items-center justify-center rounded-full text-2xl " +
              (nbSelection > 0 ? "bg-[#0E8A4A] text-white" : "bg-[#E4E0D6] text-[#3B4152]")
            }
          >
            {nbSelection}
          </span>
        </button>
      )}
    </header>
  );
}

export function BarreNav({
  onRetour,
  labelRetour,
  onAccueil,
  labelAccueil = "Accueil",
}: {
  onRetour?: () => void;
  labelRetour?: string;
  onAccueil?: () => void;
  labelAccueil?: string;
}) {
  return (
    <nav className="flex h-[132px] shrink-0 items-center gap-3.5 bg-white px-12 shadow-[0_-1px_0_#E4E0D6]">
      {onRetour && (
        <button
          onClick={onRetour}
          className="flex h-[88px] items-center gap-3 rounded-full pl-[22px] pr-[30px] text-[26px] font-bold shadow-[inset_0_0_0_2px_#0F1A45]"
        >
          <Ic n="retour" s={32} sw={2.4} />
          {labelRetour ?? "Retour"}
        </button>
      )}
      <div className="grow" />
      {onAccueil && (
        <button
          onClick={onAccueil}
          className="bc-anneau flex h-[88px] items-center gap-3 rounded-full pl-[22px] pr-[30px] text-[26px] font-bold"
        >
          <Ic n="maison" s={32} />
          {labelAccueil}
        </button>
      )}
    </nav>
  );
}

export function Clavier({
  valeur,
  onChange,
  mode,
  onFermer,
}: {
  valeur: string;
  onChange: (v: string) => void;
  mode: "email" | "texte";
  onFermer?: () => void;
}) {
  const touche = (
    label: string,
    extra?: { w?: number; fs?: number; bg?: string; fg?: string; aria?: string; action?: () => void }
  ) => ({
    label,
    w: extra?.w ?? 88,
    fs: extra?.fs ?? 32,
    bg: extra?.bg ?? "#FFFFFF",
    fg: extra?.fg ?? "#0F1A45",
    aria: extra?.aria ?? label,
    action: extra?.action ?? (() => onChange(valeur + label)),
  });
  const lettres = (s: string) => s.split("").map((c) => touche(c));
  const effacer = touche("⌫", {
    w: 140,
    bg: "#D9D4C7",
    aria: "Effacer une lettre",
    action: () => onChange(valeur.slice(0, -1)),
  });

  const lignes =
    mode === "email"
      ? [
          lettres("1234567890"),
          lettres("azertyuiop"),
          lettres("qsdfghjklm"),
          [...lettres("wxcvbn"), touche("."), touche("-"), effacer],
          [
            touche("@", { w: 120, bg: "#2B3BE0", fg: "#FFFFFF" }),
            touche("@gmail.com", { w: 220, fs: 26 }),
            touche("@orange.fr", { w: 200, fs: 26 }),
            touche("@hotmail.fr", { w: 210, fs: 26 }),
            touche(".fr", { w: 114, fs: 26 }),
          ],
        ]
      : [
          lettres("azertyuiop"),
          lettres("qsdfghjklm"),
          [...lettres("wxcvbn"), touche("'"), touche("-"), effacer],
          [
            touche(" ", { w: 520, aria: "Espace", action: () => onChange(valeur + " ") }),
            ...(onFermer
              ? [
                  touche("OK", {
                    w: 200,
                    bg: "#0E8A4A",
                    fg: "#FFFFFF",
                    aria: "Fermer le clavier",
                    action: onFermer,
                  }),
                ]
              : []),
          ],
        ];

  return (
    <div role="group" aria-label="Clavier" className="flex flex-col gap-2 rounded-[28px] bg-[#E9E6DE] p-3.5">
      {lignes.map((ligne, i) => (
        <div key={i} className="flex justify-center gap-2">
          {ligne.map((k, j) => (
            <button
              key={j}
              onClick={k.action}
              aria-label={k.aria}
              className="d flex h-[78px] shrink-0 items-center justify-center rounded-2xl font-semibold shadow-[0_2px_0_#C9C4B6]"
              style={{ width: k.w, fontSize: k.fs, background: k.bg, color: k.fg }}
            >
              {k.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
