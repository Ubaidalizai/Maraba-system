import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ps from "../locales/ps.json";

function forcePashtoInStorage() {
  try {
    localStorage.setItem("i18nextLng", "ps");
  } catch {
    /* ignore */
  }
}

function syncDocumentLang() {
  document.documentElement.lang = "ps";
  document.documentElement.dir = "rtl";
}

i18n.use(initReactI18next).init({
  resources: {
    ps: { translation: ps },
  },
  lng: "ps",
  fallbackLng: "ps",
  supportedLngs: ["ps"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

forcePashtoInStorage();
syncDocumentLang();
i18n.on("languageChanged", syncDocumentLang);

export default i18n;
