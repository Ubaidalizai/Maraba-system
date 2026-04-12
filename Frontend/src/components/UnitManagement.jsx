import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  const unitTypeLabel = (type) => {
    if (type === "weight") return t("admin.unitsPage.typeWeight");
    if (type === "count") return t("admin.unitsPage.typeCount");
    if (type === "volume") return t("admin.unitsPage.typeVolume");
    if (type === "length") return t("admin.unitsPage.typeLength");
    return type || "—";
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
            {t("admin.unitsPage.pageTitle")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("admin.unitsPage.pageSubtitle")}
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
        >
          <PlusIcon className="h-5 w-5" />
          <span>{t("admin.unitsPage.addButton")}</span>
        </button>
      </div>

      {/* Search and Stats */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("admin.unitsPage.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputStyle} pr-10`}
            />
          </div>
          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
            <span>
              {t("admin.common.total", { count: units?.data?.length || 0 })}
            </span>
            <span>
              {t("admin.common.showing", { count: filteredUnits.length })}
            </span>
            <span>
              {t("admin.unitsPage.baseCount", {
                count: units?.data?.filter((u) => u.is_base_unit).length || 0,
              })}
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
                  {t("admin.unitsPage.colName")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.unitsPage.colType")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.unitsPage.colBase")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.unitsPage.colFactor")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.unitsPage.colState")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.unitsPage.actions")}
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
                    <p>{t("admin.unitsPage.empty")}</p>
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
                        {unitTypeLabel(unit.unit_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {unit.base_unit?.name ||
                        (unit.is_base_unit ? t("admin.unitsPage.selfBase") : "-")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {unit.conversion_to_base} {unit.base_unit?.name || ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {unit.is_base_unit ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t("admin.unitsPage.badgeBase")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {t("admin.unitsPage.badgeDerived")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEdit(unit)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title={t("admin.unitsPage.tooltipEdit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentId(unit._id);
                            setDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title={t("admin.unitsPage.tooltipDelete")}
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
                  {editingUnit
                    ? t("admin.unitsPage.modalTitleEdit")
                    : t("admin.unitsPage.modalTitleAdd")}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">{t("admin.unitsPage.closeSr")}</span>
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
                      {t("admin.unitsPage.nameLabel")}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className={inputStyle}
                      placeholder={t("admin.unitsPage.namePlaceholder")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("admin.unitsPage.unitTypeLabel")}
                    </label>
                    <select
                      name="unit_type"
                      value={formData.unit_type}
                      onChange={handleInputChange}
                      required
                      className={inputStyle}
                    >
                      <option value="">
                        {t("admin.unitsPage.selectUnitType")}
                      </option>
                      <option value="weight">
                        {t("admin.unitsPage.typeWeight")}
                      </option>
                      <option value="count">
                        {t("admin.unitsPage.typeCount")}
                      </option>
                      <option value="volume">
                        {t("admin.unitsPage.typeVolume")}
                      </option>
                      <option value="length">
                        {t("admin.unitsPage.typeLength")}
                      </option>
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
                    {t("admin.unitsPage.isBaseLabel")}
                  </label>
                </div>

                {!formData.is_base_unit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("admin.unitsPage.baseUnitLabel")}
                      </label>
                      <select
                        name="base_unit"
                        value={formData.base_unit}
                        onChange={handleInputChange}
                        required={!formData.is_base_unit}
                        className={inputStyle}
                      >
                        <option value="">
                          {t("admin.unitsPage.selectBaseUnit")}
                        </option>
                        {units?.data?.filter(u => u.is_base_unit && u.unit_type === formData.unit_type).map(unit => (
                          <option key={unit._id} value={unit._id}>{unit.name}</option>
                        ))}
                      </select>
                      {formData.unit_type && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t("admin.unitsPage.baseUnitsAvailable", {
                            count:
                              units?.data?.filter(
                                (u) =>
                                  u.is_base_unit &&
                                  u.unit_type === formData.unit_type
                              ).length || 0,
                          })}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("admin.unitsPage.conversionLabel")}
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
                        {t("admin.unitsPage.conversionHint")}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.unitsPage.descriptionLabel")}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className={inputStyle}
                    placeholder={t("admin.unitsPage.descriptionPlaceholder")}
                  />
                </div>

                {formData.is_base_unit && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="flex">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400 ml-2" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">
                          {t("admin.unitsPage.infoBaseTitle")}
                        </p>
                        <p>{t("admin.unitsPage.infoBaseBody")}</p>
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
                    {t("admin.unitsPage.cancel")}
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
                      ? t("admin.unitsPage.saving")
                      : editingUnit
                      ? t("admin.unitsPage.update")
                      : t("admin.unitsPage.add")}
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
                {t("admin.unitsPage.delete.title")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t("admin.unitsPage.delete.message")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("admin.unitsPage.delete.cancel")}
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteConfirm(false);
                }}
                disabled={deleteUnitMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteUnitMutation.isPending
                  ? t("admin.unitsPage.delete.deleting")
                  : t("admin.unitsPage.delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default UnitManagement;
