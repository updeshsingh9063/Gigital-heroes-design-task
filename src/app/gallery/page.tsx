"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useReveal } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { products as localProducts } from "@/lib/data";
import Footer from "@/components/layout/Footer";

export default function Gallery() {
  useReveal();
  const [filter, setFilter] = useState("all");
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

  const displayed = filter === "all" ? products : products.filter((p) => p.id === filter);

  return (
    <>
      <section className="section" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <div className="section-narrow">
          <div className="section-header reveal">
            <div className="section-label">Gallery</div>
            <h1 className="section-title">Our work</h1>
            <p className="section-subtitle">Browse recent projects across all six divisions.</p>
          </div>
          <div className="gallery-filter-bar reveal">
            <button className={`gallery-filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            {products.map((p) => (
              <button key={p.id} className={`gallery-filter-btn ${filter === p.id ? "active" : ""}`} onClick={() => setFilter(p.id)}>{p.name}</button>
            ))}
          </div>
          <div className="gallery-grid" id="gallery-grid">
            {displayed.map((p) => (
              <Link href={`/product/${p.id}`} key={p.id} className="gallery-item" data-cat={p.id}>
                <div className="gallery-item-img" style={{ position: "relative", overflow: "hidden" }}>
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                </div>
                <div className="gallery-item-overlay">
                  <div>
                    <div className="gallery-item-title">{p.name}</div>
                    <div className="gallery-item-cat">{p.tag}</div>
                  </div>
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
