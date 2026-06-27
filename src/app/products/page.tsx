"use client";

import Link from "next/link";
import { useReveal } from "@/lib/utils";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  useReveal([products]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("products").select("*");
      if (data) {
        setProducts(data);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  return (
    <>
      <section className="section" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <div className="section-narrow">
          <div className="section-header reveal">
            <div className="section-label">Products</div>
            <h1 className="section-title">Choose your division</h1>
            <p className="section-subtitle">Six specialised print services, one seamless platform.</p>
          </div>
          
          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-3xl)", color: "var(--stone)" }}>
              Loading products...
            </div>
          ) : (
            <div className="divisions-grid">
              {products.map((p, i) => (
                <Link
                  href={`/product/${p.id}`}
                  key={p.id}
                  className={`division-card reveal reveal-delay-${(i % 3) + 1}`}
                >
                  <div className="division-card-img" style={{ background: `linear-gradient(135deg,${p.color},${p.color}dd)` }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", opacity: 0.3 }}>
                      {p.icon}
                    </div>
                    <div className="overlay"></div>
                  </div>
                  <div className="division-card-body">
                    <div className="division-card-title">{p.name}</div>
                    <div className="division-card-desc">{p.description}</div>
                    <span className="division-card-tag">{p.tag}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
