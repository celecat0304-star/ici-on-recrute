import { Instrument_Sans } from "next/font/google";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export default function BorneLayout({ children }: { children: React.ReactNode }) {
  return <div className={instrument.variable}>{children}</div>;
}
