"use client";

import Link from "next/link";
import { useState } from "react";
import { useReveal } from "@/lib/utils";
import { products } from "@/lib/data";
import Footer from "@/components/layout/Footer";

export default function Gallery() {
  useReveal();
  const [filter, setFilter] = useState("all");

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
                <div className="gallery-item-img" style={{ background: `linear-gradient(135deg,${p.color},${p.color}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", opacity: 0.4 }}>
                  {p.icon}
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
