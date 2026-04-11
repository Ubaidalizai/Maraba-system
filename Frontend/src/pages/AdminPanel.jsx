import { CgCloseO } from "react-icons/cg";
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import SupplierManagement from "../components/SupplierManagement";
import UnitManagement from "../components/UnitManagement";
import CustomerManagement from "../components/CustomerManagement";
import EmployeeManagement from "../components/EmployeeManagement";
import {
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ScaleIcon,
  UserGroupIcon,
  UserIcon,
  TagIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { inputStyle } from "../components/ProductForm";
import GloableModal from "../components/GloableModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_ENDPOINTS, BACKEND_BASE_URL } from "../services/apiConfig";
import { toast } from "react-toastify";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import {
  useUpdatePassword,
  useUpdateProfile,
} from "../services/useApi";
import { useForm } from "react-hook-form";
import Button from "../components/Button";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

const AdminPanel = () => {
  const { isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState("suppliers");
  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            دسترسی غیرمجاز
          </h2>
          <p className="text-gray-600">لطفاً ابتدا وارد شوید</p>
        </div>
      </div>
    );
  }

  const adminSections = [
    {
      id: "profile",
      name: "پروفایل کاربری",
      icon: IdentificationIcon,
      description: "مشاهده و مدیریت اطلاعات پروفایل",
    },
    {
      id: "users",
      name: "مدیریت کاربران",
      icon: UserIcon,
      description: "مشاهده، افزودن و مدیریت کاربران سیستم",
    },
    {
      id: "suppliers",
      name: "مدیریت تامین‌کنندگان",
      icon: BuildingOfficeIcon,
      description: "افزودن، ویرایش و حذف تامین‌کنندگان",
    },
    {
      id: "categories",
      name: "مدیریت دسته‌بندی‌ها",
      icon: TagIcon,
      description: "CRUD دسته‌بندی‌ها برای هزینه/درآمد/محصول",
    },
    {
      id: "customers",
      name: "مدیریت مشتریان",
      icon: UserGroupIcon,
      description: "افزودن، ویرایش و حذف مشتریان",
    },
    {
      id: "employees",
      name: "مدیریت کارمندان",
      icon: UserIcon,
      description: "افزودن، ویرایش و حذف کارمندان",
    },
    {
      id: "units",
      name: "مدیریت واحدها",
      icon: ScaleIcon,
      description: "مدیریت واحدهای اندازه‌گیری و تبدیل",
    },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileManagement />;
      case "users":
        return <UserManagement />;
      case "suppliers":
        return <SupplierManagement />;
      case "categories":
        return <CategoryManagement />;
      case "customers":
        return <CustomerManagement />;
      case "employees":
        return <EmployeeManagement />;
      case "units":
        return <UnitManagement />;
      default:
        return <SupplierManagement />;
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className=" mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-primary-brown-light">
                پنل مدیریت
              </h1>
              <p
                className="mt-1 text-lg"
                style={{ color: "var(--text-medium)" }}
              >
                مدیریت تامین‌کنندگان، مشتریان، کارمندان، واحدها و دسته‌بندی‌ها              </p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse">
                <ShieldCheckIcon
                  className="h-6 w-6"
                  style={{ color: "var(--success-green)" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-dark)" }}
                >
                  دسترسی مدیر
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 text-[var(--text-dark)]">
                بخش‌های مدیریت
              </h3>
              <nav className="space-y-2">
                {adminSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-right p-3 rounded-lg transition-all duration-200 ${
                      activeSection === section.id
                        ? "bg-gradient-to-r from-amber-100 to-amber-50"
                        : "hover:bg-gray-50"
                    }`}
                    style={{
                      color:
                        activeSection === section.id
                          ? "var(--primary-brown)"
                          : "var(--text-medium)",
                    }}
                  >
                    <div className="flex items-center">
                      <section.icon className="h-4 w-4 ml-3" />
                      <span className="text-sm font-medium">
                          {section.name}
                      </span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">{renderSectionContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

// Category Management Component
const CategoryManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // expense | income | product | both
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "expense",
    color: "#95684c",
    isActive: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["categories", { search, typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      params.set("limit", "100");
      return apiRequest(
        `${API_ENDPOINTS.CATEGORIES.LIST}?${params.toString()}`
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) =>
      apiRequest(API_ENDPOINTS.CATEGORIES.CREATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("دسته‌بندی ایجاد شد");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsModalOpen(false);
    },
    onError: (e) => toast.error(e.message || "ایجاد ناموفق بود"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) =>
      apiRequest(API_ENDPOINTS.CATEGORIES.UPDATE(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("دسته‌بندی ویرایش شد");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsModalOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message || "ویرایش ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) =>
      apiRequest(API_ENDPOINTS.CATEGORIES.DELETE(id), { method: "DELETE" }),
    onSuccess: () => {
      toast.success("حذف شد");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error(e.message || "حذف ناموفق بود"),
  });

  const categories = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--primary-brown)" }}
          >
            مدیریت دسته‌بندی‌ها
          </h2>
          <p className="text-gray-600 mt-1">
            افزودن، ویرایش و حذف دسته‌بندی‌ها
          </p>
        </div>
        <button
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200`}
          onClick={() => {
            setEditing(null);
            setForm({
              name: "",
              type: "expense",
              color: "#95684c",
              isActive: true,
            });
            setIsModalOpen(true);
          }}
        >
          <PlusIcon className="h-5 w-5" />
          <span>افزودن دسته‌بندی</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در دسته‌بندی‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputStyle} pr-10`}
            />
          </div>
          <div className="w-full sm:w-56">
            <select
              className={inputStyle}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">همه انواع</option>
              <option value="expense">هزینه</option>
              <option value="income">درآمد</option>
              <option value="both">هزینه و درآمد</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رنگ
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  فعال
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اقدامات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-6">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6">
                    موردی یافت نشد
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3 whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{c.type}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-block w-4 h-4 rounded align-middle"
                        style={{ backgroundColor: c.color || "#ccc" }}
                      />
                      <span className="mr-2 align-middle">
                        {c.color || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.isActive ? "بله" : "خیر"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditing(c);
                            setForm({
                              name: c.name || "",
                              type: c.type || "expense",
                              color: c.color || "#95684c",
                              isActive: c.isActive ?? true,
                            });
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="ویرایش"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("حذف شود؟"))
                              deleteMutation.mutate(c._id);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="حذف"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <GloableModal open={isModalOpen} setOpen={setIsModalOpen} isClose={true}>
        <div className=" w-[480px] max-h-[80vh] bg-white overflow-y-auto rounded-md">
          <div className=" mx-auto p-5 w-full rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editing ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی"}
              </h3>
              <span className="text-sm" style={{ color: "var(--text-medium)" }}>
                دسته‌بندی‌ها
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  className="block mb-2"
                  style={{ color: "var(--text-medium)" }}
                >
                  نام
                </label>
                <input
                  className={inputStyle}
                  name="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{ color: "var(--text-medium)" }}
                >
                  نوع
                </label>
                <select
                  className={inputStyle}
                  name="type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="expense">هزینه</option>
                  <option value="income">درآمد</option>
                  <option value="both">هزینه و درآمد</option>
                </select>
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{ color: "var(--text-medium)" }}
                >
                  رنگ
                </label>
                <input
                  className={inputStyle}
                  type="color"
                  name="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                <label
                  htmlFor="isActive"
                  style={{ color: "var(--text-medium)" }}
                >
                  فعال
                </label>
              </div>
            </div>
            <div className="flex items-center justify-start gap-2 mt-6">
              <button
                className={` cursor-pointer bg-transparent border border-slate-500 group  text-slate-600   duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
                onClick={() => {
                  setIsModalOpen(false);
                  setEditing(null);
                }}
              >
                لغو
              </button>
              <button
                className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200`}
                disabled={!form.name || !form.type}
                onClick={() =>
                  editing
                    ? updateMutation.mutate({ id: editing._id, payload: form })
                    : createMutation.mutate(form)
                }
              >
                {editing ? "ذخیره تغییرات" : "ثبت"}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

// Profile Management Component
const ProfileManagement = () => {
  const { user, setUser } = useAuth();
  const [imagePreview, setImagePreview] = useState(null);
  const [changeSetting, setChangeSetting] = useState(false);
  const [changeEmail, setChangeEmail] = useState(false);
  const Navigate = useNavigate();
  const { mutate: updatePassword } = useUpdatePassword();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const {
    register: emailReigster,
    handleSubmit: emailtHandleSubmit,
    formState: { errors: editError },
  } = useForm();
  const passwordSubmitLock = useSubmitLock();
  const emailSubmitLock = useSubmitLock();

  const updateEmailMutation = useUpdateProfile();

  const runMutation = (mutateFn, payload, callbacks = {}) =>
    new Promise((resolve, reject) => {
      mutateFn(payload, {
        onSuccess: (...args) => {
          callbacks.onSuccess?.(...args);
          resolve(...args);
        },
        onError: (error) => {
          callbacks.onError?.(error);
          reject(error);
        },
      });
    });

  const handlePassword = passwordSubmitLock.wrapSubmit(async (data) => {
    await runMutation(updatePassword, data);
    Navigate("/login");
  });

  const handleEmail = emailSubmitLock.wrapSubmit(async (data) => {
    // Filter out empty fields - only send fields that have values
    const updateData = Object.keys(data).reduce((acc, key) => {
      if (key === "image") {
        const file = data[key]?.[0];
        if (file) {
          acc[key] = file;
        }
      } else if (data[key]) {
        if (data[key].trim && data[key].trim() !== "") {
          acc[key] = data[key].trim();
        } else if (!data[key].trim) {
          acc[key] = data[key];
        }
      }
      return acc;
    }, {});

    // Only submit if at least one field has a value
    if (Object.keys(updateData).length === 0) {
      toast.error("لطفا حداقل یک فیلد را برای ویرایش وارد کنید");
      return;
    }

    await runMutation(updateEmailMutation.mutate, updateData, {
      onSuccess: async () => {
        setChangeEmail(false);
        setImagePreview(null);
        // Fetch updated user data
        try {
          const response = await apiRequest('/users/profile');
          setUser(response.user);
        } catch (error) {
          console.error('Failed to fetch updated profile:', error);
        }
        // Invalidate queries
        queryClient.invalidateQueries(["profile"]);
      },
    });
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const displayData = user;

  return (
    <div className="space-y-4">
      {/* Profile Picture Only */}
      <div className="card">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {displayData?.image && displayData.image !== 'default-user.jpg' ? (
              <img
                src={`${BACKEND_BASE_URL}/public/images/users/${displayData.image}`}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : displayData?.name ? (
              displayData.name.charAt(0).toUpperCase()
            ) : (
              "U"
            )}
          </div>
        </div>
      </div>

      {/* Profile Information - Row Layout */}
      <div className="card">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-dark)" }}>
          اطلاعات شخصی
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              نام کامل
            </label>
            <p className="text-sm text-gray-700">{displayData?.name || "-"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              ایمیل
            </label>
            <p className="text-sm text-gray-700">{displayData?.email || "-"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              نقش
            </label>
            <p className="text-sm text-gray-700">{displayData?.role || "کاربر"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              شماره تلفن
            </label>
            <p className="text-sm text-gray-700">{displayData?.phone || "-"}</p>
          </div>
        </div>
      </div>

      {/* Security Settings - Compact */}
      <div className="card">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-dark)" }}>
          تنظیمات امنیتی
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setChangeSetting(true)}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
          >
            <div className="flex items-center">
              <span className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                تغییر رمز عبور
              </span>
          </div>
            <span className="text-xs" style={{ color: "var(--text-medium)" }}>✎</span>
          </button>
          
          <button
            onClick={() => setChangeEmail(true)}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
          >
            <div className="flex items-center">
              <span className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                ویرایش پروفایل
            </span>
          </div>
            <span className="text-xs" style={{ color: "var(--text-medium)" }}>✎</span>
          </button>
        </div>
      </div>

      {/* Password Update Modal */}
      <GloableModal open={changeSetting} setOpen={setChangeSetting} isClose={true}>
        <div className="w-[500px] max-h-[80vh] bg-white overflow-y-auto rounded-md">
          <div className="mx-auto p-5 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                تغییر رمز عبور
              </h3>
            </div>
            <form
              noValidate
              onSubmit={handleSubmit(handlePassword)}
              className="space-y-4"
            >
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  رمز عبور فعلی
                  </label>
                  <input
                    type="password"
                    {...register("currentPassword", {
                      required: "لطفا پسورد قبلی تانرا وارد کنید",
                    })}
                  placeholder="رمز عبور فعلی"
                    className={inputStyle}
                  />
                  {errors.currentPassword && (
                  <p className="text-xs text-red-500 mt-1">
                      {errors.currentPassword.message}
                    </p>
                  )}
                </div>
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  رمز عبور جدید
                  </label>
                  <input
                    type="password"
                    {...register("newPassword", {
                      required: "لطفا پسورد جدید تانرا وارد کنید",
                    })}
                  placeholder="رمز عبور جدید"
                    className={inputStyle}
                  />
                  {errors.newPassword && (
                  <p className="text-xs text-red-500 mt-1">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="cursor-pointer bg-transparent border border-slate-500 text-slate-600 duration-200 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in"
                  onClick={() => setChangeSetting(false)}
                >
                  لغو
                </button>
            <button
                  type="submit"
              disabled={passwordSubmitLock.isSubmitting}
              className={`text-white duration-200 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in ${
                passwordSubmitLock.isSubmitting
                  ? "bg-amber-600/70 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-600/90 cursor-pointer"
              }`}
            >
              {passwordSubmitLock.isSubmitting ? "در حال ذخیره..." : "تغییر رمز"}
            </button>
          </div>
            </form>
          </div>
        </div>
      </GloableModal>

      {/* Profile Update Modal */}
      <GloableModal open={changeEmail} setOpen={setChangeEmail} isClose={true}>
        <div className="w-[500px] max-h-[80vh] bg-white overflow-y-auto rounded-md">
          <div className="mx-auto p-5 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ویرایش پروفایل
              </h3>
            </div>
            <form
              noValidate
              onSubmit={emailtHandleSubmit(handleEmail)}
              className="space-y-4"
            >
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                    نام کامل
                  </label>
                  <input
                    type="text"
                  {...emailReigster("name")}
                  placeholder="نام کامل"
                  defaultValue={displayData?.name || ""}
                    className={inputStyle}
                  />
                  {editError.name && (
                  <p className="text-xs text-red-500 mt-1">
                      {editError.name.message}
                    </p>
                  )}
                </div>
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  ایمیل
                  </label>
                  <input
                    type="email"
                    {...emailReigster("email", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "فرمت ایمیل صحیح نیست",
                    },
                    })}
                  placeholder="ایمیل"
                  defaultValue={displayData?.email || ""}
                    className={inputStyle}
                  />
                  {editError.email && (
                  <p className="text-xs text-red-500 mt-1">
                      {editError.email.message}
                    </p>
                  )}
                </div>
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  شماره تلفن
                </label>
                <input
                  type="tel"
                  {...emailReigster("phone")}
                  placeholder="شماره تلفن"
                  defaultValue={displayData?.phone || ""}
                  className={inputStyle}
                />
                {editError.phone && (
                  <p className="text-xs text-red-500 mt-1">
                    {editError.phone.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  تصویر پروفایل
                </label>
                <label className="relative cursor-pointer">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 hover:border-amber-400 transition-colors">
                    <PhotoIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">انتخاب تصویر</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    {...emailReigster("image")}
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="cursor-pointer bg-transparent border border-slate-500 text-slate-600 duration-200 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in"
                  onClick={() => setChangeEmail(false)}
                >
                  لغو
                </button>
                <button
                  type="submit"
                  disabled={emailSubmitLock.isSubmitting}
                  className={`text-white duration-200 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in ${
                    emailSubmitLock.isSubmitting
                      ? "bg-amber-600/70 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-600/90 cursor-pointer"
                  }`}
                >
                  {emailSubmitLock.isSubmitting
                    ? "در حال ذخیره..."
                    : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
        </div>
      </div>
      </GloableModal>
    </div>
  );
};

// User Management Component
const UserManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      return apiRequest(`${API_ENDPOINTS.AUTH.UPDATEUSERS}?${params.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) =>
      apiRequest(`${API_ENDPOINTS.AUTH.UPDATEUSERS}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("کاربر حذف شد");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e.message || "حذف ناموفق بود"),
  });

  const users = data?.data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--primary-brown)" }}>
            مدیریت کاربران
          </h2>
          <p className="text-gray-600 mt-1">مشاهده و مدیریت کاربران سیستم</p>
        </div>
      </div>

      <div className="card">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputStyle} pr-10`}
          />
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تصویر</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ایمیل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">تلفن</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">نقش</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">اقدامات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-6">در حال بارگذاری...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6">کاربری یافت نشد</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        {u.image && u.image !== 'default-user.jpg' ? (
                          <img
                            src={`${BACKEND_BASE_URL}/public/images/users/${u.image}`}
                            alt={u.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-amber-600 font-semibold">
                            {u.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (window.confirm("حذف شود؟"))
                            deleteMutation.mutate(u._id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="حذف"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
