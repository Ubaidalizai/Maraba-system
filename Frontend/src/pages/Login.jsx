import { BsEye } from "react-icons/bs";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import { inputStyle } from "../components/ProductForm";
import GloableModal from "../components/GloableModal";
import { useForm } from "react-hook-form";
import { useForgotPassword } from "../services/useApi";

const Login = () => {
  const [isOpen, setIsOpen] = useState(false);
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
      toast.success("ورود موفقیت‌آمیز بود");
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "خطا در ورود به سیستم");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: "var(--background)",
        fontFamily: "var(--font-family)",
      }}
    >
      <div className="max-w-md border-2 border-slate-200 rounded-sm bg-white w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <h2
            className="text-3xl font-bold"
            style={{ color: "var(--primary-brown)" }}
          >
            ورود به سیستم
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-medium)" }}>
            سیستم مدیریت تجارت و توزیع
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Email Field */}
            <div className=" flex flex-col gap-y-2">
              <label
                htmlFor="email"
                className="block text-[16px] font-medium"
                style={{ color: "var(--text-dark)" }}
              >
                ایمیل
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={inputStyle}
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-dark)",
                  focusRingColor: "var(--primary-brown)",
                }}
                placeholder="ایمیل خود را وارد کنید"
              />
            </div>

            {/* Password Field */}
            <div className=" relative flex flex-col gap-y-2 ">
              <label
                htmlFor="password"
                className="block text-[16px] font-medium"
                style={{ color: "var(--text-dark)" }}
              >
                رمز عبور
              </label>
              <input
                id="password"
                name="password"
                type={isOpen ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                className={inputStyle}
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-dark)",
                  focusRingColor: "var(--primary-brown)",
                }}
                placeholder="رمز عبور خود را وارد کنید"
              />
              <BsEye
                onClick={() => setIsOpen((isOpen) => !isOpen)}
                className=" text-[18px] absolute top-[45px] cursor-pointer text-slate-700 left-3"
              />
            </div>
          </div>
          <p
            onClick={() => setForgotPassword(true)}
            className={" text-[16px]  underline cursor-pointer"}
          >
            آیاپسورد تانرا فراموش کردید؟
          </p>
          {/* Submit Button */}
          <div className=" pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isLoading
                  ? "var(--text-medium)"
                  : "var(--primary-brown)",
                focusRingColor: "var(--primary-brown)",
              }}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  در حال ورود...
                </div>
              ) : (
                "ورود"
              )}
            </button>
          </div>
        </form>
      </div>
      <GloableModal
        open={forgotPassword}
        setOpen={setForgotPassword}
        isClose={true}
      >
        <div className="bg-white shadow-xl rounded-sm p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            فراموشی رمز عبور
          </h2>
          <p className="text-gray-500 text-center mb-6 text-sm">
            آدرس ایمیل خود را وارد کنید تا لینک بازیابی رمز عبور برای شما ارسال
            شود.
          </p>

          <form
            className="space-y-5"
            noValidate
            onSubmit={forgotPasswordSubmit(handleForgot)}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                آدرس ایمیل
              </label>
              <input
                id="email"
                {...register("email")}
                type="email"
                required
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 rounded-sm border border-gray-300 focus:ring-1 focus:ring-primary-brown-light focus:border-primary-brown-light outline-none text-right"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3  bg-primary-brown text-white font-semibold rounded-sm  cursor-pointer  hover:bg-primary-brown-light  transition duration-200"
            >
              ارسال لینک بازیابی <span>{isPending && "..."}</span>
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            رمز عبور خود را به یاد آوردید؟
            <p
              onClick={() => setForgotPassword(false)}
              className="text-primary-brown-light  hover:underline"
            >
              بازگشت به ورود
            </p>
          </p>
        </div>
      </GloableModal>
    </div>
  );
};

export default Login;
