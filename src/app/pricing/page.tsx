"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useReveal } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { products as localProducts } from "@/lib/data";
import Footer from "@/components/layout/Footer";

function fmt(n: number) { return "£" + Number(n).toFixed(2); }

export default function Pricing() {
  useReveal();
  const [products, setProducts] = useState<any[]>(localProducts);

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: true });
      if (data && data.length > 0) {
        const merged = data.map((p: any) => {
          const local = localProducts.find(lp => lp.name === p.name || lp.id === p.id);
          return { ...p, image: local?.image || p.image };
        });
        setProducts(merged);
      }
    };
    fetchProducts();
  }, []);

  return (
    <>
      <section className="section" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <div className="section-narrow">
          <div className="section-header text-center reveal">
            <div className="section-label">Pricing</div>
            <h1 className="section-title">Transparent pricing</h1>
            <p className="section-subtitle" style={{ margin: "var(--space-md) auto 0" }}>
              Instant online pricing with automatic volume discounts. No subscriptions, no hidden fees.
            </p>
          </div>

          {/* Volume discounts */}
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--linen)", padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }} className="reveal">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)" }}>Volume Discounts</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "var(--space-lg)" }}>
              {[{ qty: "100+", disc: "15% discount" }, { qty: "250+", disc: "25% discount" }, { qty: "500+", disc: "35% discount" }].map((d) => (
                <div key={d.qty} style={{ textAlign: "center", padding: "var(--space-lg)", background: "var(--paper)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 600, color: "var(--ink)" }}>{d.qty}</div>
                  <div style={{ fontSize: "14px", color: "var(--graphite)", marginTop: "4px" }}>{d.disc}</div>
                </div>
              ))}
            </div>
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)", textAlign: "center" }} className="reveal">
            Starting prices
          </h3>
          <div className="divisions-grid reveal">
            {products.map((p) => (
              <Link href={`/product/${p.id}`} key={p.id} className="division-card">
                <div className="division-card-img" style={{ position: "relative", overflow: "hidden", height: "160px" }}>
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                </div>
                <div className="division-card-body" style={{ textAlign: "center", padding: "var(--space-xl)" }}>
                  <div className="division-card-title">{p.name}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 600, color: "var(--accent)", margin: "var(--space-md) 0" }}>
                    {fmt(p.base_price || p.base || 0)}<span style={{ fontSize: "14px", color: "var(--graphite)", fontFamily: "var(--font-body)" }}>/unit</span>
                  </div>
                  <button className="btn-ghost">Configure</button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
