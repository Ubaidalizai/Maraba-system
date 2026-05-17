import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PurchaseForm from '../components/PurchaseForm';
import { useCreatePurchase } from '../services/useApi';

function AddPurchase() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate: createPurchase } = useCreatePurchase();

  const handleSubmit = async (purchaseData) => {
    await new Promise((resolve, reject) => {
      createPurchase(purchaseData, {
        onSuccess: () => {
          navigate('/purchases');
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <div className='p-4 bg-white rounded-sm border border-gray-200'>
      {/* Header */}
      <div className='rounded-2xl mb-4'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/purchases')}
            className='p-2 hover:bg-gray-100 rounded-sm transition-colors'
          >
            <ArrowRightIcon className='h-5 w-5 text-gray-600' />
          </button>
          <h1 className='text-xl font-bold text-gray-900'>
            {t('purchaseModal.title')}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div>
        <PurchaseForm
          onClose={() => navigate('/purchases')}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

export default AddPurchase;
