import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import SaleForm from '../components/SaleForm';
import { useSale, useUpdateSale } from '../services/useApi';

function EditSale() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sale, isLoading, isError } = useSale(id);
  const { mutate: updateSale, isPending } = useUpdateSale();

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      saleDate: new Date().toISOString().slice(0, 10),
      customer: '',
      employee: '',
      paidAmount: 0,
      placedIn: '',
      invoiceType: 'small',
      description: '',
      discountAmount: 0,
    },
  });

  const handleUpdateSale = async (saleData) => {
    await new Promise((resolve, reject) => {
      updateSale(
        { id, ...saleData },
        {
          onSuccess: () => {
            toast.success(t('sales.toast.updateSuccess'));
            navigate('/sales');
            resolve();
          },
          onError: (error) => {
            toast.error(error.message || t('sales.toast.updateError'));
            reject(error);
          },
        }
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>{t('sales.details.loadError')}</p>
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="mt-4 text-amber-700 underline"
        >
          {t('saleForm.cancel')}
        </button>
      </div>
    );
  }

  const stockSourceKey =
    sale.employeeAccount || sale.employee ? 'employee' : 'store';

  return (
    <div className="p-4 bg-white rounded-sm border border-gray-200">
      <div className="rounded-2xl mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <ArrowRightIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('sales.edit.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {sale.billNumber || '—'}
            </p>
            <p className="text-sm text-amber-800 mt-2">
              {t('sales.edit.stockIssueNote', {
                location: t(`sales.edit.${stockSourceKey}`),
              })}
            </p>
          </div>
        </div>
      </div>

      <SaleForm
        register={register}
        handleSubmit={handleSubmit}
        watch={watch}
        setValue={setValue}
        onClose={() => navigate('/sales')}
        onSubmit={handleUpdateSale}
        editMode
        saleToEdit={sale}
        isSaving={isPending}
      />
    </div>
  );
}

export default EditSale;
