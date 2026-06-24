import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import GloableModal from "../components/GloableModal";
import { useForm } from "react-hook-form";
import { useForgotPassword } from "../services/useApi";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 ps-11 pe-4 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-dategold-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dategold-100";

const Login = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const { mutate: sendEmail, isPending } = useForgotPassword();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { register, handleSubmit: forgotPasswordSubmit, reset } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleForgot = (data) => {
    sendEmail({ email: data.email });
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData);
      toast.success(t("toast.loginSuccess"));
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || t("toast.loginError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10"
      style={{
        fontFamily: "var(--font-family)",
        background:
          "linear-gradient(145deg, var(--beige-light) 0%, #ffffff 45%, var(--color-palm-100, #d4e1df) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-dategold-100/60 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -start-16 h-64 w-64 rounded-full bg-palm-100/70 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[420px]">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-8 shadow-[0_20px_60px_-15px_rgba(84,53,36,0.18)] backdrop-blur-sm sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-dategold-200 to-dategold-400 text-white shadow-md">
              <BuildingStorefrontIcon className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-dategold-400">
              {t("brand.title")}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              {t("login.title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {t("login.subtitle")}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} autoComplete="on">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  {t("login.email")}
                </label>
                <div className="relative">
                  <EnvelopeIcon
                    className="pointer-events-none absolute top-1/2 start-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={formData.email}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder={t("login.emailPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  {t("login.password")}
                </label>
                <div className="relative">
                  <LockClosedIcon
                    className="pointer-events-none absolute top-1/2 start-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`${fieldClass} pe-11`}
                    placeholder={t("login.passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 end-3 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="text-sm font-medium text-dategold-400 transition hover:text-dategold-500 hover:underline"
              >
                {t("login.forgotPassword")}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-dategold-400 to-dategold-300 py-3.5 text-sm font-semibold text-white shadow-md transition hover:from-dategold-500 hover:to-dategold-400 focus:outline-none focus:ring-2 focus:ring-dategold-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t("login.submitting")}
                </>
              ) : (
                t("login.submit")
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            {t("brand.tagline")}
          </p>
        </div>
      </div>

      <GloableModal
        open={forgotPassword}
        setOpen={setForgotPassword}
        isClose={true}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="text-center text-xl font-bold text-slate-900">
            {t("login.forgotTitle")}
          </h2>
          <p className="mb-6 mt-2 text-center text-sm leading-relaxed text-slate-500">
            {t("login.forgotDescription")}
          </p>

          <form
            className="space-y-5"
            noValidate
            onSubmit={forgotPasswordSubmit(handleForgot)}
          >
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {t("login.forgotEmailLabel")}
              </label>
              <input
                id="forgot-email"
                {...register("email")}
                type="email"
                required
                placeholder={t("login.emailPlaceholder")}
                className={fieldClass}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-dategold-400 py-3 text-sm font-semibold text-white transition hover:bg-dategold-500 disabled:opacity-60"
            >
              {isPending ? t("login.forgotSubmitting") : t("login.forgotSubmit")}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <span>{t("login.rememberPassword")} </span>
            <button
              type="button"
              onClick={() => setForgotPassword(false)}
              className="font-medium text-dategold-400 hover:text-dategold-500 hover:underline"
            >
              {t("login.backToLogin")}
            </button>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default Login;
