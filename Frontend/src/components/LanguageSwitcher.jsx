import { useTranslation } from "react-i18next";

const SUPPORTED = ["fa", "ps"];

export default function LanguageSwitcher({ className = "" }) {
  const { i18n, t } = useTranslation();
  const raw = (i18n.language || "ps").split("-")[0];
  const value = SUPPORTED.includes(raw) ? raw : "ps";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="app-language" className="sr-only">
        {t("language.switch")}
      </label>
      <select
        id="app-language"
        value={value}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5 text-gray-800 shadow-sm focus:border-primary-brown-light focus:outline-none focus:ring-1 focus:ring-primary-brown-light"
      >
        <option value="ps">{t("language.ps")}</option>
        <option value="fa">{t("language.fa")}</option>
      </select>
    </div>
  );
}
