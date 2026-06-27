"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/utils";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/client";
import Script from "next/script";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CartItem {
  id: number;
  productId: string;
  name: string;
  size: string;
  material: string;
  qty: number;
  price: number;
}

function fmt(n: number) { return "£" + n.toFixed(2); }

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("dh_cart");
    if (stored) setCart(JSON.parse(stored));
  }, []);

  if (cart.length === 0) {
    return (
      <>
        <section className="section text-center" style={{ paddingTop: "calc(var(--nav-height) + var(--space-3xl))" }}>
          <div className="section-narrow">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-md)" }}>Your cart is empty</h2>
            <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)" }}>Add some products to get started</p>
            <Link href="/products" className="btn-accent">Browse Products</Link>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;


  const placeOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      showToast("Please sign in to place an order", "error");
      setLoading(false);
      return;
    }

    // Create Order record
    const orderId = `DH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      customer_id: session.user.id,
      subtotal,
      vat,
      total,
      status: "pending",
    });

    if (orderError) {
      showToast("Error creating order: " + orderError.message, "error");
      setLoading(false);
      return;
    }

    // Create Jobs (Order Items)
    const jobs = cart.map(item => ({
      order_id: orderId,
      product_id: item.productId,
      size: item.size,
      material: item.material,
      qty: item.qty,
      price: item.price,
      status: "quote",
      files_ready: false
    }));

    const { error: jobsError } = await supabase.from("jobs").insert(jobs);

    if (jobsError) {
      showToast("Error creating jobs: " + jobsError.message, "error");
      setLoading(false);
      return;
    }

    // Initialize Razorpay Order via our API
    try {
      const res = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // Open Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "Digital Heroes",
        description: "Custom Print Order",
        order_id: data.orderId,
        handler: async function (response: any) {
          // Update Order Status to paid on success
          await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
          await supabase.from("jobs").update({ status: "order" }).eq("order_id", orderId);

          localStorage.removeItem("dh_cart");
          window.dispatchEvent(new Event("storage"));
          showToast("Payment Successful & Order Placed 🎉", "success");
          router.push("/dashboard");
        },
        prefill: {
          name: session.user.user_metadata?.full_name || "",
          email: session.user.email,
        },
        theme: {
          color: "#C45D3E"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        showToast("Payment failed. Please try again.", "error");
      });
      rzp.open();
      
    } catch (err: any) {
      showToast("Payment initialization failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <section className="section" style={{ paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
        <div className="section-narrow">
          <h1 className="section-title" style={{ marginBottom: "var(--space-xl)" }}>Checkout</h1>
          <div className="checkout-layout">
            <div>
              <div className="checkout-section">
                <h3 className="checkout-section-title">Shipping Information</h3>
                <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="Your name" /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@company.com" /></div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" type="text" placeholder="Street address" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" type="text" placeholder="City" /></div>
                  <div className="form-group"><label className="form-label">Postcode</label><input className="form-input" type="text" placeholder="Postcode" /></div>
                </div>
              </div>
              <div className="checkout-section">
                <h3 className="checkout-section-title">Payment</h3>
                <div style={{ padding: "var(--space-md)", background: "#F5F3F0", border: "1px solid var(--linen)", borderRadius: "var(--radius-md)", color: "var(--stone)", fontSize: "14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "24px" }}>🔒</span>
                  <div>Your payment will be securely processed by Razorpay.</div>
                </div>
              </div>
            </div>
            <div className="checkout-summary">
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)" }}>Order Summary</h3>
              {cart.map((item) => (
                <div key={item.id} className="checkout-item">
                  <div className="checkout-item-img">📦</div>
                  <div className="checkout-item-details">
                    <div className="checkout-item-name">{item.name}</div>
                    <div className="checkout-item-meta">{item.qty} unit{item.qty > 1 ? "s" : ""}</div>
                  </div>
                  <div className="checkout-item-price">{fmt(item.price)}</div>
                </div>
              ))}
              <div className="checkout-totals">
                <div className="checkout-total-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="checkout-total-row"><span>VAT (20%)</span><span>{fmt(vat)}</span></div>
                <div className="checkout-total-row grand"><span>Total</span><span>{fmt(total)}</span></div>
              </div>
              <button className="btn-accent btn-lg" style={{ width: "100%", marginTop: "var(--space-xl)" }} onClick={placeOrder}>Place Order</button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
