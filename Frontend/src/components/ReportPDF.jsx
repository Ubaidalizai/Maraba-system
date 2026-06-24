import { useTranslation } from "react-i18next";
import { formatNumber, formatJalaliDate } from "../utilies/helper";
import {
  pdfColors,
  pdfFont,
  cardStyle,
  thStyle,
  tdStyle,
} from "../utilies/pdfInlineStyles";

const summaryCardStyle = cardStyle({ padding: "16px", verticalAlign: "top" });

const detailCardStyle = cardStyle({ padding: "16px", height: "100%" });

const sectionTitleStyle = {
  fontSize: "14px",
  fontWeight: "600",
  margin: 0,
  color: pdfColors.text,
};

const rowLabelStyle = {
  fontSize: "12px",
  color: pdfColors.textMuted,
  margin: 0,
};

const rowValueStyle = (color) => ({
  fontSize: "12px",
  fontWeight: "600",
  margin: 0,
  color: color || pdfColors.text,
  textAlign: "left",
});

function SummaryCard({ label, value }) {
  return (
    <div style={summaryCardStyle}>
      <p style={{ fontSize: "12px", color: pdfColors.textMuted, margin: 0 }}>{label}</p>
      <p style={{ fontSize: "18px", fontWeight: "bold", margin: "8px 0 0 0", color: pdfColors.text }}>
        {value}
      </p>
    </div>
  );
}

