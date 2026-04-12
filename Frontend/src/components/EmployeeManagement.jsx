import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "../services/useApi";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import GloableModal from "./GloableModal";
import { inputStyle } from "./ProductForm";
import JalaliDatePicker from "./JalaliDatePicker";
import { normalizeDateToIso } from "../utilies/helper";

const EmployeeManagement = () => {
  const { t, i18n } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "salesman",
    contact_info: {
      phone: "",
      email: "",
      address: "",
    },
    hire_date: "",
    is_active: true,
  });

  const { data: employees, isLoading, error, refetch } = useEmployees();
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  const roleOptions = useMemo(
    () => [
      {
        value: "salesman",
        label: t("admin.employeesPage.roles.salesman"),
      },
      {
        value: "riding_man",
        label: t("admin.employeesPage.roles.riding_man"),
      },
      {
        value: "cashier",
        label: t("admin.employeesPage.roles.cashier"),
      },
      {
        value: "manager",
        label: t("admin.employeesPage.roles.manager"),
      },
      {
        value: "admin",
        label: t("admin.employeesPage.roles.admin"),
      },
    ],
    [t]
  );

  // Filter employees based on search term
  const filteredEmployees =
    employees?.data?.filter(
      (employee) =>
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.contact_info?.email
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        employee.contact_info?.phone?.includes(searchTerm) ||
        employee.role?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("contact_info.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        contact_info: {
          ...prev.contact_info,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingEmployee) {
      updateEmployeeMutation.mutate({
        id: editingEmployee._id,
        employeeData: formData,
      });
    } else {
      createEmployeeMutation.mutate(formData);
    }

    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({
      name: "",
      role: "salesman",
      contact_info: {
        phone: "",
        email: "",
        address: "",
      },
      hire_date: "",
      is_active: true,
    });
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || "",
      role: employee.role || "salesman",
      contact_info: {
        phone: employee.contact_info?.phone || "",
        email: employee.contact_info?.email || "",
        address: employee.contact_info?.address || "",
      },
      hire_date: normalizeDateToIso(employee.hire_date),
      is_active: employee.is_active !== undefined ? employee.is_active : true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    deleteEmployeeMutation.mutate(currentId);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      role: "salesman",
      contact_info: {
        phone: "",
        email: "",
        address: "",
      },
      hire_date: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const getRoleLabel = (role) => {
    const roleOption = roleOptions.find((option) => option.value === role);
    return roleOption ? roleOption.label : role;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag = lang === "ps" ? "ps-AF" : "fa-IR";
    return date.toLocaleDateString(localeTag);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4"
          style={{ borderColor: "var(--primary-brown)" }}
        ></div>
        <span className="mr-4 text-lg" style={{ color: "var(--text-medium)" }}>
          {t("admin.common.loading")}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-600 mb-2">
          {t("admin.common.errorTitle")}
        </h3>
        <p className="text-gray-600 mb-4">
          {error.message || t("admin.common.errorHint")}
        </p>
        <button onClick={() => refetch()} className="btn-primary">
          {t("admin.common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--primary-brown)" }}
          >
            {t("admin.employeesPage.pageTitle")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("admin.employeesPage.pageSubtitle")}
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
        >
          <PlusIcon className="h-5 w-5" />
          <span>{t("admin.employeesPage.addButton")}</span>
        </button>
      </div>

      {/* Search and Stats */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("admin.employeesPage.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
            <span>
              {t("admin.common.total", {
                count: employees?.data?.length || 0,
              })}
            </span>
            <span>
              {t("admin.common.showing", {
                count: filteredEmployees?.length || 0,
              })}
            </span>
            <span>
              {t("admin.employeesPage.activeCount", {
                count:
                  employees?.data?.filter((e) => e.is_active).length || 0,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colName")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colRole")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colContact")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colEmail")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colHireDate")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colStatus")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employeesPage.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t("admin.employeesPage.empty")}</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ml-3">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <BriefcaseIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span>{getRoleLabel(employee.role)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span>{employee.contact_info?.phone || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span className="truncate max-w-xs">
                          {employee.contact_info?.email || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span>{formatDate(employee.hire_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 ml-1" />
                          {t("admin.employeesPage.statusActive")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircleIcon className="h-3 w-3 ml-1" />
                          {t("admin.employeesPage.statusInactive")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title={t("admin.employeesPage.tooltipEdit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentId(employee._id);
                            setDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title={t("admin.employeesPage.tooltipDelete")}
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
        <div className=" w-[480px] h-[480px] rounded-md bg-white overflow-y-auto">
          <div className=" mx-auto p-5 w-full rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingEmployee
                    ? t("admin.employeesPage.modalTitleEdit")
                    : t("admin.employeesPage.modalTitleAdd")}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">
                    {t("admin.employeesPage.closeSr")}
                  </span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-2 grid grid-cols-2 gap-x-2 "
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.employeesPage.nameLabel")}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={inputStyle}
                    placeholder={t("admin.employeesPage.namePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.employeesPage.roleLabel")}
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className={inputStyle}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.employeesPage.email")}
                  </label>
                  <input
                    type="email"
                    name="contact_info.email"
                    value={formData.contact_info.email}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.employeesPage.phone")}
                  </label>
                  <input
                    type="tel"
                    name="contact_info.phone"
                    value={formData.contact_info.phone}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="09123456789"
                  />
                </div>

                <div>
                  <JalaliDatePicker
                    label={t("admin.employeesPage.hireDateLabel")}
                    value={formData.hire_date}
                    onChange={(nextValue) =>
                      setFormData((prev) => ({
                        ...prev,
                        hire_date: normalizeDateToIso(nextValue) || "",
                      }))
                    }
                    placeholder={t("admin.employeesPage.hireDatePlaceholder")}
                    clearable
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <label className="mr-2 block text-sm text-gray-700">
                    {t("admin.employeesPage.activeEmployee")}
                  </label>
                </div>
                <div className=" col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.employeesPage.address")}
                  </label>
                  <textarea
                    name="contact_info.address"
                    value={formData.contact_info.address}
                    onChange={handleInputChange}
                    rows={2}
                    className={inputStyle}
                    placeholder={t("admin.employeesPage.addressPlaceholder")}
                  />
                </div>
                <div className="flex justify-start  gap-x-3 space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`bg-transparent border border-slate-500 cursor-pointer group  text-slate-600   duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
                  >
                    {t("admin.employeesPage.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createEmployeeMutation.isPending ||
                      updateEmployeeMutation.isPending
                    }
                    className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in`}
                  >
                    {createEmployeeMutation.isPending ||
                    updateEmployeeMutation.isPending
                      ? t("admin.employeesPage.saving")
                      : editingEmployee
                      ? t("admin.employeesPage.update")
                      : t("admin.employeesPage.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </GloableModal>
      <GloableModal
        open={deleteConfirm}
        setOpen={setDeleteConfirm}
        isClose={true}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t("admin.employeesPage.delete.title")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t("admin.employeesPage.delete.message")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("admin.employeesPage.delete.cancel")}
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteConfirm(false);
                }}
                disabled={deleteEmployeeMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteEmployeeMutation.isPending
                  ? t("admin.employeesPage.delete.deleting")
                  : t("admin.employeesPage.delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default EmployeeManagement;
