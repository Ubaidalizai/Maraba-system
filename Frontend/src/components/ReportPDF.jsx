import React from "react";
import { useTranslation } from "react-i18next";

const ReportPDF = ({ data, reportDate }) => {
  const { t } = useTranslation();

  if (!data) return null;

  return (
    <div style={{ fontFamily: "'Noto Nastaliq Urdu', Arial, serif", direction: 'rtl', backgroundColor: 'white', padding: '1rem' }}>
      <style>{`
        #daily-report-content * {
          font-family: 'Noto Nastaliq Urdu', Arial, serif !important;
        }
      `}</style>
      
      {/* Report Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #d1d5db', paddingBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ورځنی راپور</h2>
        <p style={{ fontSize: '1.25rem', color: '#6b7280', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
          نېټه: {new Date(reportDate).toLocaleDateString('fa-AF')}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight:'bold' }}>{t("dailyReport.purchases")}</p>
          <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
            {data.summary.totalPurchases.toLocaleString()}
          </p>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>افغانۍ</p>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight:'bold' }}>{t("dailyReport.sales")}</p>
          <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
            {data.summary.totalSales.toLocaleString()}
          </p>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>افغانۍ</p>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight:'bold' }}>{t("dailyReport.totalExpenses")}</p>
          <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
            {data.summary.totalExpenses.toLocaleString()}
          </p>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>افغانۍ</p>
        </div>
      </div>

      {/* Store, Customer, Supplier Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Store Summary */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontWeight:'bold' }}>د دوکان معلومات</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ارزښت:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.storeValue.toLocaleString()} افغانۍ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>محصولات:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.storeProducts}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مقدار:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.storeQuantity.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Customer Summary */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontWeight:'bold' }}>مشتریان</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.customerMoneyIn.toLocaleString()} افغانۍ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.customerMoneyOut.toLocaleString()} افغانۍ</span>
            </div>
          </div>
        </div>

        {/* Supplier Summary */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.75rem', border: '1px solid #d1d5db' }}>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '1rem', fontWeight:'bold' }}>عرضه کوونکي</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.supplierMoneyIn.toLocaleString()} افغانۍ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{data.summary.supplierMoneyOut.toLocaleString()} افغانۍ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Products */}
      {data.store?.products && data.store.products.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>د دوکان محصولات</h3>
          <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>محصول</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>واحد</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مقدار</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ارزښت</th>
                </tr>
              </thead>
              <tbody>
                {data.store.products.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.product?.name || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.unit?.name || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.quantity?.toLocaleString() || 0}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{item.value?.toLocaleString() || 0} افغانۍ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Records */}
      {data.sales?.records && data.sales.records.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>خرڅلاو ({data.sales.count})</h3>
          <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>نېټه</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مشتري</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ټول</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ورکړل شوی</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>پاتې</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.records.map((sale, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{new Date(sale.saleDate).toLocaleDateString('fa-AF')}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.customer?.name || 'نغدي'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.totalAmount?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.paidAmount?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{sale.dueAmount?.toLocaleString() || 0} افغانۍ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Records */}
      {data.purchases?.records && data.purchases.records.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>رانیول ({data.purchases.count})</h3>
          <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>نېټه</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>عرضه کوونکی</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ټول</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>ورکړل شوی</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>پاتې</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.records.map((purchase, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{new Date(purchase.purchaseDate).toLocaleDateString('fa-AF')}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.supplier?.name || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.totalAmount?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.paidAmount?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{purchase.dueAmount?.toLocaleString() || 0} افغانۍ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Accounts */}
      {data.suppliers?.accounts && data.suppliers.accounts.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>د عرضه کوونکو حسابونه ({data.suppliers.accounts.length})</h3>
          <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>عرضه کوونکی</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>بیلانس</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliers.accounts.map((acc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.account?.name || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyIn?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyOut?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{(acc.moneyIn - acc.moneyOut).toLocaleString()} افغانۍ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Accounts */}
      {data.customers?.accounts && data.customers.accounts.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>د مشتریانو حسابونه ({data.customers.accounts.length})</h3>
          <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>مشتري</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>راغلي پیسې</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>وتلي پیسې</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '1rem', fontWeight: '600', color: '#4b5563', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>بیلانس</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.accounts.map((acc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.account?.name || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#16a34a', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyIn?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: '600', color: '#dc2626', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{acc.moneyOut?.toLocaleString() || 0} افغانۍ</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', fontFamily: "'Noto Nastaliq Urdu', Arial, serif" }}>{(acc.moneyIn - acc.moneyOut).toLocaleString()} افغانۍ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPDF;
