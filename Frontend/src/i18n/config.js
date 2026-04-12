import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import fa from "../locales/fa.json";
import ps from "../locales/ps.json";

const RTL_LANGS = new Set(["fa", "ps", "ar"]);

try {
  const stored = localStorage.getItem("i18nextLng")?.split("-")[0];
  if (stored && stored !== "fa" && stored !== "ps") {
    localStorage.setItem("i18nextLng", "ps");
  }
} catch {
  /* ignore */
}

function syncDocumentLang(lng) {
  const code = (lng || "ps").split("-")[0];
  const dir = RTL_LANGS.has(code) ? "rtl" : "ltr";
  const htmlLang = code === "ps" ? "ps" : "fa";
  document.documentElement.lang = htmlLang;
  document.documentElement.dir = dir;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fa: { translation: fa },
      ps: { translation: ps },
    },
    lng: "ps",
    fallbackLng: "fa",
    supportedLngs: ["fa", "ps"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

syncDocumentLang(i18n.language);
i18n.on("languageChanged", syncDocumentLang);

export default i18n;
