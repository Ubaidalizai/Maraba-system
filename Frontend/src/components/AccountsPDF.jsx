import { useTranslation } from "react-i18next";
import { formatNumber, formatJalaliDate } from "../utilies/helper";
import { useSettings } from "../services/useApi";
import {
  pdfColors,
  pdfFont,
  cardStyle,
  thStyle,
  tdStyle,
} from "../utilies/pdfInlineStyles";

const AccountsPDF = ({ accounts, accountType, reportDate }) => {
  const { t, i18n } = useTranslation();
  const { data: settings } = useSettings();

  const companyName = settings?.data?.settings?.companyName || t("brand.title");

  const formatCreatedAt = formatJalaliDate;

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.currentBalance || 0),
    0
  );

  const title =
    accountType === "customer"
      ? t("accountsPDF.customerTitle")
      : t("accountsPDF.supplierTitle");

  const thLarge = {
    ...thStyle,
    padding: "14px 16px",
    fontSize: "12px",
  };

  const tdLarge = {
    ...tdStyle,
    padding: "14px 16px",
    fontSize: "13px",
  };

  return (
    <div
      id="accounts-pdf-content"
      style={{
        fontFamily: pdfFont,
        direction: "rtl",
        padding: "32px",
        backgroundColor: pdfColors.white,
        color: pdfColors.text,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${pdfColors.border}`,
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: pdfColors.brown,
            margin: 0,
          }}
        >
          {companyName}
        </p>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            margin: "8px 0 0 0",
            color: pdfColors.text,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: "14px", color: pdfColors.textMuted, margin: "6px 0 0 0" }}>
          {t("accountsPDF.date")}: {formatCreatedAt(reportDate)}
        </p>
      </div>

      {/* Total balance card */}
      <div style={{ ...cardStyle({ padding: "20px" }), marginBottom: "24px" }}>
        <p style={{ fontSize: "14px", color: pdfColors.textMuted, margin: 0 }}>
          {t("accountsPDF.totalBalance")}
        </p>
        <p
          style={{
            fontSize: "26px",
            fontWeight: "bold",
            margin: "8px 0 0 0",
            color: pdfColors.text,
          }}
        >
          {formatNumber(totalBalance)} {t("accountsPDF.currency")}
        </p>
      </div>

      {/* Table */}
      <div
        style={{
          border: `1px solid ${pdfColors.border}`,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${pdfColors.border}`,
            backgroundColor: pdfColors.white,
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              margin: 0,
              color: pdfColors.text,
            }}
          >
            {t("accountsPDF.accountsList")}
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thLarge}>{t("accountsPDF.accountName")}</th>
              <th style={thLarge}>{t("accountsPDF.createdAt")}</th>
              <th style={thLarge}>{t("accountsPDF.balance")}</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, index) => (
              <tr
                key={acc._id}
                style={{
                  backgroundColor: index % 2 === 1 ? pdfColors.rowAlt : pdfColors.white,
                }}
              >
                <td style={{ ...tdLarge, fontWeight: "500" }}>{acc.name}</td>
                <td style={{ ...tdLarge, color: pdfColors.textMuted }}>
                  {formatCreatedAt(acc.createdAt)}
                </td>
                <td style={{ ...tdLarge, fontWeight: "bold" }}>
                  {formatNumber(acc.currentBalance || 0)} {t("accountsPDF.currency")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: `1px solid ${pdfColors.border}`,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: pdfColors.text }}>
          {t("accountsPDF.totalAccounts")}: {accounts.length}
        </p>
      </div>
    </div>
  );
};

export default AccountsPDF;
