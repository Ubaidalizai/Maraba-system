import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { CalendarDays, ClipboardList, Info, Package, User } from "lucide-react";
import { useState } from "react";
import Button from "../components/Button";
import EditProduct from "../components/EditProduct";
import GloableModal from "../components/GloableModal";
import Pagination from "../components/Pagination";
import SearchInput from "../components/SearchInput";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import TableRow from "../components/TableRow";
import {
  useDeleteProdcut,
  useCreateProdcut,
  useProduct,
} from "../services/useApi";
import { formatNumber } from "../utilies/helper";
import ProductForm from "../components/ProductForm";
import { useForm } from "react-hook-form";

const headers = [
  { title: "اسم جنس" },
  { title: "واحد پایه" },
  { title: "ردیابی بچ" },
  { title: "عملیات" },
];

function Product() {
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProdcut();
  const { mutate: createProduct, isPending: isCreating } = useCreateProdcut();
  const { register, handleSubmit, formState, reset, control } = useForm();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data: productList, isLoading } = useProduct({ search, page, limit });

  const [isEditable, setIsEditable] = useState(false);
  const [showData, setShowData] = useState(false);
  const [show, setShow] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openCreateProduct, setOpenCreateProduct] = useState(false);
  const [selectedPro, setSelectedPro] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Handle delete product
  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  // Confirm delete product
  const confirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProduct(productToDelete._id, {});
      setShowDeleteConfirm(false);
    }
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setSelectedPro(product);
    setIsEditable(true);
  };

  // Handle view product
  const handleViewProduct = (product) => {
    setSelectedPro(product);
    setShowData(true);
  };

  // Handle close modals
  const handleCloseEdit = () => {
    setIsEditable(false);
    setSelectedPro(null);
  };

  const handleCloseView = () => {
    setShowData(false);
    setSelectedPro(null);
  };

  const handleOpenCreate = () => {
    reset();
    setOpenCreateProduct(true);
  };

  const onSubmit = (data) => {
    createProduct(data, {
      onSuccess: () => {
        setOpenCreateProduct(false);
        reset();
      },
    });
  };
  // keep search input mounted while loading to preserve focus
  return (
    <section className="w-full">
      <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-3 bg-white border-slate-200 rounded-md border my-1.5 px-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full">
          <SearchInput
            placeholder="جستجو بر اساس نام جنس..."
            value={search}
            onChange={(e) => setSearch(e?.target ? e.target.value : e)}
          />
          <Button
            onClick={handleOpenCreate}
            icon={<PlusIcon className="h-5 w-5" />}
            disabled={isCreating}
            className="md:w-[200px] text-white bg-amber-600"
          >
            اضافه کردن جنس
          </Button>
        </div>
      </div>
      <GloableModal open={openCreateProduct} setOpen={setOpenCreateProduct}>
        <ProductForm
          register={register}
          handleSubmit={handleSubmit(onSubmit)}
          formState={formState}
          control={control}
          onClose={() => setOpenCreateProduct(false)}
        />
      </GloableModal>
      <Table>
        <TableHeader headerData={headers} />
        <TableBody>
          {isLoading ? (
            <TableRow key="loading">
              <TableColumn colSpan={headers.length} className="text-center">
                <div className=" w-full h-[120px] flex justify-center items-center">
                  <div className="text-gray-500">در حال بارگذاری...</div>
                </div>
              </TableColumn>
            </TableRow>
          ) : productList?.data?.length > 0 ? (
            productList?.data?.map((el) => (
              <TableRow key={el._id}>
                <TableColumn>{el?.name}</TableColumn>
                <TableColumn>{el?.baseUnit?.name || "-"}</TableColumn>

                <TableColumn>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      el?.trackByBatch
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {el?.trackByBatch ? "فعال" : "غیرفعال"}
                  </span>
                </TableColumn>
                <TableColumn>
                  <div className=" flex items-center justify-center gap-x-2">
                    <button
                      className="text-yellow-600 hover:text-yellow-900"
                      onClick={() => handleViewProduct(el)}
                      title="مشاهده"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => handleEditProduct(el)}
                      title="ویرایش"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteProduct(el)}
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </TableColumn>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableColumn
                colSpan={headers.length}
                className="text-center py-8 text-gray-500"
              >
                هیچ محصولی یافت نشد
              </TableColumn>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="mt-2 w-full items-center justify-center">
        <Pagination
          page={page}
          limit={limit}
          total={productList?.total || 0}
          totalPages={productList?.totalPages || 0}
          onPageChange={setPage}
          onRowsPerPageChange={setLimit}
        />
      </div>
      <GloableModal open={isEditable} setOpen={handleCloseEdit}>
        <EditProduct productId={selectedPro?._id} onClose={handleCloseEdit} />
      </GloableModal>

      <GloableModal open={show} setOpen={setShow}>
        {selectedPro && (
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Product Details
              </h2>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setShow(false)}>بسته کردن</Button>
            </div>
          </div>
        )}
      </GloableModal>
      <GloableModal open={showData} setOpen={handleCloseView}>
        {selectedPro && (
          <div
            dir="rtl"
            className="w-[500px] mx-auto bg-white rounded-sm shadow-sm overflow-hidden"
          >
            <div className=" p-6 text-slate-800 flex  items-center  gap-3 ">
              <p className="text-2xl  font-black">
                {selectedPro._id?.slice(-6)}#
              </p>
              <h2 className="text-2xl font-bold text-palm-500">
                {selectedPro.name}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
                {/* Base Unit */}
                <div className=" flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm  font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <Package className=" text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">واحد پایه</span>
                  </h3>
                  <p className="text-lg font-semibold text-palm-400">
                    {selectedPro.baseUnit?.name || "-"}
                  </p>
                </div>

                {/* Min Level */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <ClipboardList className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">حداقل سطح</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro.minLevel || 0} عدد
                  </p>
                </div>

                {/* Latest Purchase Price */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <User className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">
                      آخرین قیمت خرید
                    </span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro.latestPurchasePrice
                      ? `${formatNumber(
                          selectedPro.latestPurchasePrice
                        )} افغانی`
                      : "-"}
                  </p>
                </div>

                {/* Track by Batch */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <CalendarDays className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">ردیابی بچ</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPro.trackByBatch ? "فعال" : "غیرفعال"}
                  </p>
                </div>

                {/* Created Date */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <CalendarDays className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">تاریخ ایجاد</span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedPro.createdAt).toLocaleDateString(
                      "fa-IR"
                    )}
                  </p>
                </div>

                {/* Updated Date */}
                <div className="flex flex-col  items-start gap-x-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-end gap-1">
                    <CalendarDays className="text-2xl text-palm-500" />
                    <span className="text-lg text-palm-500">
                      آخرین بروزرسانی
                    </span>
                  </h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedPro.updatedAt).toLocaleDateString(
                      "fa-IR"
                    )}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              <div className="flex flex-col  items-start gap-x-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center justify-end gap-1">
                  <Info className="text-2xl text-palm-500" />
                  <span className="text-[16px] text-palm-500">توضیحات</span>
                </h3>
                <p className="text-gray-800 leading-relaxed text-right">
                  {selectedPro.description || "هیچ توضیحی در دسترس نیست."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <Button onClick={handleCloseView}>بسته کردن</Button>
            </div>
          </div>
        )}
      </GloableModal>

      {/* Delete Confirmation Modal */}
      <GloableModal
        open={showDeleteConfirm}
        setOpen={setShowDeleteConfirm}
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
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                لغو
              </button>
              <button
                onClick={() => {
                  confirmDeleteProduct();
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "در حال حذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </section>
  );
}

export default Product;
