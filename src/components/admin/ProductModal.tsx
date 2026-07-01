"use client";

import { useState, useRef } from "react";
import { showToast } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ProductModalProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    id: product?.id || "",
    name: product?.name || "",
    description: product?.description || "",
    base_price: product?.base_price || product?.base || 0,
    icon: product?.icon || "📦",
    color: product?.color || "#C45D3E",
    tag: product?.tag || "",
    image: product?.image || "",
  });

  const supabase = createClient();
  const isEdit = !!product;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.image || null;
    const ext = imageFile.name.split(".").pop();
    const fileName = `product-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile, { upsert: true });
    if (error) {
      showToast("Image upload failed: " + error.message, "error");
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.id) {
      showToast("ID and Name are required", "error");
      return;
    }
    setLoading(true);

    let cleanPrice = formData.base_price;
    if (typeof cleanPrice === "string") {
      cleanPrice = parseFloat((cleanPrice as string).replace(/[^0-9.]/g, ""));
    }

    // Upload image if file selected, else use URL
    let imageUrl = formData.image;
    if (imageMode === "upload" && imageFile) {
      const uploaded = await uploadImage();
      if (!uploaded) { setLoading(false); return; }
      imageUrl = uploaded;
    }

    const payload: any = {
      id: formData.id.toLowerCase().replace(/\s+/g, '-'),
      name: formData.name,
      description: formData.description,
      base_price: cleanPrice || 0,
      icon: formData.icon,
      color: formData.color,
      tag: formData.tag,
    };
    if (imageUrl) payload.image = imageUrl;

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
      <div className="modal-container" style={{ position: "relative", maxWidth: "520px", padding: "var(--space-2xl)", maxHeight: "90vh", overflowY: "auto" }}>
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

          {/* IMAGE SECTION */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Product Image</label>
            {/* Tab switch */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "var(--space-sm)" }}>
              <button type="button" onClick={() => setImageMode("url")}
                style={{ padding: "5px 14px", borderRadius: "var(--radius-full)", fontSize: "13px", fontWeight: 600, border: "1px solid", borderColor: imageMode === "url" ? "var(--accent)" : "var(--linen)", background: imageMode === "url" ? "var(--accent)" : "white", color: imageMode === "url" ? "white" : "var(--graphite)", cursor: "pointer" }}>
                Image URL
              </button>
              <button type="button" onClick={() => setImageMode("upload")}
                style={{ padding: "5px 14px", borderRadius: "var(--radius-full)", fontSize: "13px", fontWeight: 600, border: "1px solid", borderColor: imageMode === "upload" ? "var(--accent)" : "var(--linen)", background: imageMode === "upload" ? "var(--accent)" : "white", color: imageMode === "upload" ? "white" : "var(--graphite)", cursor: "pointer" }}>
                Upload File
              </button>
            </div>

            {imageMode === "url" ? (
              <input
                className="form-input"
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.image}
                onChange={e => { setFormData({...formData, image: e.target.value}); setImagePreview(e.target.value); }}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: "2px dashed var(--linen)", borderRadius: "var(--radius-md)", padding: "var(--space-xl)", textAlign: "center", cursor: "pointer", background: "var(--paper)", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--linen)")}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📁</div>
                <div style={{ fontSize: "14px", color: "var(--graphite)", fontWeight: 500 }}>
                  {imageFile ? imageFile.name : "Click to upload image"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--stone)", marginTop: "4px" }}>JPG, PNG, WebP — max 5MB</div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              </div>
            )}

            {/* Preview */}
            {imagePreview && (
              <div style={{ marginTop: "var(--space-sm)", borderRadius: "var(--radius-md)", overflow: "hidden", height: "120px", position: "relative" }}>
                <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImagePreview("")} />
                <div style={{ position: "absolute", top: "6px", right: "6px" }}>
                  <button type="button" onClick={() => { setImagePreview(""); setImageFile(null); setFormData({...formData, image: ""}); }}
                    style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "14px", lineHeight: "24px" }}>×</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Base Price (£)</label>
              <input className="form-input" type="number" step="0.01" required value={formData.base_price} onChange={e => setFormData({...formData, base_price: parseFloat(e.target.value)})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tag (optional)</label>
              <input className="form-input" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} placeholder="e.g. Most Popular" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Theme Color</label>
              <input className="form-input" type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ padding: "4px", height: "42px" }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Emoji Icon</label>
              <input className="form-input" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} />
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
