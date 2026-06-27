"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AuthModal from "@/components/ui/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [user, setUser] = useState<{ name: string, role?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Page loader
    setTimeout(() => setLoaded(true), 600);

    // Scroll handler
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    // Cart count
    const updateCart = () => {
      const cart = JSON.parse(localStorage.getItem("dh_cart") || "[]");
      setCartCount(cart.length);
    };
    updateCart();
    window.addEventListener("storage", updateCart);

    // Supabase Auth
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUser({ name: data.full_name, role: data.role });
          });
      } else {
        // No active session — clear any stale cart data
        localStorage.removeItem("dh_cart");
        setCartCount(0);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => {
              if (data) setUser({ name: data.full_name, role: data.role });
            });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage", updateCart);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Re-read cart on every pathname change (SPA-like behavior)
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("dh_cart") || "[]");
    setCartCount(cart.length);
  }, [pathname]);

  const doSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    // Clear cart on sign-out so it doesn't persist for the next visitor
    localStorage.removeItem("dh_cart");
    setCartCount(0);
    window.dispatchEvent(new Event("storage"));
    showToast("Signed out successfully", "success");
    router.push("/");
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  if (pathname?.startsWith("/designer")) return null;

  return (
    <>
      {/* PAGE LOADER */}
      <div id="page-loader" className={loaded ? "loaded" : ""}>
        <div className="loader-inner">
          <div className="loader-bar"></div>
        </div>
      </div>

      <nav id="main-nav" className={isScrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <span className="logo-mark">DH</span>
            <span className="logo-text">Digital Heroes</span>
          </Link>

          <div className="nav-links">
            <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>Home</Link>
            <Link href="/products" className={`nav-link ${pathname.startsWith("/product") ? "active" : ""}`}>Products</Link>
            <Link href="/gallery" className={`nav-link ${pathname === "/gallery" ? "active" : ""}`}>Gallery</Link>
            <Link href="/pricing" className={`nav-link ${pathname === "/pricing" ? "active" : ""}`}>Pricing</Link>
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                {user.role === "admin" ? (
                  <Link href="/admin" className="btn-ghost">Admin Panel</Link>
                ) : (
                  <Link href="/dashboard" className="btn-ghost">My Account</Link>
                )}
                <button className="btn-primary" onClick={doSignOut}>Sign Out</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setAuthMode("login")}>Sign In</button>
                <button className="btn-primary" onClick={() => setAuthMode("register")}>Get Started</button>
              </>
            )}
            <button className="nav-cart" onClick={() => router.push("/checkout")} title="Cart">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M2.25 2.25h1.09l1.34 10.71a2.25 2.25 0 002.23 1.99h10.18a2.25 2.25 0 002.22-1.86l1.5-9H5.25" />
                <circle cx="9" cy="20.25" r="1.5" />
                <circle cx="17" cy="20.25" r="1.5" />
              </svg>
              <span className="cart-count">{cartCount}</span>
            </button>
            <button className="nav-mobile-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV OVERLAY */}
      <div id="mobile-nav-overlay" className={`mobile-nav-overlay ${mobileNavOpen ? "open" : ""}`}>
        <div className="mobile-nav-content">
          <Link href="/" onClick={closeMobileNav}>Home</Link>
          <Link href="/products" onClick={closeMobileNav}>Products</Link>
          <Link href="/gallery" onClick={closeMobileNav}>Gallery</Link>
          <Link href="/pricing" onClick={closeMobileNav}>Pricing</Link>
          <div className="mobile-nav-actions">
            {user ? (
              user.role === "admin" ? (
                <Link href="/admin" className="btn-ghost inline-block" onClick={closeMobileNav}>Admin Panel</Link>
              ) : (
                <Link href="/dashboard" className="btn-ghost inline-block" onClick={closeMobileNav}>My Account</Link>
              )
            ) : (
              <>
                <button className="btn-ghost" onClick={() => { closeMobileNav(); setAuthMode("login"); }}>Sign In</button>
                <button className="btn-primary" onClick={() => { closeMobileNav(); setAuthMode("register"); }}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AUTH MODAL */}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={(m) => setAuthMode(m)}
          onSuccess={(name) => setUser({ name })}
        />
      )}
    </>
  );
}
