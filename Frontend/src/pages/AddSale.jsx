import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import SaleForm from "../components/SaleForm";
import { useCreateSale, useCustomers } from "../services/useApi";
import { toast } from "react-toastify";
import { fetchSale, fetchAccounts } from "../services/apiUtiles";
import { useState } from "react";
import GloableModal from "../components/GloableModal";
import SaleBillPrint from "../components/SaleBillPrint";

const AddSale = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: createSaleAsync } = useCreateSale();
  const { data: customers } = useCustomers();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState(null);
  const [customerToPrint, setCustomerToPrint] = useState(null);
  const [customerAccountToPrint, setCustomerAccountToPrint] = useState(null);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      saleDate: new Date().toISOString().slice(0, 10),
      customer: "",
      employee: "",
      saleType: "cash",
      billType: "small",
      discount: 0,
      discountAmount: 0,
      tax: 0,
      notes: "",
      items: [],
    },
  });

  const handleCreateSale = async (saleData) => {
    try {
      const createdSale = await createSaleAsync(saleData);
      const saleResponse = createdSale.sale || createdSale;
      const saleId = saleResponse._id || saleResponse.id;
      const customerId = saleResponse.customer?._id || saleResponse.customer;

      let fullSale = saleResponse;
      try {
        const detail = await fetchSale(saleId);
        if (detail) {
          fullSale = detail.sale || detail;
        }
      } catch (err) {
        console.error("Error fetching sale details:", err);
      }

      const customer = customers?.data?.find((c) => c._id === customerId);

      if (customerId) {
        try {
          const accountsData = await fetchAccounts({
            type: "customer",
          });
          const customerAccount = accountsData?.accounts?.find(
            (acc) => acc.refId === customerId
          );

          setSaleToPrint(fullSale);
          setCustomerToPrint(customer);
          setCustomerAccountToPrint(customerAccount || null);
          setShowPrintModal(true);
        } catch (error) {
          console.error("Error fetching customer account:", error);
          setSaleToPrint(fullSale);
          setCustomerToPrint(customer);
          setCustomerAccountToPrint(null);
          setShowPrintModal(true);
        }
      } else {
        setSaleToPrint(fullSale);
        setCustomerToPrint(null);
        setCustomerAccountToPrint(null);
        setShowPrintModal(true);
      }
    } catch (error) {
      toast.error(`${t("sales.toast.createError")}: ${error.message}`);
      throw error;
    }
  };

  return (
    <div>
      <div className="p-4 bg-white rounded-sm border border-gray-200">
        <div className="rounded-2xl mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
            >
              <ArrowRightIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {t("sales.filters.addSale")}
            </h1>
          </div>
        </div>

        <SaleForm
            register={register}
            handleSubmit={handleSubmit}
            watch={watch}
            setValue={setValue}
            onClose={() => navigate("/sales")}
            onSubmit={handleCreateSale}
            editMode={false}
            saleToEdit={null}
          />
      </div>

      {/* Print Modal */}
      <GloableModal
        open={showPrintModal}
        setOpen={setShowPrintModal}
        isClose={true}
        isClosableByDefault={true}
      >
        {showPrintModal && saleToPrint && (
          <SaleBillPrint
            sale={saleToPrint}
            customer={customerToPrint}
            customerAccount={customerAccountToPrint}
            onClose={() => {
              setShowPrintModal(false);
              setSaleToPrint(null);
              setCustomerToPrint(null);
              setCustomerAccountToPrint(null);
              navigate("/sales");
            }}
            autoPrint={false}
          />
        )}
      </GloableModal>
    </div>
  );
};

export default AddSale;
