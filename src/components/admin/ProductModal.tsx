"use client";

import { useState } from "react";
import { showToast } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ProductModalProps {
  product?: any; // If null, it's an "Add" mode
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: product?.id || "",
    name: product?.name || "",
    description: product?.description || "",
    base_price: product?.base_price || product?.base || 0,
    icon: product?.icon || "📦",
    color: product?.color || "#C45D3E",
    tag: product?.tag || "",
  });

  const supabase = createClient();
  const isEdit = !!product;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.id) {
      showToast("ID and Name are required", "error");
      return;
    }
    
    setLoading(true);
    
    // The base price might be a string like "£18.00/unit", let's clean it up if it's editing
    let cleanPrice = formData.base_price;
    if (typeof cleanPrice === "string") {
      cleanPrice = parseFloat(cleanPrice.replace(/[^0-9.]/g, ""));
    }

    const payload = {
      id: formData.id.toLowerCase().replace(/\s+/g, '-'),
      name: formData.name,
      description: formData.description,
      base_price: cleanPrice || 0,
      icon: formData.icon,
      color: formData.color,
      tag: formData.tag,
    };

    let error;
    if (isEdit) {
      const { error: err } = await supabase.from("products").update(payload).eq("id", product.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("products").insert([payload]);
      error = err;
    }

    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(`Product ${isEdit ? "updated" : "added"} successfully!`, "success");
      onSuccess();
    }
  };

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 9999 }}
    >
      <div className="modal-container" style={{ position: "relative", maxWidth: "500px", padding: "var(--space-2xl)" }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-lg)" }}>
          {isEdit ? "Edit Product" : "Add New Product"}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Product ID (URL slug)</label>
            <input className="form-input" required value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEdit} placeholder="e.g. custom-mugs" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Product Name</label>
            <input className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Custom Mugs" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="A short description of the product" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Base Price (£)</label>
              <input className="form-input" type="number" step="0.01" required value={formData.base_price} onChange={e => setFormData({...formData, base_price: parseFloat(e.target.value)})} />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Emoji Icon</label>
              <input className="form-input" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Theme Color</label>
              <input className="form-input" type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ padding: "4px", height: "42px" }} />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tag (optional)</label>
              <input className="form-input" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} placeholder="e.g. Most Popular" />
            </div>
          </div>

          <button type="submit" className="btn-accent btn-lg" style={{ width: "100%", marginTop: "var(--space-md)" }} disabled={loading}>
            {loading ? "Saving..." : "Save Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
