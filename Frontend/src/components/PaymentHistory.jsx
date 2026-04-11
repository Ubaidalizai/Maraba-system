import React from "react";
import Table from "./Table";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import TableRow from "./TableRow";
import TableColumn from "./TableColumn";

const historyHeader = [
  { title: "تاریخ" },
  { title: "نمبر بیل" },
  { title: "تهیه کننده" },
  { title: "مبلغ" },
  { title: "میتود" },
  { title: "مراجعه" },
  { title: "یادداشت" },
];
function PaymentHistory({ paymentHistory }) {
  return (
    <Table>
      <TableHeader headerData={historyHeader} />
      <TableBody>
        {paymentHistory.map((payment, index) => (
          <TableRow key={index}>
            <TableColumn>{payment.paymentDate}</TableColumn>
            <TableColumn>{payment.invoiceNumber}</TableColumn>
            <TableColumn>{payment.supplier}</TableColumn>
            <TableColumn className={"text-green-600"}>
              {" "}
              ${payment.amount.toFixed(2)}
            </TableColumn>
            <TableColumn>{payment.paymentMethod.replace("_", " ")}</TableColumn>
            <TableColumn>{payment.reference}</TableColumn>
            <TableColumn>{payment.notes}</TableColumn>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default PaymentHistory;
