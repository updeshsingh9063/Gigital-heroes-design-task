import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <Link href="/" className="nav-logo" style={{ marginBottom: "8px" }}>
              <span className="logo-mark" style={{ background: "var(--accent)" }}>DH</span>
              <span className="logo-text" style={{ color: "var(--cream)" }}>Digital Heroes</span>
            </Link>
            <p className="footer-brand-desc">
              Six print divisions, one owned platform. From labels to laser-cut — configure, design, proof and order.
            </p>
          </div>
          <div>
            <div className="footer-col-title">Products</div>
            <Link className="footer-link" href="/products">Labels & Stickers</Link>
            <Link className="footer-link" href="/products">Race Numbers</Link>
            <Link className="footer-link" href="/products">MTB Boards</Link>
            <Link className="footer-link" href="/products">Stamps</Link>
            <Link className="footer-link" href="/products">Trophies</Link>
            <Link className="footer-link" href="/products">Laser-Cut</Link>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <Link className="footer-link" href="/designer">Online Designer</Link>
            <Link className="footer-link" href="/pricing">Pricing</Link>
            <Link className="footer-link" href="/gallery">Gallery</Link>
            <Link className="footer-link" href="/dashboard">My Account</Link>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <Link className="footer-link" href="#">About Us</Link>
            <Link className="footer-link" href="#">Contact</Link>
            <Link className="footer-link" href="#">Terms</Link>
            <Link className="footer-link" href="#">Privacy</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Digital Heroes. All rights reserved.</span>
          <span>digitalheroes.co.in</span>
        </div>
      </div>
    </footer>
  );
}
