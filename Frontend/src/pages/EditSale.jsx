import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import SaleForm from "../components/SaleForm";
import { useSale, useUpdateSale } from "../services/useApi";
import { toast } from "react-toastify";
import { fetchSale } from "../services/apiUtiles";
import { useEffect, useState } from "react";

const EditSale = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: selectedSale, isLoading } = useSale(id);
  const updateSaleMutation = useUpdateSale();
  const [saleToEdit, setSaleToEdit] = useState(null);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      saleDate: new Date().toISOString().slice(0, 10),
      customer: "",
      employee: "",
      saleType: "cash",
      billType: "small",
      discount: 0,
      tax: 0,
      notes: "",
      items: [],
    },
  });

  useEffect(() => {
    const loadSaleData = async () => {
      if (id) {
        try {
          const detail = await fetchSale(id);
          const fullSale = detail?.sale || detail;
          setSaleToEdit(fullSale);
        } catch (error) {
          console.error("Error fetching sale details:", error);
          if (selectedSale) {
            setSaleToEdit(selectedSale);
          }
        }
      }
    };

    loadSaleData();
  }, [id, selectedSale]);

  const handleUpdateSale = (saleData) => {
    updateSaleMutation.mutate(
      { id, ...saleData },
      {
        onSuccess: () => {
          toast.success(t("sales.toast.updateSuccess"));
          navigate("/sales");
        },
        onError: (error) => {
          toast.error(`${t("sales.toast.updateError")}: ${error.message}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{t("sales.details.loading")}</p>
        </div>
      </div>
    );
  }

  if (!saleToEdit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-lg">{t("sales.details.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/sales")}
              className="p-3 hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
            >
              <ArrowRightIcon className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("saleForm.titleEdit")}
              </h1>
              <p className="text-gray-600 mt-2 text-base">{t("sales.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Sale Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <SaleForm
            register={register}
            handleSubmit={handleSubmit}
            watch={watch}
            setValue={setValue}
            onClose={() => navigate("/sales")}
            onSubmit={handleUpdateSale}
            editMode={true}
            saleToEdit={saleToEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default EditSale;
