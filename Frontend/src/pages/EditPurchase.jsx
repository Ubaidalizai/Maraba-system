import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import PurchaseForm from '../components/PurchaseForm';
import {
  usePurchase,
  usePurchaseStockConstraints,
  useUpdatePurchase,
} from '../services/useApi';

function EditPurchase() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePurchase(id);
  const { data: constraintsResp } = usePurchaseStockConstraints(id);
  const { mutate: updatePurchase, isPending } = useUpdatePurchase();

  const purchase = data?.purchase;
  const stockConstraints = constraintsResp?.data;

  const handleSubmit = async (purchaseData) => {
    await new Promise((resolve, reject) => {
      updatePurchase(
        {
          id,
          ...purchaseData,
          reason:
            purchaseData.reason || t('purchases.edit.defaultReason'),
        },
        {
          onSuccess: () => {
            toast.success(t('purchases.toast.editSuccess'));
            navigate('/purchases');
            resolve();
          },
          onError: (error) => {
            toast.error(
              error.message || t('purchases.toast.editError')
            );
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

  if (isError || !purchase) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>{t('purchases.details.loadError')}</p>
        <button
          type="button"
          onClick={() => navigate('/purchases')}
          className="mt-4 text-amber-700 underline"
        >
          {t('purchaseModal.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-sm border border-gray-200">
      <div className="rounded-2xl mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <ArrowRightIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('purchases.edit.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {purchase.supplierAccount?.name ||
                purchase.supplierName ||
                '—'}
            </p>
          </div>
        </div>
      </div>

      <PurchaseForm
        mode="edit"
        initialPurchase={purchase}
        stockConstraints={stockConstraints}
        onClose={() => navigate('/purchases')}
        onSubmit={handleSubmit}
        isSaving={isPending}
      />
    </div>
  );
}

export default EditPurchase;
