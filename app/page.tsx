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

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const [form, setForm] = useState({
    invoiceNumber: "",
    date: "",
    dueDate: "",
    yourName: "",
    yourAddress: "",
    clientName: "",
    clientAddress: "",
    paymentDetails: "",
    items: [{ description: "", qty: 1, rate: 0 }] as Item[],
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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

  const total = form.items.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  );

  const generatePDF = async (watermark: boolean) => {
    if (isMobile) return;

    try {
      setLoading(true);

      const el = document.getElementById("invoice") as HTMLElement;
      if (!el) return;

      await new Promise((r) => setTimeout(r, 300));

      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const img = new Image();
      img.src = dataUrl;

      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

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

      if (watermark) {
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
      alert("Error generating PDF.");
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
          alt="GetPaidFast"
          className="h-30 cursor-pointer hover:opacity-80 transition"
          onClick={() => window.location.href = "/"}
        />

        <p className="text-gray-600 text-sm mt-3">
          Used by +1,200 freelances last week!
        </p>

        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>

      {/* MAIN */}
      <div className="max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-6">

        {/* FORM */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border shadow-sm space-y-4">

          {/* INVOICE INFO */}
          <input name="invoiceNumber" placeholder="Invoice number" onChange={handleChange} className="input" />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="date"
              placeholder="Invoice date"
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => !e.target.value && (e.target.type = "text")}
              onChange={handleChange}
              className="input"
            />

            <input
              type="text"
              name="dueDate"
              placeholder="Due date"
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => !e.target.value && (e.target.type = "text")}
              onChange={handleChange}
              className="input"
            />
          </div>

          {/* PARTIES */}
          <input name="yourName" placeholder="Your name" onChange={handleChange} className="input" />
          <input name="yourAddress" placeholder="Your address" onChange={handleChange} className="input" />
          <input name="clientName" placeholder="Client name" onChange={handleChange} className="input" />
          <input name="clientAddress" placeholder="Client address" onChange={handleChange} className="input" />

          {/* ITEMS */}
          <div>
            <p className="font-medium mb-2">Items</p>

            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                <input
                  placeholder="Description"
                  className="input col-span-3 sm:col-span-2"
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                />
                <input
                  placeholder="Qty"
                  type="number"
                  className="input"
                  onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                />
                <input
                  placeholder="Price"
                  type="number"
                  className="input"
                  onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
                />
              </div>
            ))}

            <button onClick={addItem} className="link-btn">
              + Add item
            </button>
          </div>

          {/* PAYMENT (APRES ITEMS) */}
          <textarea
            name="paymentDetails"
            placeholder={`Payment details (Bank / Wise / PayPal)
            Example:
            Bank transfer (USD)
            Account name: John Doe
            IBAN: XXXX
            SWIFT: XXXX`}
            onChange={handleChange}
            className="input"
            rows={4}
          />

          {/* CTA */}
          <div className="flex flex-col gap-3">

            <button
              disabled={isMobile || loading}
              onClick={() => generatePDF(true)}
              className={`btn-primary cursor-pointer hover:opacity-80 transition ${isMobile ? "disabled-btn" : ""}`}
            >
              {isMobile
                ? "Download PDF (Desktop only)"
                : loading
                ? "Generating PDF..."
                : "Download PDF (free)"}
            </button>

            {!isMobile && (
              <button
                onClick={() => window.open("https://gumroad.com", "_blank")}
                className="btn-secondary cursor-pointer hover:opacity-80 transition"
              >
                Remove watermark — $5
              </button>
            )}

          </div>
        </div>

        {/* PREVIEW */}
        <div className="hidden lg:flex justify-center">
          <div id="invoice" style={{ width: "794px", height: "1123px", padding: "50px", background: "#fff" }}>

            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
              <div>
                <h1 style={{ fontSize: "28px" }}>INVOICE</h1>
                <p style={{ color: "#666" }}>#{form.invoiceNumber}</p>
              </div>

              <div style={{ textAlign: "right", fontWeight: "bold" }}>
                <p>Invoice Date: {form.date}</p>
                <p>Due Date: {form.dueDate}</p>
              </div>
            </div>

            {/* PARTIES */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
              <div>
                <p style={{ color: "#666" }}>FROM</p>
                <p>{form.yourName}</p>
                <p>{form.yourAddress}</p>
              </div>

              <div>
                <p style={{ color: "#666" }}>TO</p>
                <p>{form.clientName}</p>
                <p>{form.clientAddress}</p>
              </div>
            </div>

            {/* ITEMS */}
            <table style={{ width: "100%" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: "10px" }}>{item.description}</td>
                    <td>{item.qty}</td>
                    <td>${item.rate}</td>
                    <td>${item.qty * item.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTAL */}
            <div style={{ marginTop: "40px", textAlign: "right" }}>
              <p>Subtotal: ${total}</p>
              <p style={{ fontWeight: "bold" }}>Total: ${total}</p>
            </div>

            {/* PAYMENT */}
              <div style={{ marginTop: "40px" }}>
                <p style={{ fontWeight: "bold" }}>Payment Details</p>
                <p style={{ whiteSpace: "pre-line", color: "#444" }}>
                  {form.paymentDetails}
                </p>
              </div>
            

          </div>
        </div>

      </div>

      <style jsx>{`
        .input {
          border: 1px solid #e5e7eb;
          padding: 14px;
          border-radius: 10px;
          width: 100%;
        }

        .btn-primary {
          background: linear-gradient(to right, #4f46e5, #6366f1);
          color: white;
          padding: 16px;
          border-radius: 10px;
        }

        .btn-secondary {
          background: linear-gradient(to right, #06b6d4, #3b82f6);
          color: white;
          padding: 16px;
          border-radius: 10px;
        }

        .disabled-btn {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .link-btn {
          color: #4f46e5;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}