import { CgCloseO } from "react-icons/cg";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState("suppliers");

  const adminSections = useMemo(
    () => [
      {
        id: "profile",
        name: t("admin.sections.profile.name"),
        icon: IdentificationIcon,
        description: t("admin.sections.profile.description"),
      },
      {
        id: "users",
        name: t("admin.sections.users.name"),
        icon: UserIcon,
        description: t("admin.sections.users.description"),
      },
      {
        id: "suppliers",
        name: t("admin.sections.suppliers.name"),
        icon: BuildingOfficeIcon,
        description: t("admin.sections.suppliers.description"),
      },
      {
        id: "categories",
        name: t("admin.sections.categories.name"),
        icon: TagIcon,
        description: t("admin.sections.categories.description"),
      },
      {
        id: "customers",
        name: t("admin.sections.customers.name"),
        icon: UserGroupIcon,
        description: t("admin.sections.customers.description"),
      },
      {
        id: "employees",
        name: t("admin.sections.employees.name"),
        icon: UserIcon,
        description: t("admin.sections.employees.description"),
      },
      {
        id: "units",
        name: t("admin.sections.units.name"),
        icon: ScaleIcon,
        description: t("admin.sections.units.description"),
      },
    ],
    [t]
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            {t("admin.unauthorizedTitle")}
          </h2>
          <p className="text-gray-600">{t("admin.unauthorizedMessage")}</p>
        </div>
      </div>
    );
  }

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
                {t("admin.title")}
              </h1>
              <p
                className="mt-1 text-lg"
                style={{ color: "var(--text-medium)" }}
              >
                {t("admin.subtitle")}
              </p>
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
                  {t("admin.adminAccess")}
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
                {t("admin.sectionsTitle")}
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
  const { t } = useTranslation();
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
      toast.success(t("admin.categoriesPage.toastCreated"));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsModalOpen(false);
    },
    onError: (e) =>
      toast.error(e.message || t("admin.categoriesPage.errCreate")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) =>
      apiRequest(API_ENDPOINTS.CATEGORIES.UPDATE(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success(t("admin.categoriesPage.toastUpdated"));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsModalOpen(false);
      setEditing(null);
    },
    onError: (e) =>
      toast.error(e.message || t("admin.categoriesPage.errUpdate")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) =>
      apiRequest(API_ENDPOINTS.CATEGORIES.DELETE(id), { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("admin.categoriesPage.toastDeleted"));
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) =>
      toast.error(e.message || t("admin.categoriesPage.errDelete")),
  });

  const categories = data?.data || [];

  const categoryTypeLabel = (type) => {
    if (type === "expense") return t("admin.categoriesPage.typeExpenseShort");
    if (type === "income") return t("admin.categoriesPage.typeIncomeShort");
    if (type === "both") return t("admin.categoriesPage.typeBothShort");
    return type || "—";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--primary-brown)" }}
          >
            {t("admin.categoriesPage.title")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("admin.categoriesPage.subtitle")}
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
          <span>{t("admin.categoriesPage.add")}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("admin.categoriesPage.searchPlaceholder")}
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
              <option value="">{t("admin.categoriesPage.filterAll")}</option>
              <option value="expense">
                {t("admin.categoriesPage.typeExpense")}
              </option>
              <option value="income">
                {t("admin.categoriesPage.typeIncome")}
              </option>
              <option value="both">{t("admin.categoriesPage.typeBoth")}</option>
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
                  {t("admin.categoriesPage.tableName")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.categoriesPage.tableType")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.categoriesPage.tableColor")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.categoriesPage.tableActive")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.categoriesPage.tableActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-6">
                    {t("admin.common.loading")}
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6">
                    {t("admin.categoriesPage.empty")}
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3 whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {categoryTypeLabel(c.type)}
                    </td>
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
                      {c.isActive
                        ? t("admin.categoriesPage.yes")
                        : t("admin.categoriesPage.no")}
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
                          title={t("admin.categoriesPage.tooltipEdit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                t("admin.common.shortDeleteConfirm")
                              )
                            )
                              deleteMutation.mutate(c._id);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title={t("admin.categoriesPage.tooltipDelete")}
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
                {editing
                  ? t("admin.categoriesPage.modalEdit")
                  : t("admin.categoriesPage.modalAdd")}
              </h3>
              <span className="text-sm" style={{ color: "var(--text-medium)" }}>
                {t("admin.categoriesPage.badge")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  className="block mb-2"
                  style={{ color: "var(--text-medium)" }}
                >
                  {t("admin.categoriesPage.labelName")}
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
                  {t("admin.categoriesPage.labelType")}
                </label>
                <select
                  className={inputStyle}
                  name="type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="expense">
                    {t("admin.categoriesPage.typeExpense")}
                  </option>
                  <option value="income">
                    {t("admin.categoriesPage.typeIncome")}
                  </option>
                  <option value="both">
                    {t("admin.categoriesPage.typeBoth")}
                  </option>
                </select>
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{ color: "var(--text-medium)" }}
                >
                  {t("admin.categoriesPage.labelColor")}
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
                  {t("admin.categoriesPage.labelActive")}
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
                {t("admin.categoriesPage.cancel")}
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
                {editing
                  ? t("admin.categoriesPage.saveEdit")
                  : t("admin.categoriesPage.saveNew")}
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
  const { t } = useTranslation();
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
      toast.error(t("admin.profilePage.toastMinField"));
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
                alt={t("admin.profilePage.avatarAlt")}
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
          {t("admin.profilePage.personalInfo")}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              {t("admin.profilePage.fullName")}
            </label>
            <p className="text-sm text-gray-700">{displayData?.name || "-"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              {t("admin.profilePage.email")}
            </label>
            <p className="text-sm text-gray-700">{displayData?.email || "-"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              {t("admin.profilePage.role")}
            </label>
            <p className="text-sm text-gray-700">
              {displayData?.role || t("admin.profilePage.defaultRole")}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-medium)" }}>
              {t("admin.profilePage.phone")}
            </label>
            <p className="text-sm text-gray-700">{displayData?.phone || "-"}</p>
          </div>
        </div>
      </div>

      {/* Security Settings - Compact */}
      <div className="card">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-dark)" }}>
          {t("admin.profilePage.securityTitle")}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setChangeSetting(true)}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
          >
            <div className="flex items-center">
              <span className="text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                {t("admin.profilePage.changePassword")}
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
                {t("admin.profilePage.editProfile")}
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
                {t("admin.profilePage.passwordTitle")}
              </h3>
            </div>
            <form
              noValidate
              onSubmit={handleSubmit(handlePassword)}
              className="space-y-4"
            >
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                  {t("admin.profilePage.currentPassword")}
                  </label>
                  <input
                    type="password"
                    {...register("currentPassword", {
                      required: t("admin.profilePage.currentPasswordRequired"),
                    })}
                  placeholder={t("admin.profilePage.currentPasswordPh")}
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
                  {t("admin.profilePage.newPassword")}
                  </label>
                  <input
                    type="password"
                    {...register("newPassword", {
                      required: t("admin.profilePage.newPasswordRequired"),
                    })}
                  placeholder={t("admin.profilePage.newPasswordPh")}
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
                  {t("admin.profilePage.cancel")}
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
              {passwordSubmitLock.isSubmitting
                ? t("admin.profilePage.changingPassword")
                : t("admin.profilePage.changePasswordSubmit")}
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
                {t("admin.profilePage.editProfileTitle")}
              </h3>
            </div>
            <form
              noValidate
              onSubmit={emailtHandleSubmit(handleEmail)}
              className="space-y-4"
            >
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "var(--text-dark)" }}>
                    {t("admin.profilePage.fullName")}
                  </label>
                  <input
                    type="text"
                  {...emailReigster("name")}
                  placeholder={t("admin.profilePage.fullNamePh")}
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
                  {t("admin.profilePage.email")}
                  </label>
                  <input
                    type="email"
                    {...emailReigster("email", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t("admin.profilePage.emailInvalid"),
                    },
                    })}
                  placeholder={t("admin.profilePage.emailPh")}
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
                  {t("admin.profilePage.phone")}
                </label>
                <input
                  type="tel"
                  {...emailReigster("phone")}
                  placeholder={t("admin.profilePage.phonePh")}
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
                  {t("admin.profilePage.profileImage")}
                </label>
                <label className="relative cursor-pointer">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 hover:border-amber-400 transition-colors">
                    <PhotoIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {t("admin.profilePage.chooseImage")}
                    </span>
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
                      alt={t("admin.profilePage.previewAlt")}
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
                  {t("admin.profilePage.cancel")}
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
                    ? t("admin.profilePage.saving")
                    : t("admin.profilePage.saveChanges")}
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
  const { t } = useTranslation();
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
      toast.success(t("admin.usersPage.toastDeleted"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) =>
      toast.error(e.message || t("admin.usersPage.errDelete")),
  });

  const users = data?.data?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--primary-brown)" }}>
            {t("admin.usersPage.title")}
          </h2>
          <p className="text-gray-600 mt-1">{t("admin.usersPage.subtitle")}</p>
        </div>
      </div>

      <div className="card">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("admin.usersPage.searchPlaceholder")}
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colImage")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colName")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colEmail")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colPhone")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colRole")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colStatus")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("admin.usersPage.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-6">
                    {t("admin.common.loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6">
                    {t("admin.usersPage.empty")}
                  </td>
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
                        {u.isActive
                          ? t("admin.usersPage.statusActive")
                          : t("admin.usersPage.statusInactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              t("admin.common.shortDeleteConfirm")
                            )
                          )
                            deleteMutation.mutate(u._id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title={t("admin.usersPage.tooltipDelete")}
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
