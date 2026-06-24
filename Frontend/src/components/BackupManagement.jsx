import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  downloadDatabaseBackup,
  restoreDatabaseBackup,
} from "../services/apiUtiles";
import { useAuth } from "../contexts/AuthContext";

const BackupManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isAdmin = user?.role === "admin";

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDatabaseBackup();
      toast.success(t("admin.backupPage.downloadSuccess"));
    } catch (err) {
      toast.error(`${t("admin.backupPage.downloadError")}: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = async (e) => {
    e?.preventDefault();

    if (!selectedFile) {
      toast.error(t("admin.backupPage.fileRequired"));
      return;
    }
    if (!adminPassword.trim()) {
      toast.error(t("admin.backupPage.passwordRequired"));
      passwordInputRef.current?.focus();
      return;
    }

    setIsRestoring(true);
    try {
      toast.info(t("admin.backupPage.preBackupDownloading"));
      await downloadDatabaseBackup();

      await restoreDatabaseBackup({
        file: selectedFile,
        adminPassword: adminPassword.trim(),
      });

      toast.success(t("admin.backupPage.restoreSuccess"));
      setSelectedFile(null);
      setAdminPassword("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(`${t("admin.backupPage.restoreError")}: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files?.[0] || null);
    if (e.target.files?.[0]) {
      passwordInputRef.current?.focus();
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        {t("admin.backupPage.adminOnly")}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CircleStackIcon className="h-6 w-6 text-amber-600" />
          {t("admin.backupPage.title")}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{t("admin.backupPage.subtitle")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {t("admin.backupPage.downloadTitle")}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{t("admin.backupPage.downloadHint")}</p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || isRestoring}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {isDownloading
            ? t("admin.backupPage.downloading")
            : t("admin.backupPage.downloadButton")}
        </button>
      </div>

      <form
        className="rounded-lg border border-red-200 bg-red-50/40 p-5 space-y-4"
        onSubmit={handleRestore}
        autoComplete="on"
      >
        <div className="flex gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">
              {t("admin.backupPage.restoreTitle")}
            </h3>
            <p className="text-xs text-red-800 mt-1">{t("admin.backupPage.restoreWarning")}</p>
            <p className="text-xs text-red-800 mt-1">{t("admin.backupPage.preBackupNote")}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("admin.backupPage.fileLabel")}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gz,application/gzip,application/x-gzip"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-amber-100 file:text-amber-800"
          />
        </div>

        <input
          type="email"
          name="email"
          value={user?.email || ""}
          readOnly
          tabIndex={-1}
          autoComplete="username"
          aria-hidden="true"
          className="sr-only"
        />

        <div>
          <label htmlFor="backup-admin-password" className="block text-sm font-medium text-gray-700 mb-1">
            {t("admin.backupPage.passwordLabel")}
          </label>
          <input
            ref={passwordInputRef}
            id="backup-admin-password"
            name="password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-sm text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">{t("admin.backupPage.passwordHint")}</p>
        </div>

        <button
          type="submit"
          disabled={isRestoring || isDownloading || !selectedFile}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="h-5 w-5" />
          {isRestoring
            ? t("admin.backupPage.restoring")
            : t("admin.backupPage.restoreButton")}
        </button>
      </form>
    </div>
  );
};

export default BackupManagement;
