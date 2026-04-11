import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import SaleBillPrint from "../components/SaleBillPrint";
import { fetchSale } from "../services/apiUtiles";

function SaleBill() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [customerAccount, setCustomerAccount] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const saleParam = params.get("sale");
    const customerParam = params.get("customer");
    const customerAccountParam = params.get("customerAccount");
    const autoPrintParam = params.get("autoPrint");

    let parsed = false;
    try {
      if (saleParam) {
        setSale(JSON.parse(saleParam));
        parsed = true;
      }
      if (customerParam) setCustomer(JSON.parse(customerParam));
      if (customerAccountParam)
        setCustomerAccount(JSON.parse(customerAccountParam));
      if (autoPrintParam) setAutoPrint(autoPrintParam === "true");
    } catch (err) {
      // malformed JSON in query params — ignore and fallback to fetch
      // eslint-disable-next-line no-console
      console.error("SaleBill: failed to parse query params", err);
    }

    const fetchIfNeeded = async () => {
      if (!parsed && id) {
        try {
          setLoading(true);
          const detail = await fetchSale(id);
          const full = detail?.sale || detail || null;
          setSale(full);
        } catch (err) {
          // eslint-disable-next-line no-console
          throw new Error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchIfNeeded();
  }, [id, location.search]);

  const handleClose = () => {
    navigate("/sales");
  };

  if (loading) return null;

  return (
    <SaleBillPrint
      sale={sale}
      customer={customer}
      onClose={handleClose}
      autoPrint={autoPrint}
    />
  );
}

export default SaleBill;
