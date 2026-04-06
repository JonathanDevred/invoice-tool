"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

type Item = {
  description: string;
  qty: number;
  rate: number;
};

export default function Home() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    invoiceNumber: "",
    yourName: "",
    yourAddress: "",
    clientName: "",
    clientAddress: "",
    date: "",
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
    try {
      setLoading(true);
  
      const el = document.getElementById("invoice") as HTMLElement;
      if (!el) return;
  
      await new Promise((r) => setTimeout(r, 300));
  
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
  
      const pdf = new jsPDF("p", "mm", "a4");
  
      // ✅ FIX MOBILE: attendre image correctement
      const img = new Image();
      img.src = dataUrl;
  
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
  
      const pageWidth = 210;
      const pageHeight = 297;
  
      const imgWidth = img.width;
      const imgHeight = img.height;
  
      const ratio = Math.min(
        pageWidth / imgWidth,
        pageHeight / imgHeight
      );
  
      const renderWidth = imgWidth * ratio;
      const renderHeight = imgHeight * ratio;
  
      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;
  
      pdf.addImage(dataUrl, "PNG", x, y, renderWidth, renderHeight);
  
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
      alert("Error generating PDF. Try again.");
    } finally {
      setLoading(false); // ✅ toujours exécuté
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:p-6 text-black">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8">

        <div className="flex items-center justify-between">

          <img
            src="/Header.png"
            alt="GetPaidFast"
            className="h-30 w-auto cursor-pointer hover:opacity-80 transition"
            onClick={() => window.location.href = "/"}
          />

        </div>

        {/* HOOK */}

        <p className="text-xs text-gray-400 mt-1">
          Used by 1,200+ freelancers this week
        </p>

        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

      </div>

      {/* MAIN */}
      <div className="max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-6">

        {/* FORM */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border shadow-sm space-y-3">

          {[
            ["invoiceNumber", "Invoice number"],
            ["yourName", "Your name"],
            ["yourAddress", "Your address"],
            ["clientName", "Client name"],
            ["clientAddress", "Client address"],
          ].map(([name, placeholder]) => (
            <input
              key={name}
              name={name}
              placeholder={placeholder}
              onChange={handleChange}
              className="input"
            />
          ))}

          {/* DATE UX FIX */}
          <input
            type="text"
            name="date"
            placeholder="Date"
            onFocus={(e) => (e.target.type = "date")}
            onBlur={(e) => {
              if (!e.target.value) e.target.type = "text";
            }}
            onChange={handleChange}
            className="input"
          />

          {/* ITEMS */}
          <div className="pt-4">
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

          {/* CTA */}
          <div className="flex flex-col gap-3 mt-4">

            <button
              disabled={loading}
              onClick={() => generatePDF(true)}
              className="btn-primary"
            >
              {loading ? "Generating PDF..." : "Download PDF (free)"}
            </button>

            <button
              onClick={() => window.open("https://gumroad.com", "_blank")}
              className="btn-secondary"
            >
              Remove watermark — $5
            </button>

          </div>

        </div>

        {/* PREVIEW (DESKTOP ONLY) */}
        <div className="hidden lg:flex justify-center">
          <div
            id="invoice"
            style={{
              width: "794px",
              height: "1123px",
              padding: "50px",
              background: "#fff",
              boxSizing: "border-box",
              fontFamily: "Inter, Arial",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
              <div>
                <h1 style={{ fontSize: "28px" }}>INVOICE</h1>
                <p style={{ color: "#666" }}>#{form.invoiceNumber}</p>
              </div>

              <div>
                <p>{form.date}</p>
              </div>
            </div>

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

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                  <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px" }}>{item.description}</td>
                    <td>{item.qty}</td>
                    <td>${item.rate}</td>
                    <td>${item.qty * item.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: "40px", textAlign: "right" }}>
              <p>Subtotal: ${total}</p>
              <p>Tax: $0</p>
              <p style={{ fontSize: "18px", fontWeight: "bold" }}>
                Total: ${total}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* STYLES */}
      <style jsx>{`
        .input {
          border: 1px solid #e5e7eb;
          padding: 14px;
          border-radius: 10px;
          width: 100%;
          font-size: 16px;
        }

        button {
          cursor: pointer;
          touch-action: manipulation;
        }

        .btn-primary {
          background: linear-gradient(to right, #4f46e5, #6366f1);
          color: white;
          padding: 16px;
          border-radius: 10px;
          transition: 0.2s;
          width: 100%;
          font-size: 16px;
          min-height: 52px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          opacity: 0.95;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: linear-gradient(to right, #06b6d4, #3b82f6);
          color: white;
          padding: 16px;
          border-radius: 10px;
          transition: 0.2s;
          width: 100%;
          font-size: 16px;
          min-height: 52px;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          opacity: 0.95;
        }

        .link-btn {
          color: #4f46e5;
          cursor: pointer;
          font-size: 14px;
        }

        .link-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}