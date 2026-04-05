"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function Home() {
  const [form, setForm] = useState({
    invoiceNumber: "",
    yourName: "",
    yourAddress: "",
    clientName: "",
    clientAddress: "",
    description: "",
    amount: "",
    date: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const downloadPDF = async () => {
    const element = document.getElementById("pdf-template") as HTMLElement;
    if (!element) return;

    // 👉 rendre visible temporairement
    element.style.opacity = "1";
    element.style.pointerEvents = "auto";
    element.style.zIndex = "9999";

    // 👉 attendre rendu + fonts
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 200));

    try {
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        const imgWidth = 210;
        const imgHeight = (img.height * imgWidth) / img.width;

        pdf.addImage(img, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(`invoice-${form.invoiceNumber || "invoice"}.pdf`);
      };
    } catch (err) {
      console.error("PDF error:", err);
    }

    // 👉 remettre invisible
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
    element.style.zIndex = "-1";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-4xl font-bold text-gray-900">
          Create invoices in seconds
        </h1>
        <p className="text-gray-600 mt-2">
          Simple, clean, and ready to send.
        </p>
      </div>

      {/* MAIN */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 gap-8">

        {/* FORM */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col gap-4">

          {[
            ["invoiceNumber", "Invoice number"],
            ["yourName", "Your name"],
            ["yourAddress", "Your address"],
            ["clientName", "Client name"],
            ["clientAddress", "Client address"],
            ["description", "Description"],
            ["amount", "Amount ($)"],
          ].map(([name, placeholder]) => (
            <input
              key={name}
              name={name}
              placeholder={placeholder}
              onChange={handleChange}
              className="border p-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}

          <input
            name="date"
            type="date"
            onChange={handleChange}
            className="border p-3 rounded-lg text-gray-900"
          />

          {/* BUTTONS */}
          <button
            onClick={downloadPDF}
            className="mt-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white p-3 rounded-lg hover:opacity-90 transition"
          >
            Download PDF (free)
          </button>

          <button
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-lg hover:opacity-90 transition"
          >
            Download clean PDF — $5
          </button>

        </div>

        {/* PREVIEW UI */}
        <div className="bg-white p-10 rounded-xl border shadow-sm text-black">

          <div className="flex justify-between mb-6">
            <h2 className="text-2xl font-bold">INVOICE</h2>

            <div className="text-right text-sm">
              <p><strong>Invoice #</strong> {form.invoiceNumber}</p>
              <p>{form.date}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm">

            <div>
              <p className="font-semibold">From</p>
              <p>{form.yourName}</p>
              <p>{form.yourAddress}</p>
            </div>

            <div>
              <p className="font-semibold">To</p>
              <p>{form.clientName}</p>
              <p>{form.clientAddress}</p>
            </div>

            <div>
              <p><strong>Description:</strong> {form.description}</p>
            </div>
          </div>

          <div className="border-t my-6"></div>

          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-bold">
              {form.amount ? `$${form.amount}` : ""}
            </span>
          </div>

          <p className="text-gray-500 mt-10 text-sm">
            Created with GetPaidFast
          </p>
        </div>
      </div>

      {/* PDF TEMPLATE (PRO CLEAN) */}
      <div
        id="pdf-template"
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
          width: "794px",
          background: "#ffffff",
          padding: "50px",
          color: "#000",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "50px" }}>
          <div>
            <h1 style={{ fontSize: "26px", margin: 0 }}>INVOICE</h1>
            <p style={{ marginTop: "6px", color: "#555" }}>GetPaidFast</p>
          </div>

          <div style={{ textAlign: "right", fontSize: "12px" }}>
            <p><strong>Invoice #</strong> {form.invoiceNumber}</p>
            <p>{form.date}</p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "50px" }}>
          <div>
            <p><strong>From</strong></p>
            <p>{form.yourName}</p>
            <p>{form.yourAddress}</p>
          </div>

          <div>
            <p><strong>To</strong></p>
            <p>{form.clientName}</p>
            <p>{form.clientAddress}</p>
          </div>
        </div>

        <div style={{ marginBottom: "50px" }}>
          <p><strong>Description</strong></p>
          <p>{form.description}</p>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "2px solid #000",
          paddingTop: "20px"
        }}>
          <span>Total</span>
          <span style={{ fontSize: "22px", fontWeight: "bold" }}>
            {form.amount ? `$${form.amount}` : ""}
          </span>
        </div>
      </div>

    </div>
  );
}