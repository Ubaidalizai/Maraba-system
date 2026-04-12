import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "../services/useApi";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { inputStyle } from "./ProductForm";
import GloableModal from "./GloableModal";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

const CustomerManagement = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletConfirm, setDeleteConfirm] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_info: {
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
    },
  });

  const { data: customers, isLoading, error, refetch } = useCustomers();
  const { mutate: createCustomer, isPending: isCreatingCustomer } =
    useCreateCustomer();
  const { mutate: updateCustomer, isPending: isUpdatingCustomer } =
    useUpdateCustomer();
  const { mutate: deleteCustomer, isPending: isDeletingCustomer } =
    useDeleteCustomer();
  const submitLock = useSubmitLock();

  // Filter customers based on search term
  const filteredCustomers =
    customers?.data?.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_info?.email
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.contact_info?.phone?.includes(searchTerm) ||
        customer.contact_info?.city
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    ) || [];
  const isSavingCustomer =
    submitLock.isSubmitting || isCreatingCustomer || isUpdatingCustomer;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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
        [name]: value,
      }));
    }
  };

  const runMutation = (mutateFn, payload) =>
    new Promise((resolve, reject) => {
      mutateFn(payload, {
        onSuccess: resolve,
        onError: reject,
      });
    });

  const handleSubmit = submitLock.wrapSubmit(async (e) => {
    e.preventDefault();
    if (editingCustomer) {
      await runMutation(updateCustomer, {
        id: editingCustomer._id,
        customerData: formData,
      });
    } else {
      await runMutation(createCustomer, formData);
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      contact_info: {
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
      },
    });
  });

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      contact_info: {
        phone: customer.contact_info?.phone || "",
        email: customer.contact_info?.email || "",
        address: customer.contact_info?.address || "",
        city: customer.contact_info?.city || "",
        state: customer.contact_info?.state || "",
        zip_code: customer.contact_info?.zip_code || "",
      },
    });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    deleteCustomer(currentId);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      contact_info: {
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
      },
    });
    setIsModalOpen(true);
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

  const totalCount = customers?.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--primary-brown)" }}
          >
            {t("admin.customersPage.pageTitle")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("admin.customersPage.pageSubtitle")}
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
        >
          <PlusIcon className="h-5 w-5" />
          <span>{t("admin.customersPage.addButton")}</span>
        </button>
      </div>

      {/* Search and Stats */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("admin.customersPage.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputStyle} pr-10`}
            />
          </div>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
            <span>{t("admin.common.total", { count: totalCount })}</span>
            <span>
              {t("admin.common.showing", {
                count: filteredCustomers.length,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.customersPage.table.name")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.customersPage.table.contact")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.customersPage.table.email")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.customersPage.table.address")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.customersPage.table.city")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.customersPage.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t("admin.customersPage.empty")}</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center ml-3">
                          <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span>{customer.contact_info?.phone || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span className="truncate max-w-xs">
                          {customer.contact_info?.email || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 ml-1 flex-shrink-0" />
                        <span className="truncate max-w-xs">
                          {customer.contact_info?.address || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.contact_info?.city || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title={t("admin.customersPage.tooltipEdit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentId(customer._id);
                            setDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title={t("admin.customersPage.tooltipDelete")}
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
        <div className=" bg-white rounded-md  w-[480px] h-[480px] overflow-y-auto">
          <div className=" mx-auto p-5 rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingCustomer
                    ? t("admin.customersPage.modalTitleEdit")
                    : t("admin.customersPage.modalTitleAdd")}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">
                    {t("admin.customersPage.closeSr")}
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
                className="space-y-2 grid grid-cols-2  gap-x-2"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.customersPage.nameLabel")}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={inputStyle}
                    placeholder={t("admin.customersPage.namePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.customersPage.email")}
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
                    {t("admin.customersPage.phone")}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.customersPage.zip")}
                  </label>
                  <input
                    type="text"
                    name="contact_info.zip_code"
                    value={formData.contact_info.zip_code}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="1234567890"
                  />
                </div>
                <div className=" col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.customersPage.address")}
                  </label>
                  <textarea
                    name="contact_info.address"
                    value={formData.contact_info.address}
                    onChange={handleInputChange}
                    rows={2}
                    className={inputStyle}
                    placeholder={t("admin.customersPage.addressPlaceholder")}
                  />
                </div>

                <div className=" col-span-2  grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("admin.customersPage.city")}
                    </label>
                    <input
                      type="text"
                      name="contact_info.city"
                      value={formData.contact_info.city}
                      onChange={handleInputChange}
                      className={inputStyle}
                      placeholder={t("admin.customersPage.cityPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("admin.customersPage.state")}
                    </label>
                    <input
                      type="text"
                      name="contact_info.state"
                      value={formData.contact_info.state}
                      onChange={handleInputChange}
                      className={inputStyle}
                      placeholder={t("admin.customersPage.statePlaceholder")}
                    />
                  </div>
                </div>

                <div className="flex justify-start gap-x-3 space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`bg-transparent border border-slate-500 cursor-pointer group  text-slate-600  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
                  >
                    {t("admin.customersPage.cancel")}
                  </button>
                  <button
                    type="submit"
                  disabled={isSavingCustomer}
                  className={`bg-amber-600 text-white duration-200 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in ${
                    isSavingCustomer ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-amber-600/90"
                  }`}
                  >
                  {isSavingCustomer
                      ? t("admin.customersPage.saving")
                      : editingCustomer
                      ? t("admin.customersPage.update")
                      : t("admin.customersPage.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </GloableModal>
      <GloableModal
        open={deletConfirm}
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
                {t("admin.customersPage.delete.title")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t("admin.customersPage.delete.message")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("admin.customersPage.delete.cancel")}
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteConfirm(false);
                }}
                disabled={isDeletingCustomer}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingCustomer
                  ? t("admin.customersPage.delete.deleting")
                  : t("admin.customersPage.delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default CustomerManagement;
