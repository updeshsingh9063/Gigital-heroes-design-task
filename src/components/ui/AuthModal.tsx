"use client";

import { useState } from "react";
import { showToast } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  mode: "login" | "register" | null;
  onClose: () => void;
  onSwitchMode: (mode: "login" | "register") => void;
  onSuccess: (name: string) => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode, onSuccess }: AuthModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const doLogin = async () => {
    if (!email || !password) {
      showToast("Please enter email and password", "error");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      // Provide friendly, actionable error messages
      if (error.message.toLowerCase().includes("invalid login credentials") || error.message.toLowerCase().includes("invalid credentials")) {
        setLoginError("No account found with these details. Please check your email & password, or create a new account.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setLoginError("Please confirm your email address before signing in. Check your inbox!");
      } else {
        setLoginError(error.message);
      }
      return;
    }
    
    setLoginError("");
    // Fetch profile to get name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .single();

    onSuccess(profile?.full_name || "User");
    onClose();
    showToast("Signed in successfully! Welcome back 👋", "success");
  };

  const doRegister = async () => {
    if (!email || !password || !name) {
      showToast("Please fill all fields", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
        showToast("An account with this email already exists. Try signing in instead!", "error");
      } else {
        showToast(error.message, "error");
      }
      return;
    }

    onSuccess(name);
    onClose();
    showToast("Account created! Welcome to Digital Heroes 🎉", "success");
  };

  if (!mode) return null;

  return (
    <div
      id="auth-modal"
      className="modal-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-container auth-modal-container" style={{ position: "relative" }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div id="auth-content">
          {mode === "login" ? (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
                Welcome back
              </h2>
              <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)" }}>
                Sign in to your Digital Heroes account
              </p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@company.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Enter your password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                />
              </div>
              {/* Inline error message */}
              {loginError && (
                <div style={{ background: "#C44A4A11", border: "1px solid #C44A4A44", borderRadius: "var(--radius-md)", padding: "var(--space-md)", marginBottom: "var(--space-md)", fontSize: "13px", color: "#C44A4A", lineHeight: "1.5" }}>
                  ⚠️ {loginError}{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); setLoginError(""); onSwitchMode("register"); }} style={{ color: "#C45D3E", fontWeight: 600, textDecoration: "underline" }}>Create an account →</a>
                </div>
              )}
              <button className="btn-accent btn-lg" style={{ width: "100%" }} onClick={doLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <p style={{ textAlign: "center", marginTop: "var(--space-lg)", fontSize: "14px", color: "var(--graphite)" }}>
                {"Don't have an account? "}
                <a href="#" onClick={(e) => { e.preventDefault(); onSwitchMode("register"); }} style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Create one
                </a>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
                Create account
              </h2>
              <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)" }}>
                Get started with Digital Heroes
              </p>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn-accent btn-lg" style={{ width: "100%" }} onClick={doRegister}>
                Create Account
              </button>
              <p style={{ textAlign: "center", marginTop: "var(--space-lg)", fontSize: "14px", color: "var(--graphite)" }}>
                Already have an account?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); onSwitchMode("login"); }} style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Sign in
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