function DetailCard({ title, rows }) {
  return (
    <div style={detailCardStyle}>
      <h3 style={{ ...sectionTitleStyle, marginBottom: "12px" }}>{title}</h3>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <span style={rowLabelStyle}>{row.label}</span>
          <span style={rowValueStyle(row.color)}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ReportTableSection({ title, headers, children, empty }) {
  if (empty) return null;

  return (
    <div
      style={{
        border: `1px solid ${pdfColors.border}`,
        borderRadius: "8px",
        overflow: "hidden",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${pdfColors.border}`,
          backgroundColor: pdfColors.white,
        }}
      >
        <h3 style={sectionTitleStyle}>{title}</h3>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={thStyle}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const ReportPDF = ({ data, reportDate }) => {
  const { t } = useTranslation();

  if (!data) return null;

  const afn = t("reports.currencyAfn");
  const formatDate = formatJalaliDate;
  const formatAmount = (amount) => `${formatNumber(amount ?? 0)} ${afn}`;

  const rootStyle = {
    fontFamily: pdfFont,
    direction: "rtl",
    color: pdfColors.text,
    backgroundColor: pdfColors.white,
    boxSizing: "border-box",
  };

  const cell = (content, extra = {}) => (
    <td style={{ ...tdStyle, ...extra }}>{content}</td>
  );

  return (
    <div style={rootStyle}>
      <div
        style={{
          textAlign: "center",
          borderBottom: `1px solid ${pdfColors.border}`,
          paddingBottom: "16px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: pdfColors.brown }}>
          {t("dailyReport.title")}
        </h2>
        <p style={{ fontSize: "12px", color: pdfColors.textMuted, margin: "6px 0 0 0" }}>
          {t("dailyReport.date")}: {formatDate(reportDate)}
        </p>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "12px 0",
          marginBottom: "20px",
          marginLeft: "-12px",
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: "33.33%", padding: 0, verticalAlign: "top" }}>
              <SummaryCard
                label={t("dailyReport.purchases")}
                value={formatAmount(data.summary.totalPurchases)}
              />
            </td>
            <td style={{ width: "33.33%", padding: 0, verticalAlign: "top" }}>
              <SummaryCard
                label={t("dailyReport.sales")}
                value={formatAmount(data.summary.totalSales)}
              />
            </td>
            <td style={{ width: "33.33%", padding: 0, verticalAlign: "top" }}>
              <SummaryCard
                label={t("dailyReport.totalExpenses")}
                value={formatAmount(data.summary.totalExpenses)}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "12px 0",
          marginBottom: "20px",
          marginLeft: "-12px",
        }}
      >
        <tbody>
          <tr>
            <td style={{ width: "33.33%", padding: 0, verticalAlign: "top" }}>
              <DetailCard
                title={t("dailyReport.storeInfo")}
                rows={[
                  { label: t("dailyReport.value"), value: formatAmount(data.summary.storeValue) },
                  {
                    label: t("dailyReport.storeProducts"),
                    value: formatNumber(data.summary.storeProducts),
                  },
                  {
                    label: t("dailyReport.quantity"),
                    value: formatNumber(data.summary.storeQuantity),
                  },
                ]}
              />
            </td>
            <td style={{ width: "33.33%", padding: 0, verticalAlign: "top" }}>
              <DetailCard
                title={t("dailyReport.customers")}
                rows={[
                  {
                    label: t("dailyReport.moneyIn"),
                    value: formatAmount(data.summary.customerMoneyIn),
                    color: pdfColors.green,
                  },
                  {
                    label: t("dailyReport.moneyOut"),
                    value: formatAmount(data.summary.customerMoneyOut),
                    color: pdfColors.red,
                  },
                ]}
              />
            </td>
            <td style={{ width: "33.33%", padding: 0, verticalAlign: "top" }}>
              <DetailCard
                title={t("dailyReport.suppliers")}
                rows={[
                  {
                    label: t("dailyReport.moneyIn"),
                    value: formatAmount(data.summary.supplierMoneyIn),
                    color: pdfColors.green,
                  },
                  {
                    label: t("dailyReport.moneyOut"),
                    value: formatAmount(data.summary.supplierMoneyOut),
                    color: pdfColors.red,
                  },
                ]}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <ReportTableSection
        title={t("dailyReport.storeProductsTitle")}
        headers={[
          t("dailyReport.product"),
          t("dailyReport.unit"),
          t("dailyReport.quantity"),
          t("dailyReport.value"),
        ]}
        empty={!data.store?.products?.length}
      >
        {data.store?.products?.map((item, idx) => (
          <tr key={idx} style={{ backgroundColor: pdfColors.white }}>
            {cell(item.product?.name || "—", { fontWeight: "500" })}
            {cell(item.unit?.name || "—", { color: pdfColors.textMuted })}
            {cell(formatNumber(item.quantity ?? 0))}
            {cell(formatAmount(item.value), { fontWeight: "600" })}
          </tr>
        ))}
      </ReportTableSection>

      <ReportTableSection
        title={`${t("dailyReport.sales")} (${data.sales?.count ?? 0})`}
        headers={[
          t("dailyReport.date"),
          t("dailyReport.customer"),
          t("dailyReport.total"),
          t("dailyReport.paid"),
          t("dailyReport.due"),
        ]}
        empty={!data.sales?.records?.length}
      >
        {data.sales?.records?.map((sale, idx) => (
          <tr key={idx} style={{ backgroundColor: pdfColors.white }}>
            {cell(formatDate(sale.saleDate), { whiteSpace: "nowrap" })}
            {cell(sale.customer?.name || t("dailyReport.cashSale"))}
            {cell(formatAmount(sale.totalAmount))}
            {cell(formatAmount(sale.paidAmount), { fontWeight: "600", color: pdfColors.green })}
            {cell(formatAmount(sale.dueAmount), { fontWeight: "600", color: pdfColors.red })}
          </tr>
        ))}
      </ReportTableSection>

      <ReportTableSection
        title={`${t("dailyReport.purchases")} (${data.purchases?.count ?? 0})`}
        headers={[
          t("dailyReport.date"),
          t("dailyReport.supplier"),
          t("dailyReport.total"),
          t("dailyReport.paid"),
          t("dailyReport.due"),
        ]}
        empty={!data.purchases?.records?.length}
      >
        {data.purchases?.records?.map((purchase, idx) => (
          <tr key={idx} style={{ backgroundColor: pdfColors.white }}>
            {cell(formatDate(purchase.purchaseDate), { whiteSpace: "nowrap" })}
            {cell(purchase.supplier?.name || "—")}
            {cell(formatAmount(purchase.totalAmount))}
            {cell(formatAmount(purchase.paidAmount), { fontWeight: "600", color: pdfColors.green })}
            {cell(formatAmount(purchase.dueAmount), { fontWeight: "600", color: pdfColors.red })}
          </tr>
        ))}
      </ReportTableSection>

      <ReportTableSection
        title={`${t("dailyReport.supplierAccounts")} (${data.suppliers?.accounts?.length ?? 0})`}
        headers={[
          t("dailyReport.supplier"),
          t("dailyReport.moneyIn"),
          t("dailyReport.moneyOut"),
          t("dailyReport.balance"),
        ]}
        empty={!data.suppliers?.accounts?.length}
      >
        {data.suppliers?.accounts?.map((acc, idx) => (
          <tr key={idx} style={{ backgroundColor: pdfColors.white }}>
            {cell(acc.account?.name || "—", { fontWeight: "500" })}
            {cell(formatAmount(acc.moneyIn), { fontWeight: "600", color: pdfColors.green })}
            {cell(formatAmount(acc.moneyOut), { fontWeight: "600", color: pdfColors.red })}
            {cell(formatAmount((acc.moneyIn ?? 0) - (acc.moneyOut ?? 0)), { fontWeight: "bold" })}
          </tr>
        ))}
      </ReportTableSection>

      <ReportTableSection
        title={`${t("dailyReport.customerAccounts")} (${data.customers?.accounts?.length ?? 0})`}
        headers={[
          t("dailyReport.customer"),
          t("dailyReport.moneyIn"),
          t("dailyReport.moneyOut"),
          t("dailyReport.balance"),
        ]}
        empty={!data.customers?.accounts?.length}
      >
        {data.customers?.accounts?.map((acc, idx) => (
          <tr key={idx} style={{ backgroundColor: pdfColors.white }}>
            {cell(acc.account?.name || "—", { fontWeight: "500" })}
            {cell(formatAmount(acc.moneyIn), { fontWeight: "600", color: pdfColors.green })}
            {cell(formatAmount(acc.moneyOut), { fontWeight: "600", color: pdfColors.red })}
            {cell(formatAmount((acc.moneyIn ?? 0) - (acc.moneyOut ?? 0)), { fontWeight: "bold" })}
          </tr>
        ))}
      </ReportTableSection>
    </div>
  );
};

export default ReportPDF;
