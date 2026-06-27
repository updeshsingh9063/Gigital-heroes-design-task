"use client";

import { useEffect } from "react";

export function useReveal(deps: any[] = []) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    // Small delay to allow React to flush DOM updates
    const timeoutId = setTimeout(() => {
      document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, deps);
}

export function showToast(msg: string, type: string = "") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const d = document.createElement("div");
  d.className = `toast ${type}`;
  d.textContent = msg;
  c.appendChild(d);
  setTimeout(() => {
    d.style.opacity = "0";
    setTimeout(() => d.remove(), 300);
  }, 2800);
}
