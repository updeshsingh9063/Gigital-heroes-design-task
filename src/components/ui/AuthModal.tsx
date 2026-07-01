"use client";

import { useState } from "react";
import { showToast } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  mode: "login" | "register" | "forgot_password" | null;
  onClose: () => void;
  onSwitchMode: (mode: "login" | "register" | "forgot_password") => void;
  onSuccess: (name: string, role?: string) => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode, onSuccess }: AuthModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const doGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

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
    // Fetch profile to get name and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", data.user.id)
      .single();

    onSuccess(profile?.full_name || "User", profile?.role);
    onClose();
    showToast("Signed in successfully! Welcome back 👋", "success");
  };

  const doResetPassword = async () => {
    if (!email) {
      showToast("Please enter your email", "error");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Password reset link sent to your email!", "success");
      onSwitchMode("login");
    }
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
          {mode === "forgot_password" ? (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
                Reset Password
              </h2>
              <p style={{ color: "var(--graphite)", marginBottom: "var(--space-xl)" }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doResetPassword()}
                />
              </div>
              <button className="btn-accent btn-lg" style={{ width: "100%", marginBottom: "var(--space-md)" }} onClick={doResetPassword} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <p style={{ textAlign: "center", marginTop: "var(--space-lg)", fontSize: "14px", color: "var(--graphite)" }}>
                Remember your password?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); onSwitchMode("login"); }} style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Sign in
                </a>
              </p>
            </>
          ) : mode === "login" ? (
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
              <div className="form-group" style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label className="form-label">Password</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); onSwitchMode("forgot_password"); }} style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 500 }}>Forgot password?</a>
                </div>
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
              <button className="btn-accent btn-lg" style={{ width: "100%", marginBottom: "var(--space-md)" }} onClick={doLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <div style={{ display: "flex", alignItems: "center", margin: "var(--space-md) 0", color: "var(--graphite)", fontSize: "14px" }}>
                <div style={{ flex: 1, borderBottom: "1px solid var(--border)" }}></div>
                <span style={{ padding: "0 10px" }}>or</span>
                <div style={{ flex: 1, borderBottom: "1px solid var(--border)" }}></div>
              </div>

              <button 
                className="btn-outline btn-lg" 
                style={{ width: "100%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "10px", backgroundColor: "#fff", color: "#333", border: "1px solid #ddd" }}
                onClick={doGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
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
              <button className="btn-accent btn-lg" style={{ width: "100%", marginBottom: "var(--space-md)" }} onClick={doRegister} disabled={loading}>
                Create Account
              </button>

              <div style={{ display: "flex", alignItems: "center", margin: "var(--space-md) 0", color: "var(--graphite)", fontSize: "14px" }}>
                <div style={{ flex: 1, borderBottom: "1px solid var(--border)" }}></div>
                <span style={{ padding: "0 10px" }}>or</span>
                <div style={{ flex: 1, borderBottom: "1px solid var(--border)" }}></div>
              </div>

              <button 
                className="btn-outline btn-lg" 
                style={{ width: "100%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "10px", backgroundColor: "#fff", color: "#333", border: "1px solid #ddd" }}
                onClick={doGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
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
