import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// South African Languages
// ============================================================
export type SupportedLang =
  | "en"  // English
  | "zu"  // isiZulu
  | "xh"  // isiXhosa
  | "st"  // Sesotho
  | "tn"  // Setswana
  | "af"  // Afrikaans
  | "ve"  // Tshivenda
  | "ts"  // Xitsonga
  | "nr"  // isiNdebele
  | "nso" // Sepedi
  | "ss"; // siSwati

const LANG_KEY = "vayaride_lang";

type TranslationMap = Record<string, string>;

const FALLBACK: SupportedLang = "en";

// ============================================================
// English (en) — Primary language / fallback
// ============================================================
const en: TranslationMap = {
  // App
  appName: "VayaRide",
  appTagline: "Your ride, your way in South Africa",
  appTaglineShort: "Smart commuting",
  loading: "Loading...",
  error: "Something went wrong",
  retry: "Retry",
  cancel: "Cancel",
  save: "Save",
  submit: "Submit",
  delete: "Delete",
  edit: "Edit",
  search: "Search",
  close: "Close",
  back: "Back",
  confirm: "Confirm",
  yes: "Yes",
  no: "No",
  ok: "OK",
  comingSoon: "Coming soon",
  noResults: "No results found",
  seeAll: "See all",
  viewAll: "View all",

  // Navigation
  navHome: "Home",
  navRoutes: "Routes",
  navTaxiSigns: "Taxi Signs",
  navSaved: "Saved",
  navProfile: "Profile",
  navAdmin: "Admin",
  navFindRides: "Find Rides",
  navOfferRide: "Offer Ride",
  navMyTrips: "My Trips",

  // Auth
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: "Sign out",
  email: "Email",
  password: "Password",
  fullName: "Full name",
  phone: "Phone",
  continue: "Continue",
  createAccount: "Create account",
  verifyPhone: "Verify phone",
  continueWithPhone: "Continue with phone",
  smsCode: "6-digit code",
  verify: "Verify",
  or: "or",
  continueWithGoogle: "Continue with Google",
  continueWithApple: "Continue with Apple",
  welcome: "Welcome — let's get you a ride.",

  // Home
  currentLocation: "Current location",
  searchDestination: "Search destination...",
  whereTo: "Where to?",
  nearbyRanks: "Nearby taxi ranks",
  savedPlaces: "Saved places",
  recentDestinations: "Recent destinations",
  home: "Home",
  work: "Work",
  quickActions: "Quick actions",
  findTaxiSign: "Find taxi sign",
  planRoute: "Plan route",

  // Taxi Signs
  taxiSigns: "Taxi Signs",
  taxiSignsSubtitle: "Find the right hand sign for your destination",
  searchDestinationPlaceholder: "Search destination...",
  useMyLocation: "Use My Location",
  youAreIn: "You are in",
  popularSearches: "Popular searches",
  handSignDescription: "Hand sign",
  alternativeSign: "Alternative sign",
  notes: "Notes",
  servingRanks: "Taxi ranks serving this destination",
  verified: "Verified",
  unverified: "Unverified",
  pendingApproval: "Pending approval",
  varyByAssociation: "This sign may vary depending on the taxi association.",
  addTaxiSign: "Add Taxi Sign",
  addTaxiSignTitle: "Add a new taxi sign",
  addTaxiSignDesc: "Help fellow commuters by adding a taxi hand sign to our database.",
  mySubmissions: "My submissions",
  moderationQueue: "Moderation Queue",
  approve: "Approve",
  reject: "Reject",
  destination: "Destination",
  province: "Province",
  city: "City",
  suburb: "Suburb",
  taxiRank: "Taxi rank",
  handSignImage: "Hand sign photo",
  handSignIllustration: "Hand sign illustration",
  description: "Description",
  alternativeSignLabel: "Alternative sign",
  additionalNotes: "Additional notes",
  submittedForReview: "Submitted for review. It will be visible once approved.",
  filterByProvince: "Filter by province",
  filterByCity: "Filter by city",
  filterByRank: "Filter by rank",
  verifiedOnly: "Verified only",
  results: "results",
  noSignsFound: "No taxi signs found for this search.",
  tryDifferentSearch: "Try a different destination or check your spelling.",
  nearby: "Nearby",

  // Saved
  savedTaxiSigns: "Saved Taxi Signs",
  savedDestinations: "Saved Destinations",
  savedRanks: "Saved Taxi Ranks",
  saveSign: "Save sign",
  unsaveSign: "Remove from saved",
  noSavedSigns: "You haven't saved any taxi signs yet.",
  noSavedDestinations: "No saved destinations yet.",

  // Profile
  profile: "Profile",
  account: "Account",
  preferences: "Preferences",
  language: "Language",
  darkMode: "Dark mode",
  about: "About",
  version: "Version",
  emergencyContact: "Emergency contact",
  sos: "SOS",

  // Provinces
  gauteng: "Gauteng",
  kwazuluNatal: "KwaZulu-Natal",
  westernCape: "Western Cape",
  easternCape: "Eastern Cape",
  freeState: "Free State",
  mpumalanga: "Mpumalanga",
  limpopo: "Limpopo",
  northWest: "North West",
  northernCape: "Northern Cape",

  // Offline
  downloadOffline: "Download for offline",
  offlineData: "Offline data",
  offlineMode: "You are offline. Showing cached data.",
  downloadProvince: "Download province data",
  downloaded: "Downloaded",
  download: "Download",
};

