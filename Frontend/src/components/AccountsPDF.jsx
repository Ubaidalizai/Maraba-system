import { useTranslation } from "react-i18next";
import { formatNumber } from "../utilies/helper";

const AccountsPDF = ({ accounts, accountType, reportDate }) => {
  const { t, i18n } = useTranslation();

  const formatCreatedAt = (iso) => {
    if (!iso) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag = lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(iso).toLocaleDateString(localeTag);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

  const title = accountType === "customer" 
    ? t("accountsPDF.customerTitle") 
    : t("accountsPDF.supplierTitle");

  return (
    <div
      style={{
        fontFamily: "'Noto Nastaliq Urdu', serif",
        direction: "rtl",
        padding: "3rem",
        backgroundColor: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <style>
        {`
          * {
            font-family: 'Noto Nastaliq Urdu', serif !important;
          }
        `}
      </style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "3.5rem", margin: "0 0 0.5rem 0", color: "#1f2937" }}>
          {title}
        </h1>
        <p style={{ fontSize: "2rem", margin: "0", color: "#6b7280" }}>
          {t("accountsPDF.date")}: {formatCreatedAt(reportDate)}
        </p>
      </div>

      {/* Total Balance Summary - Simple Style */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2.5rem",
          paddingBottom: "1.5rem",
          borderBottom: "3px solid #1f2937",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "5rem",
        }}
      >
        <p style={{ fontSize: "3rem", marginLeft: "3rem", color: "#6b7280" }}>
          {t("accountsPDF.totalBalance")}
        </p>
        <p style={{ fontSize: "3.5rem", margin: "0", color: "#1f2937", fontWeight: "bold" }}>
          {formatNumber(totalBalance)} {t("accountsPDF.currency")}
        </p>
      </div>

      {/* Accounts Table */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "1.5rem", color: "#1f2937" }}>
          {t("accountsPDF.accountsList")}
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "2px solid #1f2937",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th
                style={{
                  padding: "2rem",
                  textAlign: "right",
                  fontSize: "2.25rem",
                  color: "#1f2937",
                  borderBottom: "2px solid #1f2937",
                  fontWeight: "bold",
                }}
              >
                {t("accountsPDF.accountName")}
              </th>
              <th
                style={{
                  padding: "2rem",
                  textAlign: "right",
                  fontSize: "2.25rem",
                  color: "#1f2937",
                  borderBottom: "2px solid #1f2937",
                  fontWeight: "bold",
                }}
              >
                {t("accountsPDF.createdAt")}
              </th>
              <th
                style={{
                  padding: "2rem",
                  textAlign: "right",
                  fontSize: "2.25rem",
                  color: "#1f2937",
                  borderBottom: "2px solid #1f2937",
                  fontWeight: "bold",
                }}
              >
                {t("accountsPDF.balance")}
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, index) => (
              <tr
                key={acc._id}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                }}
              >
                <td
                  style={{
                    padding: "2rem",
                    fontSize: "2.125rem",
                    color: "#1f2937",
                    borderBottom: "1px solid #d1d5db",
                  }}
                >
                  {acc.name}
                </td>
                <td
                  style={{
                    padding: "2rem",
                    fontSize: "2.125rem",
                    color: "#6b7280",
                    borderBottom: "1px solid #d1d5db",
                  }}
                >
                  {formatCreatedAt(acc.createdAt)}
                </td>
                <td
                  style={{
                    padding: "2rem",
                    fontSize: "2.125rem",
                    color: "#1f2937",
                    borderBottom: "1px solid #d1d5db",
                    fontWeight: "bold",
                  }}
                >
                  {formatNumber(acc.currentBalance || 0)} {t("accountsPDF.currency")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div
        style={{
          marginTop: "2.5rem",
          paddingTop: "1.5rem",
          borderTop: "3px solid #1f2937",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "2rem", margin: "0", color: "#1f2937", fontWeight: "bold" }}>
          {t("accountsPDF.totalAccounts")}: {accounts.length}
        </p>
      </div>
    </div>
  );
};

export default AccountsPDF;
