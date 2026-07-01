"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { showToast } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type DashSection = "overview" | "orders" | "designs" | "proofs" | "profile";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<DashSection>("overview");
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", street: "", city: "", postcode: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const postcodeRef = useRef<HTMLInputElement>(null);

  const fetchData = async (session: any) => {
    if (session?.user) {
      const supabase = createClient();
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      
      let resolvedProfile = prof;

      // If no profile row exists (e.g. new Google OAuth user), create one from their metadata
      if (!prof) {
        const meta = session.user.user_metadata || {};
        const fallbackName = meta.full_name || meta.name || session.user.email?.split('@')[0] || "User";
        const { data: newProf } = await supabase
          .from("profiles")
          .upsert({
            id: session.user.id,
            full_name: fallbackName,
            email: session.user.email,
            role: "customer",
          }, { onConflict: "id" })
          .select()
          .single();
        resolvedProfile = newProf || { id: session.user.id, full_name: fallbackName, email: session.user.email, role: "customer" };
      }

      setProfile(resolvedProfile);
      setProfileForm({
        full_name: resolvedProfile?.full_name || "",
        phone: resolvedProfile?.phone || "",
        street: resolvedProfile?.shipping_address?.street || "",
        city: resolvedProfile?.shipping_address?.city || "",
        postcode: resolvedProfile?.shipping_address?.postcode || "",
      });

      const { data: ords } = await supabase.from("orders").select("*").eq("customer_id", session.user.id).order("created_at", { ascending: false });
      setOrders(ords || []);

      if (ords && ords.length > 0) {
        const orderIds = ords.map(o => o.id);
        const { data: jbs } = await supabase
          .from("jobs")
          .select("*, products(name, icon)")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });
        setJobs(jbs || []);

        // Fetch proofs for these jobs
        const jobIds = (jbs || []).map((j: any) => j.id);
        if (jobIds.length > 0) {
          const { data: pfs } = await supabase.from("proofs").select("*, jobs(order_id)").in("job_id", jobIds).order("created_at", { ascending: false });
          setProofs(pfs || []);
        }
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => fetchData(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => fetchData(session));
    return () => authListener.subscription.unsubscribe();
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { showToast("Not signed in", "error"); setSavingProfile(false); return; }
    const { error } = await supabase.from("profiles").update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      shipping_address: { street: profileForm.street, city: profileForm.city, postcode: profileForm.postcode },
    }).eq("id", session.user.id);
    setSavingProfile(false);
    if (error) { showToast("Save failed: " + error.message, "error"); return; }
    showToast("Profile saved ✓", "success");
  };

  const handleReorder = async (job: any) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { showToast("Please sign in to reorder", "error"); return; }
    const orderId = `DH-REORDER-${Date.now()}`;
    const { error: oErr } = await supabase.from("orders").insert({ id: orderId, customer_id: session.user.id, subtotal: job.price || 0, vat: (job.price || 0) * 0.2, total: (job.price || 0) * 1.2, status: "pending" });
    if (oErr) { showToast("Reorder failed: " + oErr.message, "error"); return; }
    const { error: jErr } = await supabase.from("jobs").insert({ order_id: orderId, product_id: job.product_id, size: job.size, material: job.material, qty: job.qty, price: job.price, status: "quote", artwork_json: job.artwork_json });
    if (jErr) { showToast("Reorder job failed: " + jErr.message, "error"); return; }
    showToast("Reordered successfully! 🎉", "success");
    fetchData(await supabase.auth.getSession().then(r => r.data.session));
  };

  const handleProofAction = async (proofId: string, action: "approved" | "rejected") => {
    const supabase = createClient();
    const { error } = await supabase.from("proofs").update({ status: action }).eq("id", proofId);
    if (error) { showToast("Action failed: " + error.message, "error"); return; }
    setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: action } : p));
    showToast(action === "approved" ? "Proof approved ✓ — files unlocked!" : "Changes requested — awaiting revision.", "success");
  };

  const downloadInvoice = (order: any) => {
    const lines = [
      `INVOICE`,
      `Order ID: ${order.id}`,
      `Date: ${new Date(order.created_at).toLocaleDateString()}`,
      `Customer: ${profile.full_name}`,
      `Email: ${profile.email}`,
      ``,
      `Subtotal: £${Number(order.subtotal).toFixed(2)}`,
      `VAT (20%): £${Number(order.vat).toFixed(2)}`,
      `Total: £${Number(order.total).toFixed(2)}`,
      ``,
      `Status: ${order.status}`,
      `Platform: Digital Heroes`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Invoice_${order.id}.txt`;
    a.click(); URL.revokeObjectURL(url);
    showToast("Invoice downloaded", "success");
  };

  const navItems: { key: DashSection; label: string }[] = [
    { key: "overview", label: "📊 Overview" },
    { key: "orders", label: "📦 Orders" },
    { key: "designs", label: "🎨 Saved Designs" },
    { key: "proofs", label: "✓ Proofs" },
    { key: "profile", label: "👤 Profile" },
  ];

  const fmt = (n: number) => "£" + Number(n).toFixed(2);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB");
  const pendingProofs = proofs.filter(p => p.status === "pending").length;

  if (loading) return <div style={{ padding: "var(--space-4xl)", textAlign: "center", color: "var(--stone)" }}>Loading Dashboard...</div>;
  if (!profile) return <div style={{ padding: "var(--space-4xl)", textAlign: "center", color: "var(--stone)" }}>Please sign in to view your dashboard.</div>;

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <div className="dash-sidebar">
        <div style={{ padding: "var(--space-lg) 0", borderBottom: "1px solid var(--linen)", marginBottom: "var(--space-lg)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600, color: "var(--ink)" }}>My Account</div>
        </div>
        <div className="dash-sidebar-nav-items">
          {navItems.map((item) => (
            <div key={item.key} className={`dash-nav-item ${activeSection === item.key ? "active" : ""}`} onClick={() => setActiveSection(item.key)}>
              {item.label}
              {item.key === "proofs" && pendingProofs > 0 && (
                <span style={{ marginLeft: 8, background: "var(--accent)", color: "white", borderRadius: "var(--radius-full)", fontSize: 10, padding: "2px 7px", fontWeight: 700 }}>{pendingProofs}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="dash-main" id="dash-content">

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <>
            <div className="dash-header">
              <h1 className="dash-title">Welcome back, {profile.full_name?.split(" ")[0]}</h1>
              <button className="btn-ghost" onClick={() => window.location.href = "/products"}>New Order</button>
            </div>
            <div className="dash-cards">
              <div className="dash-stat-card"><div className="dash-stat-value">{orders.length}</div><div className="dash-stat-label">Total Orders</div></div>
              <div className="dash-stat-card"><div className="dash-stat-value">{pendingProofs}</div><div className="dash-stat-label">Pending Proofs</div></div>
              <div className="dash-stat-card"><div className="dash-stat-value">{jobs.length}</div><div className="dash-stat-label">Total Jobs</div></div>
              <div className="dash-stat-card"><div className="dash-stat-value">{fmt(orders.reduce((acc, o) => acc + Number(o.total || 0), 0))}</div><div className="dash-stat-label">Total Spent</div></div>
            </div>
            <div style={{ background: "white", border: "1px solid var(--linen)", borderRadius: "var(--radius-lg)", padding: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)" }}>Recent Orders</h3>
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                {orders.length === 0 && <div style={{ color: "var(--stone)" }}>No orders yet. <Link href="/products" style={{ color: "var(--accent)" }}>Browse products →</Link></div>}
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="prod-job-card">
                    <div className="prod-job-header">
                      <div>
                        <div className="prod-job-id">{o.id}</div>
                        <div className="prod-job-meta">{fmtDate(o.created_at)} · {fmt(o.total)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className={`prod-status-badge ${o.status === "completed" ? "done" : "progress"}`}>{o.status}</span>
                        <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => downloadInvoice(o)}>⬇ Invoice</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ORDERS */}
        {activeSection === "orders" && (
          <>
            <div className="dash-header"><h1 className="dash-title">Order History</h1></div>
            <div style={{ background: "white", border: "1px solid var(--linen)", borderRadius: "var(--radius-lg)", padding: "var(--space-xl)" }}>
              {jobs.length === 0 && <div style={{ color: "var(--stone)" }}>No jobs found.</div>}
              {jobs.map((j) => (
                <div key={j.id} className="prod-job-card" style={{ marginBottom: "var(--space-md)" }}>
                  <div className="prod-job-header">
                    <div style={{ flex: 1 }}>
                      <div className="prod-job-id">Order {j.order_id}</div>
                      <div className="prod-job-name">{j.products?.icon} {j.products?.name || "Custom Design"}</div>
                      <div className="prod-job-meta">{j.size && `${j.size} · `}{j.material && `${j.material} · `}{j.qty && `Qty: ${j.qty}`}</div>
                      <div className="prod-job-meta">{fmtDate(j.created_at)}{j.price ? ` · ${fmt(j.price)}` : ""}</div>
                    </div>
                    <span className={`prod-status-badge ${j.status === "completed" ? "done" : "progress"}`}>{j.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
                    <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: "12px" }} onClick={() => handleReorder(j)}>🔁 Reorder</button>
                    <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: "12px" }} onClick={() => downloadInvoice(orders.find(o => o.id === j.order_id) || { id: j.order_id, created_at: j.created_at, subtotal: j.price || 0, vat: 0, total: j.price || 0, status: j.status })}>⬇ Invoice</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SAVED DESIGNS */}
        {activeSection === "designs" && (
          <>
            <div className="dash-header">
              <h1 className="dash-title">Saved Designs</h1>
              <Link href="/designer" className="btn-accent">Create New</Link>
            </div>

            {/* Local saved design */}
            {(() => {
              const preview = typeof window !== "undefined" ? localStorage.getItem("dh_design_preview") : null;
              const savedElements = typeof window !== "undefined" ? localStorage.getItem("dh_design") : null;
              const designJobs = jobs.filter(j => j.artwork_json);

              const orderLocalDraft = async () => {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { showToast("Please sign in to order", "error"); return; }
                const elements = savedElements ? JSON.parse(savedElements) : [];
                if (!elements.length) { showToast("Your draft is empty. Add elements first.", ""); return; }
                const orderId = `DH-DRAFT-${Date.now()}`;
                const { error: oErr } = await supabase.from("orders").insert({ id: orderId, customer_id: session.user.id, subtotal: 12.5, vat: 2.5, total: 15, status: "pending" });
                if (oErr) { showToast("Order failed: " + oErr.message, "error"); return; }
                
                // Store BOTH elements and the preview dataURL in the job's artwork_json
                const { error: jErr } = await supabase.from("jobs").insert({ 
                  order_id: orderId, 
                  status: "proof", 
                  artwork_json: { elements, preview: preview }, 
                  files_ready: true, 
                  price: 15 
                });
                
                if (jErr) { showToast("Job failed: " + jErr.message, "error"); return; }
                showToast("Order placed for £15.00! 🎉", "success");
                fetchData(session);
              };

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-lg)" }}>
                  {preview && (
                    <div style={{ background: "white", border: "1px solid var(--linen)", padding: "var(--space-md)", borderRadius: "var(--radius-lg)" }}>
                      <img src={preview} alt="Saved Design" style={{ width: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--linen)" }} />
                      <div style={{ marginTop: "var(--space-sm)", fontWeight: 600, color: "var(--ink)" }}>Local Draft</div>
                      <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 2 }}>Saved in browser · £15.00 fixed price</div>
                      <div style={{ marginTop: "var(--space-sm)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn-accent" style={{ padding: "6px 14px", fontSize: "13px", flex: 1 }} onClick={orderLocalDraft}>Order (£15)</button>
                        <Link href="/designer" className="btn-ghost" style={{ padding: "6px 14px", fontSize: "13px", textAlign: "center" }}>Edit →</Link>
                      </div>
                    </div>
                  )}
                  {designJobs.map(j => {
                    const savedPreview = j.artwork_json?.preview;
                    return (
                      <div key={j.id} style={{ background: "white", border: "1px solid var(--linen)", padding: "var(--space-md)", borderRadius: "var(--radius-lg)" }}>
                        {savedPreview ? (
                          <div style={{ marginBottom: "var(--space-sm)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--linen)" }}>
                            <img src={savedPreview} alt="Design Preview" style={{ width: "100%", display: "block" }} />
                          </div>
                        ) : (
                          <div style={{ background: "linear-gradient(135deg, #4A7A8C22, #6B5B8C22)", borderRadius: "var(--radius-md)", padding: "var(--space-xl)", textAlign: "center", marginBottom: "var(--space-sm)", fontSize: 36 }}>🎨</div>
                        )}
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>Custom Design</div>
                        <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 2 }}>Order {j.order_id} · {fmtDate(j.created_at)}</div>
                        <div style={{ fontSize: 12, color: "var(--graphite)", marginTop: 2 }}>£15.00 fixed price</div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span className={`prod-status-badge ${j.status === "completed" ? "done" : "progress"}`} style={{ fontSize: 11 }}>{j.status}</span>
                          <button className="btn-ghost" style={{ padding: "4px 12px", fontSize: "11px" }} onClick={() => handleReorder(j)}>🔁 Reorder</button>
                        </div>
                      </div>
                    );
                  })}
                  {!preview && designJobs.length === 0 && (
                    <div style={{ gridColumn: "1/-1", background: "white", border: "1px solid var(--linen)", borderRadius: "var(--radius-lg)", padding: "var(--space-3xl)", textAlign: "center", color: "var(--stone)" }}>
                      No saved designs yet. <Link href="/designer" style={{ color: "var(--accent)" }}>Create your first design →</Link>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* PROOFS */}
        {activeSection === "proofs" && (
          <>
            <div className="dash-header"><h1 className="dash-title">Proof Approvals</h1></div>
            {proofs.length === 0 ? (
              <div style={{ background: "white", border: "1px solid var(--linen)", borderRadius: "var(--radius-lg)", padding: "var(--space-3xl)", textAlign: "center", color: "var(--stone)" }}>
                No proofs yet. Submit a design to receive your first proof.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                {proofs.map(p => (
                  <div key={p.id} style={{ background: "white", border: `1px solid ${p.status === "pending" ? "var(--accent)" : "var(--linen)"}`, borderRadius: "var(--radius-lg)", padding: "var(--space-xl)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>Proof v{p.version}</div>
                        <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 3 }}>Order: {p.jobs?.order_id} · {fmtDate(p.created_at)}</div>
                      </div>
                      <span className={`prod-status-badge ${p.status === "approved" ? "done" : p.status === "rejected" ? "" : "progress"}`}>{p.status}</span>
                    </div>
                    {p.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, marginTop: "var(--space-md)" }}>
                        <button className="btn-accent" style={{ fontSize: 13, padding: "7px 18px" }} onClick={() => handleProofAction(p.id, "approved")}>✓ Approve Proof</button>
                        <button className="btn-ghost" style={{ fontSize: 13, padding: "7px 18px", borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => handleProofAction(p.id, "rejected")}>✕ Request Changes</button>
                      </div>
                    )}
                    {p.status === "approved" && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Approved — print files are now unlocked for production</div>
                    )}
                    {p.status === "rejected" && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger)" }}>Changes requested — awaiting updated proof from production team</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PROFILE */}
        {activeSection === "profile" && (
          <>
            <div className="dash-header"><h1 className="dash-title">Profile</h1></div>
            <div style={{ background: "white", border: "1px solid var(--linen)", borderRadius: "var(--radius-lg)", padding: "var(--space-xl)" }}>
              <div className="form-group"><label className="form-label">Full Name</label>
                <input ref={nameRef} className="form-input" type="text" value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-input" type="email" defaultValue={profile.email || ""} disabled />
              </div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input ref={phoneRef} className="form-input" type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="Add your phone number" />
              </div>
              <div className="divider"></div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)" }}>Shipping Address</h3>
              <div className="form-group"><label className="form-label">Street Address</label>
                <input ref={streetRef} className="form-input" type="text" value={profileForm.street} onChange={e => setProfileForm(f => ({ ...f, street: e.target.value }))} placeholder="E.g. 123 Print Lane" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group"><label className="form-label">City</label>
                  <input ref={cityRef} className="form-input" type="text" value={profileForm.city} onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))} placeholder="E.g. London" />
                </div>
                <div className="form-group"><label className="form-label">Postcode</label>
                  <input ref={postcodeRef} className="form-input" type="text" value={profileForm.postcode} onChange={e => setProfileForm(f => ({ ...f, postcode: e.target.value }))} placeholder="E.g. EC1A 1BB" />
                </div>
              </div>
              <button className="btn-accent" style={{ marginTop: "var(--space-md)" }} onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
