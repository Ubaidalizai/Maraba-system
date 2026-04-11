function Confirmation({ handleClick, handleCancel }) {
  return (
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="bg-red-100 p-2 rounded-full mr-3">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">تأیید حذف</h3>
        </div>
        <p className="text-gray-600 mb-6">
          آیا مطمئن هستید که می‌خواهید این خرید را حذف کنید؟ این عمل قابل بازگشت
          نیست.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleCancel()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            لغو
          </button>
          <button
            onClick={handleClick}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

export default Confirmation;
