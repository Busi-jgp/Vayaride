import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "af";

const dict = {
  en: {
    appName: "VayaRide",
    findRides: "Find",
    offerRide: "Offer",
    myTrips: "Trips",
    profile: "Profile",
    admin: "Admin",
    sos: "SOS",
  },
  af: {
    appName: "VayaRide",
    findRides: "Vind",
    offerRide: "Bied",
    myTrips: "Ritte",
    profile: "Profiel",
    admin: "Admin",
    sos: "NOOD",
  },
} as const;

type Key = keyof (typeof dict)["en"];

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (stored === "en" || stored === "af") setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };
  const t = (k: Key) => dict[lang][k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
