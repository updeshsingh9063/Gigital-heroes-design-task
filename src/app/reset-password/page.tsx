"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Wait briefly for Supabase to detect the session from the URL hash/cookie
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // Listen for when the session is established (after redirect from callback)
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
            setSessionReady(true);
          }
        });
        return () => listener.subscription.unsubscribe();
      }
    });
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Password updated successfully! Please sign in.", "success");
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  return (
    <div className="section" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "calc(var(--nav-height) + var(--space-2xl))" }}>
      <div style={{ background: "white", padding: "var(--space-2xl)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", maxWidth: "400px", width: "100%" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 600, color: "var(--ink)", marginBottom: "var(--space-md)", textAlign: "center" }}>
          Set New Password
        </h1>
        <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)", textAlign: "center", fontSize: "15px" }}>
          Please enter your new password below.
        </p>

        {!sessionReady ? (
          <div style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--stone)" }}>
            <div style={{ marginBottom: "12px", fontSize: "24px" }}>🔐</div>
            Verifying your reset link...
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--stone)", display: "flex", alignItems: "center", padding: 0 }}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <button
              className="btn-accent btn-lg"
              style={{ width: "100%", marginTop: "var(--space-md)" }}
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
