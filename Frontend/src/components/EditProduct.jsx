import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useProdcutItem, useUpdateProdcut } from "../services/useApi";
import Spinner from "./Spinner";
import Input from "./Input";
import Select from "./Select";
import NumberInput from "./NumberInput";
import TextArea from "./TextArea";
import Button from "./Button";
import ProductForm from "./ProductForm";

function EditProduct({ productId, onClose }) {
  const { data, isLoading, isError } = useProdcutItem(productId);
  const { mutate: updateProduct } = useUpdateProdcut();
  const { handleSubmit, reset, register, control, formState } = useForm({
    defaultValues: {
      itemName: "",
      unit: "",
      minLevel: "",
      tracker: "",
      description: "",
    },
  });
  // Reset form when API data is loaded
  useEffect(() => {
    if (data?.product) {
      reset({
        name: data?.product?.name ?? "",
        baseUnit: data?.product?.baseUnit ?? "",
        minLevel: data?.product?.minLevel ?? 0,
        latestPurchasePrice: data?.product?.latestPurchasePrice ?? "",
        description: data?.product?.description ?? "",
        trackByBatch: data?.product?.trackByBatch ?? false,
      });
    }
  }, [data, reset]);

  const onSubmit = (formData) => {
    console.log(formData);
    updateProduct(
      { id: productId, updatedItem: formData },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  if (isLoading) return <Spinner />;
  if (isError) return;

  return (
    <ProductForm
      register={register}
      control={control}
      formState={formState}
      handleSubmit={handleSubmit(onSubmit)}
    />
  );
}

export default EditProduct;
