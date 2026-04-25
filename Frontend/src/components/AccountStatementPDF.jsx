import React from "react";

const AccountStatementPDF = React.forwardRef(({ 
  account, 
  accountType, 
  currentBalance, 
  ledger,
  formatCurrency,
  formatDate,
  getTransactionTypeLabel
}, ref) => {
  return (
    <div ref={ref} style={{ width: "210mm", padding: "20mm", backgroundColor: "white", fontFamily: "Arial, sans-serif" }}>
      {/* PDF Header */}
      <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "2px solid #333", paddingBottom: "15px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 10px 0", color: "#1f2937" }}>{account}</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          {accountType === "customer" ? "د پیرودونکي حساب" : "د عرضه کوونکي حساب"}
        </p>
      </div>

      {/* Summary Section - Only show balance they owe/we owe */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ padding: "30px", backgroundColor: "#ffffff", borderRadius: "8px", border: "2px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ fontSize: "16px", color: "#6b7280", margin: "0 0 15px 0", fontWeight: "600" }}>
            {accountType === "customer" ? "تاسی پوروړي یاست" : "موږ مو پوروړي یو"}
          </p>
          <p style={{ fontSize: "36px", fontWeight: "bold", margin: "0", color: "#1f2937" }}>
            {formatCurrency(Math.abs(currentBalance))} افغانی
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{ marginTop: "30px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#1f2937" }}>د ټرانزکنشونو تفصیل</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#374151" }}>نیټه</th>
              <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#374151" }}>ډول</th>
              <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#374151" }}>اندازه</th>
              <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#374151" }}>بیلانس</th>
              <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#374151" }}>تشریح</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((transaction, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px", textAlign: "right" }}>{formatDate(transaction.date)}</td>
                <td style={{ padding: "10px", textAlign: "right" }}>{getTransactionTypeLabel(transaction.type)}</td>
                <td style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: transaction.amount > 0 ? "#059669" : "#dc2626" }}>
                  {transaction.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(transaction.amount))} افغانی
                </td>
                <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(Math.abs(transaction.balanceAfter))} افغانی</td>
                <td style={{ padding: "10px", textAlign: "right" }}>{transaction.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
        <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>د چاپ نیټه: {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
});

AccountStatementPDF.displayName = "AccountStatementPDF";

export default AccountStatementPDF;
