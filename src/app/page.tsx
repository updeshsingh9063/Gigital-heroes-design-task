"use client";

import Link from "next/link";
import { useReveal } from "@/lib/utils";
import { products } from "@/lib/data";
import Footer from "@/components/layout/Footer";

export default function Home() {
  useReveal();

  return (
    <>
      <section className="hero grid-bg">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge reveal">
              <span className="dot"></span>Web-to-Print Platform
            </div>
            <h1 className="hero-title reveal reveal-delay-1">
              Print without <span className="accent">limits</span>
            </h1>
            <p className="hero-desc reveal reveal-delay-2">
              Six print divisions, one powerful platform. Configure, design, proof and order — all in your browser. From labels to laser-cut, we've got you covered.
            </p>
            <div className="hero-actions reveal reveal-delay-3">
              <Link href="/products" className="btn-accent btn-lg">Explore Products</Link>
              <Link href="/designer" className="btn-ghost btn-lg">Try Designer</Link>
            </div>
            <div className="hero-stats reveal reveal-delay-4">
              <div>
                <div className="hero-stat-value">6</div>
                <div className="hero-stat-label">Print Divisions</div>
              </div>
              <div>
                <div className="hero-stat-value">24h</div>
                <div className="hero-stat-label">Turnaround</div>
              </div>
              <div>
                <div className="hero-stat-value">100%</div>
                <div className="hero-stat-label">Custom</div>
              </div>
            </div>
          </div>
          <div className="hero-visual reveal reveal-delay-2">
            <div className="hero-cards">
              <div className="hero-card">
                <div className="hero-card-img" style={{ background: "linear-gradient(135deg,#C45D3E,#8C5A4A)" }}>
                  <div className="card-icon">🏷️</div>
                </div>
                <div className="hero-card-body">
                  <div className="hero-card-title">Labels &amp; Stickers</div>
                  <div className="hero-card-meta">From £0.12/unit</div>
                </div>
              </div>
              <div className="hero-card">
                <div className="hero-card-img" style={{ background: "linear-gradient(135deg,#4A8C6F,#4A7A8C)" }}>
                  <div className="card-icon">🏁</div>
                </div>
                <div className="hero-card-body">
                  <div className="hero-card-title">Race Numbers</div>
                  <div className="hero-card-meta">Variable data</div>
                </div>
              </div>
              <div className="hero-card">
                <div className="hero-card-img" style={{ background: "linear-gradient(135deg,#6B5B8C,#4A7A8C)" }}>
                  <div className="card-icon">✂️</div>
                </div>
                <div className="hero-card-body">
                  <div className="hero-card-title">Laser-Cut</div>
                  <div className="hero-card-meta">Precision cut</div>
                </div>
              </div>
              <div className="hero-float-badge top-left">✓ Instant pricing</div>
              <div className="hero-float-badge bottom-right">✓ Free proofs</div>
            </div>
          </div>
        </div>
      </section>

      {/* DIVISIONS SECTION */}
      <section className="section">
        <div className="section-narrow">
          <div className="section-header text-center reveal">
            <div className="section-label">Our Divisions</div>
            <h2 className="section-title">Six ways to print</h2>
            <p className="section-subtitle" style={{ margin: "var(--space-md) auto 0" }}>
              Every division runs on the same platform — one account, one checkout, one production pipeline.
            </p>
          </div>
          <div className="divisions-grid">
            {products.map((p, i) => (
              <Link
                href={`/product/${p.id}`}
                key={p.id}
                className={`division-card reveal reveal-delay-${(i % 3) + 1}`}
              >
                <div className="division-card-img" style={{ background: `linear-gradient(135deg,${p.color},${p.color}dd)` }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px", opacity: 0.3 }}>
                    {p.icon}
                  </div>
                  <div className="overlay"></div>
                </div>
                <div className="division-card-body">
                  <div className="division-card-title">{p.name}</div>
                  <div className="division-card-desc">{p.desc}</div>
                  <span className="division-card-tag">{p.tag}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="section-narrow">
          <div className="section-header text-center reveal">
            <div className="section-label">Features</div>
            <h2 className="section-title">Built for production</h2>
          </div>
          <div className="features-strip reveal">
            <div className="feature-cell">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Instant Pricing</div>
              <div className="feature-desc">Live calculator with volume discounts</div>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">🎨</div>
              <div className="feature-title">Online Designer</div>
              <div className="feature-desc">Design in-browser, constrained to print areas</div>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">✓</div>
              <div className="feature-title">Proof Approval</div>
              <div className="feature-desc">Versioned proofs with approval workflow</div>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">📦</div>
              <div className="feature-title">One-Click Reorder</div>
              <div className="feature-desc">Saved designs for fast repeat orders</div>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY PREVIEW */}
      <section className="section">
        <div className="section-narrow">
          <div className="section-header reveal">
            <div className="section-label">Gallery</div>
            <h2 className="section-title">Recent work</h2>
          </div>
          <div className="gallery-grid reveal">
            {products.slice(0, 3).map((p) => (
              <Link href={`/product/${p.id}`} key={p.id} className="gallery-item">
                <div
                  className="gallery-item-img"
                  style={{
                    background: `linear-gradient(135deg,${p.color},${p.color}99)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "80px", opacity: 0.4,
                  }}
                >
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
          <div style={{ textAlign: "center", marginTop: "var(--space-xl)" }} className="reveal">
            <Link href="/gallery" className="btn-ghost">View Full Gallery</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ background: "var(--ink)", color: "var(--cream)" }}>
        <div className="section-narrow text-center">
          <h2 className="section-title reveal" style={{ color: "var(--cream)" }}>Ready to print?</h2>
          <p className="section-subtitle reveal reveal-delay-1" style={{ color: "var(--stone)", margin: "var(--space-md) auto var(--space-xl)" }}>
            Configure your product, get instant pricing, and order in minutes.
          </p>
          <Link href="/products" className="btn-accent btn-lg reveal reveal-delay-2">Get Started</Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
