import React from "react";
import { useSettings } from "../services/useApi";
import { useTranslation } from "react-i18next";
import {
  formatTransactionDescription,
  getMoneyDirection,
  getTransactionSource,
} from "../utilies/formatLedgerTransaction";
import {
  pdfColors,
  pdfFont,
  cardStyle,
  thStyle,
  tdStyle,
  badgeStyle,
  balanceCardStyles,
} from "../utilies/pdfInlineStyles";

const SummaryCard = ({ label, value, cardOverrides = {}, valueColor }) => (
  <div style={cardStyle(cardOverrides)}>
    <p style={{ fontSize: "11px", color: pdfColors.textMuted, margin: 0 }}>{label}</p>
    <p
      style={{
        fontSize: "16px",
        fontWeight: "bold",
        margin: "6px 0 0 0",
        color: valueColor || pdfColors.text,
      }}
    >
      {value}
    </p>
  </div>
);

const AccountStatementPDF = React.forwardRef(
  (
    {
      account,
      accountType,
      currentBalance,
      openingBalance,
      totalTransactions,
      totalTransactionVolume,
      ledger,
      formatCurrency,
      formatDate,
      getBalanceInfo,
    },
    ref
  ) => {
    const { data: settings } = useSettings();
    const { t } = useTranslation();

    const companyName =
      settings?.data?.settings?.companyName || t("brand.title");
    const balanceInfo = getBalanceInfo
      ? getBalanceInfo(currentBalance, accountType)
      : {
          label: t("accountDetails.balance.default"),
          color: "text-gray-900",
          bgColor: "bg-white",
        };
    const balanceStyles = balanceCardStyles(balanceInfo);
    const showVolumeCard =
      accountType === "customer" || accountType === "supplier";

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          backgroundColor: pdfColors.white,
          color: pdfColors.text,
          fontFamily: pdfFont,
          direction: "rtl",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: `1px solid ${pdfColors.border}`,
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: pdfColors.brown,
              margin: 0,
            }}
          >
            {companyName}
          </p>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              margin: "6px 0 0 0",
              color: pdfColors.text,
            }}
          >
            {account}
          </h1>
          <p style={{ fontSize: "12px", color: pdfColors.textMuted, margin: "6px 0 0 0" }}>
            {t("accountDetails.subtitle")}
          </p>
        </div>

        {/* Summary cards */}
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
              <td style={{ width: showVolumeCard ? "25%" : "33.33%", verticalAlign: "top", padding: 0 }}>
                <SummaryCard
                  label={balanceInfo.label}
                  value={`${formatCurrency(Math.abs(currentBalance))} AFN`}
                  valueColor={balanceStyles.valueColor}
                  cardOverrides={{
                    backgroundColor: balanceStyles.backgroundColor,
                    border: balanceStyles.border,
                  }}
                />
              </td>
              <td style={{ width: showVolumeCard ? "25%" : "33.33%", verticalAlign: "top", padding: 0 }}>
                <SummaryCard
                  label={t("accountDetails.openingBalance")}
                  value={`${formatCurrency(Math.abs(openingBalance))} AFN`}
                />
              </td>
              <td style={{ width: showVolumeCard ? "25%" : "33.33%", verticalAlign: "top", padding: 0 }}>
                <SummaryCard
                  label={t("accountDetails.transactionCount")}
                  value={String(totalTransactions ?? ledger?.length ?? 0)}
                />
              </td>
              {showVolumeCard && (
                <td style={{ width: "25%", verticalAlign: "top", padding: 0 }}>
                  <SummaryCard
                    label={
                      accountType === "customer"
                        ? "ټول ترلاسه شوی پیسې"
                        : "ټول ورکړل شوی پیسې"
                    }
                    value={`${formatCurrency(totalTransactionVolume || 0)} AFN`}
                    valueColor={pdfColors.blueText}
                    cardOverrides={{
                      backgroundColor: pdfColors.blueBg,
                      border: `1px solid ${pdfColors.blueBorder}`,
                    }}
                  />
                </td>
              )}
            </tr>
          </tbody>
        </table>

        {/* Transactions */}
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
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                margin: 0,
                color: pdfColors.text,
              }}
            >
              {t("accountDetails.transactionsTitle")}
            </h3>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>{t("accountDetails.table.date")}</th>
                <th style={thStyle}>{t("accountDetails.table.source")}</th>
                <th style={thStyle}>{t("accountDetails.table.movement")}</th>
                <th style={thStyle}>{t("accountDetails.table.amount")}</th>
                <th style={thStyle}>{t("accountDetails.table.balanceAfter")}</th>
                <th style={thStyle}>{t("accountDetails.table.description")}</th>
              </tr>
            </thead>
            <tbody>
              {(ledger || []).map((transaction, index) => {
                const source = getTransactionSource(transaction, t);
                const movement = getMoneyDirection(transaction, t);
                const description = formatTransactionDescription(transaction, t);
                const amountPositive = transaction.amount > 0;
                return (
                  <tr
                    key={transaction.transactionId || index}
                    style={{ backgroundColor: pdfColors.white }}
                  >
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {formatDate(transaction.date)}
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(source.badgeClass)}>{source.label}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(movement.badgeClass)}>{movement.label}</span>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        color: amountPositive ? pdfColors.green : pdfColors.red,
                      }}
                    >
                      {amountPositive ? "+" : ""}
                      {formatCurrency(transaction.amount)} AFN
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      {formatCurrency(transaction.balanceAfter)} AFN
                    </td>
                    <td style={tdStyle}>{description}</td>
                  </tr>
                );
              })}
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
          <p style={{ fontSize: "10px", color: pdfColors.textLight, margin: 0 }}>
            د چاپ نیټه: {formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    );
  }
);

AccountStatementPDF.displayName = "AccountStatementPDF";

export default AccountStatementPDF;
