import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useSarafs,
  useCreateSaraf,
  useUpdateSaraf,
  useDeleteSaraf,
} from "../services/useApi";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { inputStyle } from "./ProductForm";
import GloableModal from "./GloableModal";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

const SarafManagement = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSaraf, setEditingSaraf] = useState(null);
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

  const { data: sarafs, isLoading, error, refetch } = useSarafs();
  const { mutate: createSaraf, isPending: isCreatingSaraf } =
    useCreateSaraf();
  const { mutate: updateSaraf, isPending: isUpdatingSaraf } =
    useUpdateSaraf();
  const { mutate: deleteSaraf, isPending: isDeletingSaraf } =
    useDeleteSaraf();
  const submitLock = useSubmitLock();

  const filteredSarafs =
    sarafs?.data?.filter(
      (saraf) =>
        saraf.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saraf.contact_info?.email
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        saraf.contact_info?.phone?.includes(searchTerm) ||
        saraf.contact_info?.city
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    ) || [];
  const isSavingSaraf =
    submitLock.isSubmitting || isCreatingSaraf || isUpdatingSaraf;

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
    if (editingSaraf) {
      await runMutation(updateSaraf, {
        id: editingSaraf._id,
        sarafData: formData,
      });
    } else {
      await runMutation(createSaraf, formData);
    }

    setIsModalOpen(false);
    setEditingSaraf(null);
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

  const handleEdit = (saraf) => {
    setEditingSaraf(saraf);
    setFormData({
      name: saraf.name || "",
      contact_info: {
        phone: saraf.contact_info?.phone || "",
        email: saraf.contact_info?.email || "",
        address: saraf.contact_info?.address || "",
        city: saraf.contact_info?.city || "",
        state: saraf.contact_info?.state || "",
        zip_code: saraf.contact_info?.zip_code || "",
      },
    });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    deleteSaraf(currentId);
  };

  const handleAddNew = () => {
    setEditingSaraf(null);
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

  const totalCount = sarafs?.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--primary-brown)" }}
          >
            صرافان
          </h2>
          <p className="text-gray-600 mt-1">
            د صرافانو معلومات اداره کړئ
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
        >
          <PlusIcon className="h-5 w-5" />
          <span>نوی صراف اضافه کړئ</span>
        </button>
      </div>

      {/* Search and Stats */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="د صراف په نوم، تلیفون یا ښار لټون وکړئ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputStyle} pr-10`}
            />
          </div>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
            <span>{t("admin.common.total", { count: totalCount })}</span>
            <span>
              {t("admin.common.showing", {
                count: filteredSarafs.length,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Sarafs Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تلیفون
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ایمیل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  پته
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ښار
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSarafs.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>هیڅ صراف ونه موندل شو</p>
                  </td>
                </tr>
              ) : (
                filteredSarafs.map((saraf) => (
                  <tr key={saraf._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center ml-3">
                          <BanknotesIcon className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {saraf.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span>{saraf.contact_info?.phone || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400 ml-1" />
                        <span className="truncate max-w-xs">
                          {saraf.contact_info?.email || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 ml-1 flex-shrink-0" />
                        <span className="truncate max-w-xs">
                          {saraf.contact_info?.address || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {saraf.contact_info?.city || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEdit(saraf)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="تصحیح"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentId(saraf._id);
                            setDeleteConfirm(true);
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
        <div className=" bg-white rounded-md  w-[480px] h-[480px] overflow-y-auto">
          <div className=" mx-auto p-5 rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSaraf
                    ? "صراف تصحیح کړئ"
                    : "نوی صراف اضافه کړئ"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">بندول</span>
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
                    نوم *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={inputStyle}
                    placeholder="د صراف نوم داخل کړئ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ایمیل
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
                    تلیفون
                  </label>
                  <input
                    type="tel"
                    name="contact_info.phone"
                    value={formData.contact_info.phone}
                    onChange={handleInputChange}
                    className={inputStyle}
                    placeholder="0700123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    پوستی کوډ
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
                    پته
                  </label>
                  <textarea
                    name="contact_info.address"
                    value={formData.contact_info.address}
                    onChange={handleInputChange}
                    rows={2}
                    className={inputStyle}
                    placeholder="بشپړه پته داخل کړئ"
                  />
                </div>

                <div className=" col-span-2  grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ښار
                    </label>
                    <input
                      type="text"
                      name="contact_info.city"
                      value={formData.contact_info.city}
                      onChange={handleInputChange}
                      className={inputStyle}
                      placeholder="کابل"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ولایت
                    </label>
                    <input
                      type="text"
                      name="contact_info.state"
                      value={formData.contact_info.state}
                      onChange={handleInputChange}
                      className={inputStyle}
                      placeholder="کابل"
                    />
                  </div>
                </div>

                <div className="flex justify-start gap-x-3 space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`bg-transparent border border-slate-500 cursor-pointer group  text-slate-600  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
                  >
                    لغوه
                  </button>
                  <button
                    type="submit"
                  disabled={isSavingSaraf}
                  className={`bg-amber-600 text-white duration-200 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in ${
                    isSavingSaraf ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-amber-600/90"
                  }`}
                  >
                  {isSavingSaraf
                      ? "ثبتیږي..."
                      : editingSaraf
                      ? "بروزرسانی"
                      : "اضافه کړئ"}
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
                صراف حذف کړئ
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              ایا تاسو ډاډه یاست چې غواړئ دا صراف حذف کړئ؟
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                لغوه
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteConfirm(false);
                }}
                disabled={isDeletingSaraf}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingSaraf
                  ? "حذفیږي..."
                  : "هو، حذف یې کړئ"}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default SarafManagement;