// ============================================================
// isiZulu (zu)
// ============================================================
const zu: TranslationMap = {
  ...en,
  appName: "VayaRide",
  appTagline: "Uhambo lwakho, indlela yakho eNingizimu Afrika",
  navHome: "Ikhaya",
  navRoutes: "Imizila",
  navTaxiSigns: "Izimpawu Zamatekisi",
  navSaved: "Okulondoloziwe",
  navProfile: "Iphrofayili",
  signIn: "Ngena",
  signUp: "Bhalisa",
  searchDestinationPlaceholder: "Sesha indawo oya kuyo...",
  useMyLocation: "Sebenzisa Indawo Yami",
  youAreIn: "Uku",
  addTaxiSign: "Faka Isignali Yetekisi",
  verified: "Iqinisekisiwe",
  savedTaxiSigns: "Izimpawu Zamatekisi Ezilondoloziwe",
  noSavedSigns: "Awukagcini noma yiziphi izimpawu zetekisi.",
  province: "Isifundazwe",
  city: "Idolobha",
  destination: "Indawo oya kuyo",
  taxiRank: "Isiteshi samatekisi",
  description: "Incazelo",
  notes: "Amanothi",
  search: "Sesha",
  popularSearches: "Ukusesha okudumile",
  results: "imiphumela",
};

// ============================================================
// isiXhosa (xh)
// ============================================================
const xh: TranslationMap = {
  ...en,
  appTagline: "Uhambo lwakho, indlela yakho eMzantsi Afrika",
  navHome: "Ikhaya",
  navTaxiSigns: "Iimpawu Zeteksi",
  navSaved: "Ezigciniweyo",
  signIn: "Ngena",
  searchDestinationPlaceholder: "Khangela indawo oya kuyo...",
  useMyLocation: "Sebenzisa Indawo Yam",
  youAreIn: "Ukule",
  addTaxiSign: "Yongeza Isibonakaliso Seteksi",
  verified: "Iqinisekisiwe",
  savedTaxiSigns: "Iimpawu Zeteksi Ezigciniweyo",
  province: "Iphondo",
  city: "Isixeko",
  destination: "Indawo oya kuyo",
  taxiRank: "Isikhululo seteksi",
  search: "Khangela",
  popularSearches: "Ukukhangela okudumileyo",
};

// ============================================================
// Sesotho (st)
// ============================================================
const st: TranslationMap = {
  ...en,
  appTagline: "Leeto la hao, tsela ya hao Afrika Borwa",
  navHome: "Lapeng",
  navTaxiSigns: "Matšoao a Litekisi",
  navSaved: "Tse Bolokiloeng",
  signIn: "Kena",
  searchDestinationPlaceholder: "Batla sebaka seo eang ho sona...",
  useMyLocation: "Sebelisa Sebaka sa Ka",
  youAreIn: "U teng",
  addTaxiSign: "Kenya Letšoao la Tekisi",
  verified: "E Netefalitsoe",
  savedTaxiSigns: "Matšoao a Litekisi a Bolokiloeng",
  province: "Profense",
  city: "Toropo",
  destination: "Sebaka seo eang ho sona",
  taxiRank: "Setopo sa litekisi",
  search: "Batla",
  popularSearches: "Phatlalatso e tsebahalang",
};

