"use client";

import { useState, useEffect } from "react";

type Item = {
  description: string;
  qty: number;
  rate: number;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setIsPaid(true);
    }
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

  const generatePDF = async () => {
    if (isMobile) return;

    try {
      setLoading(true);

      // ✅ import dynamique (FIX BUILD)
      const { toPng } = await import("html-to-image");
      const jsPDF = (await import("jspdf")).default;

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

      if (!isPaid) {
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

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await res.json();
      window.location.href = data.url;

    } catch (err) {
      alert("Payment error.");
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
          Used by +1,200 freelancers last week
        </p>

        {isPaid && (
          <p className="text-green-600 text-sm mt-2 font-medium">
            Payment successful — watermark removed 🎉
          </p>
        )}

        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>

      {/* MAIN */}
      <div className="max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-6">

        {/* FORM */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border shadow-sm space-y-4">

          <input name="invoiceNumber" placeholder="Invoice number" onChange={handleChange} className="input" />

          <div className="grid grid-cols-2 gap-2">
            <input type="text" name="date" placeholder="Invoice date"
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => !e.target.value && (e.target.type = "text")}
              onChange={handleChange} className="input" />

            <input type="text" name="dueDate" placeholder="Due date"
              onFocus={(e) => (e.target.type = "date")}
              onBlur={(e) => !e.target.value && (e.target.type = "text")}
              onChange={handleChange} className="input" />
          </div>

          <input name="yourName" placeholder="Your name" onChange={handleChange} className="input" />
          <input name="yourAddress" placeholder="Your address" onChange={handleChange} className="input" />
          <input name="clientName" placeholder="Client name" onChange={handleChange} className="input" />
          <input name="clientAddress" placeholder="Client address" onChange={handleChange} className="input" />

          {/* ITEMS */}
          <div>
            <p className="font-medium mb-2">Items</p>

            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                <input className="input col-span-3 sm:col-span-2"
                  placeholder="Description"
                  onChange={(e) => updateItem(i, "description", e.target.value)} />
                <input className="input" type="number"
                  placeholder="Qty"
                  onChange={(e) => updateItem(i, "qty", Number(e.target.value))} />
                <input className="input" type="number"
                  placeholder="Price"
                  onChange={(e) => updateItem(i, "rate", Number(e.target.value))} />
              </div>
            ))}

            <button onClick={addItem} className="link-btn">+ Add item</button>
          </div>

          <textarea
            name="paymentDetails"
            placeholder="Payment details (Bank, Wise, PayPal...)"
            onChange={handleChange}
            className="input"
            rows={4}
          />

          {/* CTA */}
          <div className="flex flex-col gap-3">

            <button
              disabled={isMobile || loading}
              onClick={generatePDF}
              className={`btn-primary ${isMobile ? "disabled-btn" : ""}`}
            >
              {isMobile
                ? "Download PDF (Desktop only)"
                : loading
                ? "Generating PDF..."
                : isPaid
                ? "Download clean PDF"
                : "Download PDF (free)"}
            </button>

            {!isMobile && !isPaid && (
              <button
                onClick={handleCheckout}
                className="btn-secondary cursor-pointer hover:opacity-80 transition"
              >
                Remove watermark — $5
              </button>
            )}

          </div>
        </div>

        {/* PREVIEW inchangé */}
        <div className="hidden lg:flex justify-center">
          <div id="invoice" style={{ width: "794px", height: "1123px", padding: "50px", background: "#fff" }}>
            {/* ... ton preview reste EXACTEMENT pareil */}
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