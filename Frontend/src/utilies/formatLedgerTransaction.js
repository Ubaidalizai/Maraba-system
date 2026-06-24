/** Extract bill / receipt number from stored description text. */
export function extractBillNumber(description = "") {
  const text = String(description);
  const patterns = [
    /بل\s*نمبر[:\s]*([^\s,)]+)/i,
    /بل\s*[#:]?\s*([A-Za-z0-9\-_/]+)/i,
    /bill\s*#?\s*([A-Za-z0-9\-_/]+)/i,
    /bill\s*number[:\s]*([^\s,)]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[1] !== "N/A") return match[1];
  }
  return null;
}

function isReversalDescription(description = "") {
  const text = String(description).trim();
  return (
    text.startsWith("بیرته کول:") ||
    /^reversal\b/i.test(text) ||
    /\(لغوه\)/.test(text)
  );
}

function formatReversalReason(reason, t) {
  const text = String(reason || "").trim();
  const fromTo = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s+account)?$/i);
  if (fromTo) {
    return t("accountDetails.txDesc.reversalTransfer", {
      from: fromTo[1].trim(),
      to: fromTo[2].trim(),
    });
  }
  if (text) {
    return t("accountDetails.txDesc.reversalWithReason", { reason: text });
  }
  return t("accountDetails.txDesc.reversal");
}

/** Plain Pashto source label (له کومه). */
export function getTransactionSource(transaction, t) {
  const { referenceType, description = "", type } = transaction;

  if (isReversalDescription(description)) {
    return {
      key: "reversal",
      label: t("accountDetails.txSource.reversal"),
      badgeClass: "bg-purple-100 text-purple-800",
    };
  }

  const byRef = {
    sale: {
      key: "sale",
      label: t("accountDetails.txSource.sale"),
      badgeClass: "bg-blue-100 text-blue-800",
    },
    purchase: {
      key: "purchase",
      label: t("accountDetails.txSource.purchase"),
      badgeClass: "bg-indigo-100 text-indigo-800",
    },
    expense: {
      key: "expense",
      label: t("accountDetails.txSource.expense"),
      badgeClass: "bg-orange-100 text-orange-800",
    },
    income: {
      key: "income",
      label: t("accountDetails.txSource.income"),
      badgeClass: "bg-teal-100 text-teal-800",
    },
    transfer: {
      key: "transfer",
      label: t("accountDetails.txSource.transfer"),
      badgeClass: "bg-violet-100 text-violet-800",
    },
    payment: {
      key: "payment",
      label: t("accountDetails.txSource.manualPayment"),
      badgeClass: "bg-amber-100 text-amber-800",
    },
    saleReturn: {
      key: "saleReturn",
      label: t("accountDetails.txSource.saleReturn"),
      badgeClass: "bg-rose-100 text-rose-800",
    },
    purchaseReturn: {
      key: "purchaseReturn",
      label: t("accountDetails.txSource.purchaseReturn"),
      badgeClass: "bg-rose-100 text-rose-800",
    },
  };

  if (referenceType && byRef[referenceType]) {
    return byRef[referenceType];
  }

  if (type === "Expense") {
    return byRef.expense;
  }
  if (type === "Transfer") {
    return byRef.transfer;
  }

  return {
    key: "other",
    label: t("accountDetails.txSource.other"),
    badgeClass: "bg-gray-100 text-gray-700",
  };
}

/** Money direction for non-accountants. */
export function getMoneyDirection(transaction, t) {
  const inLabel = t("accountDetails.moneyDirection.in");
  const outLabel = t("accountDetails.moneyDirection.out");

  if (transaction.amount > 0) {
    return {
      label: inLabel,
      badgeClass: "bg-green-100 text-green-800",
    };
  }
  if (transaction.amount < 0) {
    return {
      label: outLabel,
      badgeClass: "bg-red-100 text-red-800",
    };
  }
  return {
    label: "—",
    badgeClass: "bg-gray-100 text-gray-600",
  };
}

/** User-friendly description in plain Pashto. */
export function formatTransactionDescription(transaction, t) {
  const raw = String(transaction.description || "").trim();
  if (!raw) return "—";

  if (isReversalDescription(raw)) {
    const reason = raw
      .replace(/^بیرته کول:\s*/i, "")
      .replace(/^Reversal of\s*/i, "")
      .replace(/\s*\(لغوه\)\s*$/i, "")
      .trim();
    return formatReversalReason(reason, t);
  }

  const expenseMatch = raw.match(/^Expense:\s*(.+)$/i);
  if (expenseMatch) {
    return t("accountDetails.txDesc.expense", { name: expenseMatch[1].trim() });
  }

  const incomeMatch = raw.match(/^Income:\s*(.+)$/i);
  if (incomeMatch) {
    const detail = incomeMatch[1]
      .replace(/^accounts from\s*/i, "")
      .replace(/^from\s*/i, "")
      .trim();
    return t("accountDetails.txDesc.income", { name: detail });
  }

  if (/لاسي\s*(Debit|Credit)\s*معامله/i.test(raw) || raw === "لاسي تادیه معامله") {
    return t("accountDetails.txDesc.manualPayment");
  }

  if (
    raw.includes("د خرڅلاو لپاره تادیه") ||
    raw.includes("پرداخت برای فروش") ||
    raw.includes("پرداخت فروش") ||
    raw.includes("فروش به")
  ) {
    const bill = extractBillNumber(raw);
    return bill
      ? t("accountDetails.txDesc.salePayment", { bill })
      : t("accountDetails.txDesc.salePaymentPlain");
  }

  if (
    raw.includes("د رانیول لپاره تادیه") ||
    raw.includes("د رانیول لپاره") ||
    raw.includes("د تاجر")
  ) {
    const bill = extractBillNumber(raw);
    return bill
      ? t("accountDetails.txDesc.purchasePayment", { bill })
      : t("accountDetails.txDesc.purchasePaymentPlain");
  }

  if (raw.includes("د پلور بیرته") || raw.includes("بیرته راستنیدنه")) {
    const bill = extractBillNumber(raw);
    return bill
      ? t("accountDetails.txDesc.saleReturn", { bill })
      : t("accountDetails.txDesc.saleReturnPlain");
  }

  const transferTo = raw.match(/^انتقال ته\s+(.+)$/);
  if (transferTo) {
    return t("accountDetails.txDesc.transferTo", { name: transferTo[1].trim() });
  }

  const transferFrom = raw.match(/^انتقال له\s+(.+)$/);
  if (transferFrom) {
    return t("accountDetails.txDesc.transferFrom", {
      name: transferFrom[1].trim(),
    });
  }

  if (/from\s+.+\s+to\s+/i.test(raw)) {
    return t("accountDetails.txDesc.transferGeneric");
  }

  const typeName = raw.match(/^(Credit|Debit)\s*-\s*(.+)$/i);
  if (typeName) {
    return t("accountDetails.txDesc.accountEntry", { name: typeName[2].trim() });
  }

  if (raw.startsWith("له ") || raw.startsWith("ته ")) {
    return raw;
  }

  return raw;
}

export function isLedgerTransactionClickable(transaction) {
  return Boolean(
    transaction.referenceType &&
      transaction.referenceId &&
      ["sale", "purchase"].includes(transaction.referenceType)
  );
}
