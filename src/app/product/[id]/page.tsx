"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { sizeMap, matMap } from "@/lib/data";
import { showToast } from "@/lib/utils";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";

function fmt(n: number) { return "£" + n.toFixed(2); }

function calcPrice(base: number, si: number, mi: number, qty: number) {
  const sm = 1 + si * 0.35;
  const mm = 1 + mi * 0.2;
  let unit = base * sm * mm;
  if (qty >= 500) unit *= 0.65;
  else if (qty >= 250) unit *= 0.75;
  else if (qty >= 100) unit *= 0.85;
  return unit * qty;
}

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const pid = params.id as string;

  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("products").select("*").eq("id", pid).single();
      setP(data);
      setLoading(false);
    };
    fetchProduct();
  }, [pid]);

  const sz = sizeMap[pid] || [];
  const mt = matMap[pid] || [];

  const [sizeIdx, setSizeIdx] = useState(0);
  const [matIdx, setMatIdx] = useState(0);
  const [qty, setQty] = useState(50);

  if (loading) {
    return (
      <div className="section text-center" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <p style={{ color: "var(--stone)" }}>Loading product...</p>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="section text-center" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <h2>Product not found</h2>
        <button className="btn-primary" onClick={() => router.push("/products")}>Back to Products</button>
      </div>
    );
  }

  const total = calcPrice(p.base_price, sizeIdx, matIdx, qty);
  const unitPrice = total / qty;
  const hasDiscount = qty >= 100;

  const handleAddToCart = () => {
    const item = { id: Date.now(), productId: pid, name: p.name, size: sz[sizeIdx], material: mt[matIdx], qty, price: total };
    const cart = JSON.parse(localStorage.getItem("dh_cart") || "[]");
    cart.push(item);
    localStorage.setItem("dh_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    showToast("Added to cart", "success");
  };

  return (
    <>
      <section className="section" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <div className="section-narrow">
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <Link href="/products" style={{ color: "var(--accent)", fontSize: "14px" }}>← Back to Products</Link>
          </div>
          <div className="calculator-layout">
            {/* Left: product info + options */}
            <div>
              <div style={{ background: `linear-gradient(135deg,${p.color},${p.color}dd)`, borderRadius: "var(--radius-lg)", padding: "var(--space-3xl)", textAlign: "center", marginBottom: "var(--space-xl)" }}>
                <div style={{ fontSize: "120px", opacity: 0.3 }}>{p.icon}</div>
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "48px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-md)" }}>{p.name}</h1>
              <p style={{ fontSize: "17px", color: "var(--graphite)", lineHeight: 1.7, marginBottom: "var(--space-xl)" }}>{p.desc}</p>
              <span className="tag accent" style={{ marginBottom: "var(--space-xl)", display: "inline-block" }}>{p.tag}</span>
              <div className="divider"></div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)" }}>Configure your order</h3>
              <div className="calc-options">
                <div className="calc-option-group">
                  <div className="calc-option-label">Size</div>
                  <div className="calc-option-grid">
                    {sz.map((s, i) => (
                      <button key={s} className={`calc-option-btn ${i === sizeIdx ? "active" : ""}`} onClick={() => setSizeIdx(i)}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="calc-option-group">
                  <div className="calc-option-label">Material</div>
                  <div className="calc-option-grid">
                    {mt.map((m, i) => (
                      <button key={m} className={`calc-option-btn ${i === matIdx ? "active" : ""}`} onClick={() => setMatIdx(i)}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="calc-option-group">
                  <div className="calc-option-label">Quantity</div>
                  <input
                    type="number"
                    className="form-input"
                    value={qty}
                    min="1"
                    onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                    style={{ maxWidth: "200px" }}
                  />
                </div>
              </div>
            </div>

            {/* Right: pricing panel */}
            <div className="calc-panel">
              <div className="calc-price-display">
                <div className="calc-price">{fmt(total)}</div>
                <div className="calc-price-label">Total price</div>
                <div className="calc-price-unit">{fmt(unitPrice)} per unit</div>
                <div className="calc-volume-badge" style={{ display: hasDiscount ? "flex" : "none" }}>✓ Volume discount applied</div>
              </div>
              <div className="calc-breakdown">
                <div className="calc-breakdown-row"><span className="label">Size</span><span className="value">{sz[sizeIdx]}</span></div>
                <div className="calc-breakdown-row"><span className="label">Material</span><span className="value">{mt[matIdx]}</span></div>
                <div className="calc-breakdown-row"><span className="label">Quantity</span><span className="value">{qty}</span></div>
                <div className="calc-breakdown-row"><span className="label">Base price</span><span className="value">{fmt(p.base_price)}/unit</span></div>
              </div>
              <button className="btn-accent btn-lg" style={{ width: "100%" }} onClick={handleAddToCart}>Add to Cart</button>
              <Link href="/designer" className="btn-ghost" style={{ width: "100%", marginTop: "var(--space-md)", display: "block", textAlign: "center" }}>Design Online</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
