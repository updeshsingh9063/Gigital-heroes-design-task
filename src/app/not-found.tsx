import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section text-center" style={{ paddingTop: "calc(var(--nav-height) + var(--space-3xl))" }}>
      <div className="section-narrow">
        <div style={{ fontSize: "120px", marginBottom: "var(--space-lg)", opacity: 0.3 }}>404</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-md)" }}>
          Page not found
        </h2>
        <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)" }}>
          The page you're looking for doesn't exist.
        </p>
        <Link href="/" className="btn-accent">Go Home</Link>
      </div>
    </section>
  );
}
