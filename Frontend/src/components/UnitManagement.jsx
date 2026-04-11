import React, { useState } from "react";
import {
  useUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from "../services/useApi";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import GloableModal from "./GloableModal";
import { inputStyle } from "./ProductForm";

const UnitManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    conversion_to_base: 1,
    is_base_unit: false,
    base_unit: "",
    unit_type: "",
  });

  const { data: units, isLoading, error, refetch } = useUnits();
  const createUnitMutation = useCreateUnit();
  const updateUnitMutation = useUpdateUnit();
  const deleteUnitMutation = useDeleteUnit();

  // Filter units based on search term
  const filteredUnits =
    units?.data?.filter(
      (unit) =>
        unit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingUnit) {
      updateUnitMutation.mutate({
        id: editingUnit._id,
        unitData: formData,
      });
    } else {
      createUnitMutation.mutate(formData);
    }

    setIsModalOpen(false);
    setEditingUnit(null);
    setFormData({
      name: "",
      description: "",
      conversion_to_base: 1,
      is_base_unit: false,
      base_unit: "",
      unit_type: "",
    });
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name || "",
      description: unit.description || "",
      conversion_to_base: unit.conversion_to_base || 1,
      is_base_unit: unit.is_base_unit || false,
      base_unit: unit.base_unit?._id || "",
      unit_type: unit.unit_type || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    deleteUnitMutation.mutate(currentId);
  };

  const handleAddNew = () => {
    setEditingUnit(null);
    setFormData({
      name: "",
      description: "",
      conversion_to_base: 1,
      is_base_unit: false,
      base_unit: "",
      unit_type: "",
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
          در حال بارگذاری...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-600 mb-2">
          خطا در بارگذاری داده‌ها
        </h3>
        <p className="text-gray-600 mb-4">
          {error.message || "لطفاً صفحه را رفرش کنید یا دوباره تلاش کنید"}
        </p>
        <button onClick={() => refetch()} className="btn-primary">
          تلاش مجدد
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
            مدیریت واحدها
          </h2>
          <p className="text-gray-600 mt-1">
            افزودن، ویرایش و حذف واحدهای اندازه‌گیری
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
        >
          <PlusIcon className="h-5 w-5" />
          <span>افزودن واحد</span>
        </button>
      </div>

      {/* Search and Stats */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="جستجو در واحدها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputStyle} pr-10`}
            />
          </div>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
            <span>کل: {units?.data?.length || 0}</span>
            <span>نمایش: {filteredUnits.length}</span>
            <span>
              واحد پایه:{" "}
              {units?.data?.filter((u) => u.is_base_unit).length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Units Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نام واحد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع واحد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  واحد پایه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ضریب تبدیل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  حالت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <ScaleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>هیچ واحدی یافت نشد</p>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ScaleIcon className="h-8 w-8 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {unit.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {unit.description || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        unit.unit_type === 'weight' ? 'bg-blue-100 text-blue-800' :
                        unit.unit_type === 'count' ? 'bg-green-100 text-green-800' :
                        unit.unit_type === 'volume' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.unit_type === 'weight' ? 'وزن' :
                         unit.unit_type === 'count' ? 'تعداد' :
                         unit.unit_type === 'volume' ? 'حجم' : unit.unit_type || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {unit.base_unit?.name || (unit.is_base_unit ? 'خودش' : '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {unit.conversion_to_base} {unit.base_unit?.name || ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.is_base_unit ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          واحد پایه
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          واحد فرعی
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEdit(unit)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="ویرایش"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentId(unit._id);
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
        <div className=" w-[480px] h-[400px] bg-white overflow-y-auto  rounded-md">
          <div className=" mx-auto p-5  w-full rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUnit ? "ویرایش واحد" : "افزودن واحد جدید"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">بستن</span>
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
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام واحد *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className={inputStyle}
                      placeholder="مثال: کیلوگرم، کارتن، بسته"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نوع واحد *
                    </label>
                    <select
                      name="unit_type"
                      value={formData.unit_type}
                      onChange={handleInputChange}
                      required
                      className={inputStyle}
                    >
                      <option value="">انتخاب نوع واحد</option>
                      <option value="weight">وزن</option>
                      <option value="count">تعداد</option>
                      <option value="volume">حجم</option>
                      <option value="length">طول</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_base_unit"
                    checked={formData.is_base_unit}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="mr-2 block text-sm text-gray-700">
                    این واحد، واحد پایه است
                  </label>
                </div>

                {!formData.is_base_unit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        واحد پایه *
                      </label>
                      <select
                        name="base_unit"
                        value={formData.base_unit}
                        onChange={handleInputChange}
                        required={!formData.is_base_unit}
                        className={inputStyle}
                      >
                        <option value="">انتخاب واحد پایه</option>
                        {units?.data?.filter(u => u.is_base_unit && u.unit_type === formData.unit_type).map(unit => (
                          <option key={unit._id} value={unit._id}>{unit.name}</option>
                        ))}
                      </select>
                      {formData.unit_type && (
                        <p className="text-xs text-gray-500 mt-1">
                          واحدهای پایه موجود: {units?.data?.filter(u => u.is_base_unit && u.unit_type === formData.unit_type).length}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ضریب تبدیل *
                      </label>
                      <input
                        type="number"
                        name="conversion_to_base"
                        value={formData.conversion_to_base}
                        onChange={handleInputChange}
                        min="0.0001"
                        step="0.0001"
                        required
                        className={inputStyle}
                        placeholder="10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        مثال: 1 کارتن = 10 قطعه
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    توضیحات
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className={inputStyle}
                    placeholder="توضیحات واحد (اختیاری)"
                  />
                </div>

                {formData.is_base_unit && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="flex">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400 ml-2" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">واحد پایه</p>
                        <p>
                          این واحد به عنوان واحد اصلی برای محاسبات استفاده خواهد
                          شد.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-start gap-x-3  space-x-reverse pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={` bg-transparent border border-slate-600 cursor-pointer group  text-slate-700  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createUnitMutation.isPending ||
                      updateUnitMutation.isPending
                    }
                    className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
                  >
                    {createUnitMutation.isPending ||
                    updateUnitMutation.isPending
                      ? "در حال ذخیره..."
                      : editingUnit
                      ? "به‌روزرسانی"
                      : "افزودن"}
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
              <h3 className="text-lg font-semibold text-gray-900">تأیید حذف</h3>
            </div>
            <p className="text-gray-600 mb-6">
              آیا مطمئن هستید که می‌خواهید این خرید را حذف کنید؟ این عمل قابل
              بازگشت نیست.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                لغو
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteConfirm(false);
                }}
                disabled={deleteUnitMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteUnitMutation.isPending ? "در حال حذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default UnitManagement;
