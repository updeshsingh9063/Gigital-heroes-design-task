"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Password updated successfully!", "success");
      router.push("/");
    }
  };

  return (
    <div className="section" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
      <div style={{ background: "white", padding: "var(--space-2xl)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", maxWidth: "400px", width: "100%" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-md)", textAlign: "center" }}>Set New Password</h1>
        <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)", textAlign: "center", fontSize: "15px" }}>
          Please enter your new password below.
        </p>

        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
          />
        </div>

        <button
          className="btn-accent btn-lg"
          style={{ width: "100%", marginTop: "var(--space-md)" }}
          onClick={handleReset}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}
