import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { useSettings, useUpdateSettings } from "../services/useApi";
import { BACKEND_BASE_URL } from "../services/apiConfig";
import { inputStyle } from "./ProductForm";

const SettingsManagement = () => {
  const { t } = useTranslation();
  const { data: settingsData, isLoading, error } = useSettings();
  const updateMutation = useUpdateSettings();
  const [logoPreview, setLogoPreview] = useState(null);
  const [form, setForm] = useState({
    companyName: "",
    companyNameEnglish: "",
    address: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    website: "",
    taxId: "",
    description: "",
  });

  useEffect(() => {
    if (settingsData?.data?.settings) {
      const s = settingsData.data.settings;
      setForm({
        companyName: s.companyName || "",
        companyNameEnglish: s.companyNameEnglish || "",
        address: s.address || "",
        phone1: s.phone1 || "",
        phone2: s.phone2 || "",
        phone3: s.phone3 || "",
        email: s.email || "",
        website: s.website || "",
        taxId: s.taxId || "",
        description: s.description || "",
      });
    }
  }, [settingsData]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(form).forEach((key) => {
      if (form[key]) formData.append(key, form[key]);
    });
    const logoInput = document.getElementById("logo-input");
    if (logoInput?.files[0]) {
      formData.append("image", logoInput.files[0]);
    }
    updateMutation.mutate(formData);
  };

  const currentLogo = settingsData?.data?.settings?.logo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("admin.common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ color: "var(--primary-brown)" }}
        >
          {t("admin.settingsPage.title")}
        </h2>
        <p className="text-gray-600 mt-1">{t("admin.settingsPage.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <div className="card">
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-dark)" }}
          >
            {t("admin.settingsPage.logoSection")}
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt={t("admin.settingsPage.logoPreview")}
                  className="w-full h-full object-contain"
                />
              ) : currentLogo ? (
                <img
                  src={`${BACKEND_BASE_URL}/public/images/settings/${currentLogo}`}
                  alt={t("admin.settingsPage.currentLogo")}
                  className="w-full h-full object-contain"
                />
              ) : (
                <PhotoIcon className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div>
              <label
                htmlFor="logo-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              >
                <PhotoIcon className="h-5 w-5" />
                <span>{t("admin.settingsPage.chooseLogo")}</span>
              </label>
              <input
                id="logo-input"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                {t("admin.settingsPage.logoHint")}
              </p>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="card">
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-dark)" }}
          >
            {t("admin.settingsPage.companyInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.companyNamePs")}
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                className={inputStyle}
                placeholder={t("admin.settingsPage.companyNamePsPlaceholder")}
              />
            </div>
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.companyNameEn")}
              </label>
              <input
                type="text"
                value={form.companyNameEnglish}
                onChange={(e) =>
                  setForm({ ...form, companyNameEnglish: e.target.value })
                }
                className={inputStyle}
                placeholder={t("admin.settingsPage.companyNameEnPlaceholder")}
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.address")}
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputStyle}
                rows={2}
                placeholder={t("admin.settingsPage.addressPlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-dark)" }}
          >
            {t("admin.settingsPage.contactInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.phone1")}
              </label>
              <input
                type="tel"
                value={form.phone1}
                onChange={(e) => setForm({ ...form, phone1: e.target.value })}
                className={inputStyle}
                placeholder={t("admin.settingsPage.phonePlaceholder")}
              />
            </div>
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.phone2")}
              </label>
              <input
                type="tel"
                value={form.phone2}
                onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                className={inputStyle}
                placeholder={t("admin.settingsPage.phonePlaceholder")}
              />
            </div>
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.phone3")}
              </label>
              <input
                type="tel"
                value={form.phone3}
                onChange={(e) => setForm({ ...form, phone3: e.target.value })}
                className={inputStyle}
                placeholder={t("admin.settingsPage.phonePlaceholder")}
              />
            </div>
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputStyle}
                placeholder={t("admin.settingsPage.emailPlaceholder")}
              />
            </div>
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.website")}
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className={inputStyle}
                placeholder={t("admin.settingsPage.websitePlaceholder")}
              />
            </div>
            <div>
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.taxId")}
              </label>
              <input
                type="text"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                className={inputStyle}
                placeholder={t("admin.settingsPage.taxIdPlaceholder")}
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block mb-2 text-sm font-medium"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.settingsPage.description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={inputStyle}
                rows={3}
                placeholder={t("admin.settingsPage.descriptionPlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending || isLoading}
            className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
              updateMutation.isPending || isLoading
                ? "bg-amber-600/70 cursor-not-allowed text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            }`}
          >
            {updateMutation.isPending ? t("admin.settingsPage.saving") : t("admin.settingsPage.saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsManagement;