// ============================================================
// Setswana (tn)
// ============================================================
const tn: TranslationMap = {
  ...en,
  appTagline: "Loeto la gago, tsela ya gago mo Aforika Borwa",
  navHome: "Kwa Gae",
  navTaxiSigns: "Matšhwao a Ditekisi",
  navSaved: "A Polokilweng",
  signIn: "Tsena",
  searchDestinationPlaceholder: "Batla kwa o yang teng...",
  useMyLocation: "Dirisa Lefelo La Me",
  youAreIn: "O mo",
  addTaxiSign: "Tsenya Letshwao la Tekisi",
  verified: "E netefaditswe",
  savedTaxiSigns: "Matšhwao a Ditekisi a Polokilweng",
  province: "Porofense",
  city: "Toropo",
  destination: "Kwa o yang teng",
  taxiRank: "Setopo sa ditekisi",
  search: "Batla",
  popularSearches: "Dibatla tse di tumileng",
};

// ============================================================
// Afrikaans (af)
// ============================================================
const af: TranslationMap = {
  ...en,
  appTagline: "Jou rit, jou pad in Suid-Afrika",
  navHome: "Tuis",
  navRoutes: "Roetes",
  navTaxiSigns: "Taxi Tekens",
  navSaved: "Gestoor",
  navProfile: "Profiel",
  signIn: "Teken aan",
  signUp: "Registreer",
  signOut: "Teken uit",
  searchDestinationPlaceholder: "Soek bestemming...",
  useMyLocation: "Gebruik My Ligging",
  youAreIn: "Jy is in",
  addTaxiSign: "Voeg Taxi Teken by",
  verified: "Geverifieer",
  savedTaxiSigns: "Gestoor Taxi Tekens",
  noSavedSigns: "Jy het nog geen taxi tekens gestoor nie.",
  province: "Provinsie",
  city: "Stad",
  destination: "Bestemming",
  taxiRank: "Taxi stasie",
  search: "Soek",
  description: "Beskrywing",
  notes: "Notas",
  alternativeSign: "Alternatiewe teken",
  popularSearches: "Gewilde soektogte",
  results: "resultate",
  download: "Laai af",
};

// ============================================================
// Tshivenda (ve)
// ============================================================
const ve: TranslationMap = {
  ...en,
  appTagline: "Lwendo lwau, ndila yau Afrika Tshipembe",
  navHome: "Hayani",
  navTaxiSigns: "Zwipikwa zwa Thekisi",
  navSaved: "Zwo Vhulungwa",
  signIn: "Dzhena",
  searchDestinationPlaceholder: "Todisa fhethu hune wa ya hone...",
  useMyLocation: "Shumisa Fhethu Hangau",
  youAreIn: "U",
  addTaxiSign: "Tseledza Tshipikwa tsha Thekisi",
  verified: "Tshi khou todeswa",
  savedTaxiSigns: "Zwipikwa zwa Thekisi zwo vhulungwa",
  province: "Phurovintshi",
  city: "Dorobo",
  destination: "Fhethu hune wa ya hone",
  taxiRank: "Sitazioni tsha thekisi",
  search: "Todisa",
};

// ============================================================
// Xitsonga (ts)
// ============================================================
const ts: TranslationMap = {
  ...en,
  appTagline: "Rihanyo ra wena, ndlela ya wena eAfrika Dzonga",
  navHome: "Ekaya",
  navTaxiSigns: "Swikombiso swa Thekisi",
  navSaved: "Swihlayisiwile",
  signIn: "Nghena",
  searchDestinationPlaceholder: "Lavisisa laha u yaka kona...",
  useMyLocation: "Tirhisa Ndawo Ya Mina",
  youAreIn: "U",
  addTaxiSign: "Engeta Xikombiso xa Thekisi",
  verified: "Xi tiysiswile",
  savedTaxiSigns: "Swikombiso swa Thekisi leswi hlayisiwileke",
  province: "Xifundza",
  city: "Doroba",
  destination: "Laha u yaka kona",
  taxiRank: "Xitichi xa thekisi",
  search: "Lavisisa",
};

