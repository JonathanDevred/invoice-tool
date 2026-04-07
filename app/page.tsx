"use client";

import { useState, useEffect } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

type Item = {
  description: string;
  qty: number;
  rate: number;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paid, setPaid] = useState(false);

  const [form, setForm] = useState({
    invoiceNumber: "",
    date: "",
    dueDate: "",
    tax: 0,
    yourName: "",
    yourAddress: "",
    clientName: "",
    clientAddress: "",
    paymentDetails: "",
    items: [{ description: "", qty: 1, rate: 0 }] as Item[],
  });

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const params = new URLSearchParams(window.location.search);

    if (params.get("paid") === "true") {
      setPaid(true);
      localStorage.setItem(
        "paid",
        JSON.stringify({ value: true, date: Date.now() })
      );
    } else {
      const stored = localStorage.getItem("paid");
      if (stored) {
        const parsed = JSON.parse(stored);
        const valid = Date.now() - parsed.date < 1000 * 60 * 60 * 24;

        if (parsed.value && valid) setPaid(true);
        else localStorage.removeItem("paid");
      }
    }
  }, []);

  const handleChange = (e: any) => {
    const value =
      e.target.name === "tax" ? Number(e.target.value) : e.target.value;

    setForm({ ...form, [e.target.name]: value });
  };

  const updateItem = <K extends keyof Item>(
    i: number,
    field: K,
    value: Item[K]
  ) => {
    const items = [...form.items];
    items[i][field] = value;
    setForm({ ...form, items });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: "", qty: 1, rate: 0 }],
    });
  };

  const subtotal = form.items.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  );

  const taxAmount = (subtotal * form.tax) / 100;
  const total = subtotal + taxAmount;

  const generatePDF = async () => {
    if (isMobile) return;

    try {
      setLoading(true);

      const el = document.getElementById("invoice");
      if (!el) return;

      await new Promise((r) => setTimeout(r, 300));

      const dataUrl = await toPng(el as HTMLElement, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const img = new Image();
      img.src = dataUrl;

      await new Promise((res) => (img.onload = res));

      const pageWidth = 210;
      const pageHeight = 297;

      const ratio = Math.min(
        pageWidth / img.width,
        pageHeight / img.height
      );

      const width = img.width * ratio;
      const height = img.height * ratio;

      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;

      pdf.addImage(dataUrl, "PNG", x, y, width, height);

      if (!paid) {
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        pdf.text("Created with GetPaidFast", pageWidth / 2, 290, {
          align: "center",
        });
      }

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error(err);
      alert("Error generating PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:p-6 text-black">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8">
        <img
          src="/Header.png"
          className="h-30 cursor-pointer hover:opacity-80 transition"
          onClick={() => window.location.href = "/"}
        />

        <p className="text-sm text-gray-500 mt-2">
          Used by 1,200+ freelances and contractors last month!
        </p>

        {paid && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
            ✅ Payment unlocked — valid for 24h on this device
          </div>
        )}

        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>

      {/* MAIN */}
      <div className="max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-8">

        {/* FORM */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">

          <input name="invoiceNumber" placeholder="Invoice number" onChange={handleChange} className="input"/>

          <div className="grid grid-cols-2 gap-3">
            <input type="text" name="date" placeholder="Invoice date"
              onFocus={(e)=>e.target.type="date"}
              onBlur={(e)=>!e.target.value&&(e.target.type="text")}
              onChange={handleChange} className="input"/>

            <input type="text" name="dueDate" placeholder="Due date"
              onFocus={(e)=>e.target.type="date"}
              onBlur={(e)=>!e.target.value&&(e.target.type="text")}
              onChange={handleChange} className="input"/>
          </div>

          <input name="yourName" placeholder="Your name" onChange={handleChange} className="input"/>
          <input name="yourAddress" placeholder="Your address" onChange={handleChange} className="input"/>
          <input name="clientName" placeholder="Client name" onChange={handleChange} className="input"/>
          <input name="clientAddress" placeholder="Client address" onChange={handleChange} className="input"/>

          {/* ITEMS */}
          <div>
            <p className="font-medium mb-2">Items</p>

            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input placeholder="Description" className="input col-span-3"
                  onChange={(e)=>updateItem(i,"description",e.target.value)}/>
                <input placeholder="Qty" type="number" className="input"
                  onChange={(e)=>updateItem(i,"qty",Number(e.target.value))}/>
                <input placeholder="Price" type="number" className="input"
                  onChange={(e)=>updateItem(i,"rate",Number(e.target.value))}/>
              </div>
            ))}

            <button onClick={addItem} className="link-btn">+ Add item</button>
          </div>

                    {/* TAX */}
                    <input
            name="tax"
            type="number"
            placeholder="Tax (%)"
            onChange={handleChange}
            className="input"
          />

          <textarea name="paymentDetails"
            placeholder="Payment details (Bank, Wise, PayPal...)"
            onChange={handleChange}
            className="input" rows={4}/>

          {/* CTA */}
          <div className="flex flex-col gap-3">

            <button
              disabled={isMobile || loading}
              onClick={generatePDF}
              className={`btn-primary ${isMobile ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isMobile
                ? "Desktop only"
                : loading
                ? "Generating..."
                : paid
                ? "Download clean PDF"
                : "Download PDF (free)"}
            </button>

            {!isMobile && !paid && (
              <button
                onClick={() =>
                  window.open("https://buy.stripe.com/bJe7sE0EX9c8eI1cFH1kA00?locale=en","_blank")
                }
                className="btn-secondary"
              >
                Remove watermark — $5
              </button>
            )}

          </div>
        </div>

        {/* PREVIEW */}
        <div className="hidden lg:flex justify-center">
          <div id="invoice" className="bg-white shadow-lg"
            style={{ width:"794px", height:"1123px", padding:"50px", fontFamily:"Inter, Arial" }}>

            <div className="flex justify-between mb-10">
              <div>
                <h1 className="text-3xl font-semibold">INVOICE</h1>
                <p className="text-gray-500 mt-1">#{form.invoiceNumber}</p>
              </div>

              <div className="text-right text-sm">
                <p><strong>Date:</strong> {form.date}</p>
                <p><strong>Due:</strong> {form.dueDate}</p>
              </div>
            </div>

            <div className="flex justify-between mb-10 text-sm">
              <div>
                <p className="text-gray-500 mb-1">FROM</p>
                <p className="font-medium">{form.yourName}</p>
                <p>{form.yourAddress}</p>
              </div>

              <div>
                <p className="text-gray-500 mb-1">TO</p>
                <p className="font-medium">{form.clientName}</p>
                <p>{form.clientAddress}</p>
              </div>
            </div>

            <table className="w-full text-sm border-t">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3">Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{item.description}</td>
                    <td>{item.qty}</td>
                    <td>${item.rate}</td>
                    <td>${item.qty * item.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-10 text-right">
              <p className="text-gray-500">Subtotal: ${subtotal}</p>
              <p className="text-gray-500">Tax ({form.tax}%): ${taxAmount.toFixed(2)}</p>
              <p className="text-xl font-semibold mt-1">Total: ${total.toFixed(2)}</p>
            </div>

            <div className="mt-10 text-sm">
              <p className="font-semibold mb-1">Payment Details</p>
              <p className="text-gray-600 whitespace-pre-line">
                {form.paymentDetails}
              </p>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .input { border:1px solid #e5e7eb; padding:14px; border-radius:10px; width:100%; }
        .btn-primary { background:linear-gradient(to right,#4f46e5,#6366f1); color:white; padding:16px; border-radius:10px; }
        .btn-secondary { background:linear-gradient(to right,#06b6d4,#3b82f6); color:white; padding:16px; border-radius:10px; }
        .link-btn { color:#4f46e5; cursor:pointer; }
      `}</style>
    </div>
  );
}