// ============================================================
// isiNdebele (nr)
// ============================================================
const nr: TranslationMap = {
  ...en,
  appTagline: "Uhambo lwakho, indlela yakho eNingizimu Afrika",
  navHome: "Ekaya",
  navTaxiSigns: "Izimpawu Zamatekisi",
  navSaved: "Ezigciniwe",
  signIn: "Ngena",
  searchDestinationPlaceholder: "Funa lapho uya khona...",
  useMyLocation: "Sebenzisa Indawo Yami",
  youAreIn: "Ukule",
  addTaxiSign: "Faka Isibonakaliso Setekisi",
  verified: "Iqinisekisiwe",
  savedTaxiSigns: "Izimpawu Zamatekisi Ezigciniwe",
  province: "Isifundazwe",
  city: "Idolobha",
  destination: "Lapho uya khona",
  taxiRank: "Isiteshi samatekisi",
  search: "Funa",
};

// ============================================================
// Sepedi (nso)
// ============================================================
const nso: TranslationMap = {
  ...en,
  appTagline: "Leeto la gago, tsela ya gago ka Afrika Borwa",
  navHome: "Gaetšhabo",
  navTaxiSigns: "Matšhwao a Tekisi",
  navSaved: "A Polokilwego",
  signIn: "Tsena",
  searchDestinationPlaceholder: "Nyaka moo o yang gona...",
  useMyLocation: "Šomiša Lefelo La Ka",
  youAreIn: "O",
  addTaxiSign: "Lokela Letšhwao la Tekisi",
  verified: "E netefaditšwe",
  savedTaxiSigns: "Matšhwao a Tekisi a Polokilwego",
  province: "Profense",
  city: "Toropo",
  destination: "Moo o yang gona",
  taxiRank: "Setopo sa ditekisi",
  search: "Nyaka",
};

// ============================================================
// siSwati (ss)
// ============================================================
const ss: TranslationMap = {
  ...en,
  appTagline: "Luhambo lwakho, indlela yakho eNingizimu Afrika",
  navHome: "Ekhaya",
  navTaxiSigns: "Timpawu Tematekisi",
  navSaved: "Letigciniwe",
  signIn: "Ngena",
  searchDestinationPlaceholder: "Sesha lapho uya khona...",
  useMyLocation: "Sebentisa Indzawo Yami",
  youAreIn: "Use",
  addTaxiSign: "Engeta Siphawu Sematekisi",
  verified: "Kuqinisekisiwe",
  savedTaxiSigns: "Timpawu Tematekisi Letigciniwe",
  province: "Sifundza",
  city: "Idolobha",
  destination: "Lapho uya khona",
  taxiRank: "Esiteshini sematekisi",
  search: "Sesha",
};

// ============================================================
// Translation registry
// ============================================================
const translations: Record<SupportedLang, TranslationMap> = {
  en, zu, xh, st, tn, af, ve, ts, nr, nso, ss,
};

const LANG_NAMES: Record<SupportedLang, string> = {
  en: "English",
  zu: "isiZulu",
  xh: "isiXhosa",
  st: "Sesotho",
  tn: "Setswana",
  af: "Afrikaans",
  ve: "Tshivenda",
  ts: "Xitsonga",
  nr: "isiNdebele",
  nso: "Sepedi",
  ss: "siSwati",
};

// ============================================================
// Context
// ============================================================
interface I18nContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string) => string;
  langName: string;
  availableLangs: { code: SupportedLang; name: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>("en");

  // Hydrate language preference on mount (client-side only)
  useEffect(() => {
    // Try localStorage first
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && stored in translations) {
      setLangState(stored as SupportedLang);
      return;
    }
    // Try browser language
    const browser = navigator.language?.slice(0, 2);
    if (browser === "zu" || browser === "xh" || browser === "af" || browser === "st" ||
        browser === "tn" || browser === "ve" || browser === "ts" || browser === "nr") {
      setLangState(browser as SupportedLang);
    }
  }, []);

  const setLang = useCallback((newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  }, []);

  // Sync with server preference if logged in
  useEffect(() => {
    const syncLang = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.from("profiles").upsert(
          { id: data.session.user.id, preferred_language: lang },
          { onConflict: "id" },
        );
      }
    };
    syncLang();
  }, [lang]);

  const t = useCallback(
    (key: string): string => {
      const map = translations[lang] || translations[FALLBACK];
      return map[key] || translations[FALLBACK][key] || key;
    },
    [lang],
  );

  const value: I18nContextType = {
    lang,
    setLang,
    t,
    langName: LANG_NAMES[lang] || "English",
    availableLangs: Object.entries(LANG_NAMES).map(([code, name]) => ({
      code: code as SupportedLang,
      name,
    })),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Helper for client components that just need t()
export function useT() {
  return useI18n().t;
}