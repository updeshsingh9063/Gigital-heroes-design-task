"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/utils";
import type { DesignElement, PrintArea } from "@/components/designer/DesignerCanvas";
import Konva from "konva";
import { createClient } from "@/lib/supabase/client";

const DesignerCanvas = dynamic(() => import("@/components/designer/DesignerCanvas"), {
  ssr: false,
  loading: () => (
    <div style={{ width: 680, height: 480, background: "#1E1C1A", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 14 }}>
      Loading canvas…
    </div>
  ),
});

// ─── Google Fonts ─────────────────────────────────────────────────────────────
const GOOGLE_FONTS = [
  "Outfit","Inter","Roboto","Open Sans","Lato","Montserrat","Poppins","Raleway",
  "Nunito","Oswald","Playfair Display","Merriweather","Lora","EB Garamond",
  "Dancing Script","Pacifico","Lobster","Bebas Neue","Anton","Alfa Slab One",
  "Righteous","Comfortaa","Quicksand","Josefin Sans","Caveat","Indie Flower",
  "Permanent Marker","Bangers","Black Han Sans","Special Elite",
];
const SYSTEM_FONTS = ["Arial","Georgia","Times New Roman","Courier New","Impact","Verdana","Trebuchet MS"];
const ALL_FONTS = [...GOOGLE_FONTS, ...SYSTEM_FONTS];

const PAD = 40;

const PALETTE = [
  "#6B5B8C","#E8E0D5","#A39E96","#2C2926","#F3F0EB","#E63946","#457B9D",
  "#2A9D8F","#E9C46A","#F4A261","#264653","#8338EC","#06D6A0",
];

const TEMPLATES = [
  { label:"Race Number",  icon:"🏁", els:[
    { type:"text" as const, x:200,y:140, text:"001",  fontSize:96, fontFamily:"Bebas Neue", fill:"#1A1816"},
    { type:"text" as const, x:155,y:270, text:"MARATHON 2024", fontSize:22, fontFamily:"Oswald", fill:"#C45D3E"},
  ]},
  { label:"Product Label", icon:"🏷️", els:[
    { type:"rect"  as const, x:80, y:60,  width:440, height:280, fill:"#C45D3E"},
    { type:"text"  as const, x:140,y:145, text:"PRODUCT NAME", fontSize:36, fontFamily:"Montserrat", fill:"#FFFFFF", fontStyle:"bold"},
    { type:"text"  as const, x:190,y:210, text:"Premium Quality",fontSize:18, fontFamily:"Lora", fill:"#FFFFFF"},
  ]},
  { label:"Circular Sticker", icon:"⭕", els:[
    { type:"circle" as const, x:340,y:240, radius:160, fill:"#4A8C6F"},
    { type:"text"   as const, x:240,y:205, text:"ECO BRAND", fontSize:30, fontFamily:"Raleway", fill:"#FFFFFF", fontStyle:"bold"},
    { type:"text"   as const, x:278,y:252, text:"Since 2020", fontSize:16, fontFamily:"Lora", fill:"#FFFFFF"},
  ]},
  { label:"MTB Plate", icon:"🚵", els:[
    { type:"rect" as const, x:60, y:80,  width:480, height:260, fill:"#4A7A8C"},
    { type:"text" as const, x:195,y:175, text:"42", fontSize:130, fontFamily:"Anton", fill:"#FFFFFF"},
  ]},
  { label:"Gold Trophy", icon:"🏆", els:[
    { type:"star" as const,  x:340,y:200, outerRadius:100, innerRadius:45, numPoints:5, fill:"#D4A03C"},
    { type:"text" as const,  x:220,y:345, text:"WINNER", fontSize:32, fontFamily:"Bebas Neue", fill:"#D4A03C", letterSpacing:8},
  ]},
  { label:"Bold Quote", icon:"💬", els:[
    { type:"rect" as const, x:40, y:40, width:520, height:320, fill:"#1A1816"},
    { type:"text" as const, x:70, y:120, text:'"Design is\nnot just\nwhat it\nlooks like."', fontSize:36, fontFamily:"Playfair Display", fill:"#FFFFFF", lineHeight:1.3, fontStyle:"italic"},
  ]},
];

function uid() { return Math.random().toString(36).slice(2,9); }
type Section = "settings"|"shapes"|"text"|"templates"|"upload"|"layers";

export default function DesignerPage() {
  const router = useRouter();
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const [printArea, setPrintArea]   = useState<PrintArea>({ x: 40, y: 40, width: 800, height: 600 });
  const [elements, setElements]     = useState<DesignElement[]>([]);
  const [history, setHistory]       = useState<DesignElement[][]>([[]]);
  const [histIdx, setHistIdx]       = useState(0);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [activeSection, setSection] = useState<Section>("shapes");
  const [zoom, setZoom]             = useState(0.85);
  const [bgColor, setBgColor]       = useState("#FFFFFF");
  const [fontSearch, setFontSearch] = useState("");

  const selectedEl = elements.find(e => e.id === selectedId) ?? null;

  // ── Load Google Fonts ──────────────────────────────────────────────────────
  useEffect(() => {
    const families = GOOGLE_FONTS.map(f => f.replace(/ /g,"+")).join("|");
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${families.split("|").map(f=>`${f}:wght@400;700`).join("&family=")}&display=swap`;
    document.head.appendChild(link);
  }, []);

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const pushHistory = useCallback((els: DesignElement[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, histIdx + 1);
      return [...trimmed, els];
    });
    setHistIdx(prev => prev + 1);
  }, [histIdx]);

  const undo = useCallback(() => {
    if (histIdx <= 0) return;
    const newIdx = histIdx - 1;
    setHistIdx(newIdx);
    setElements(history[newIdx]);
    setSelectedId(null);
  }, [histIdx, history]);

  const redo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const newIdx = histIdx + 1;
    setHistIdx(newIdx);
    setElements(history[newIdx]);
    setSelectedId(null);
  }, [histIdx, history]);

  // ── Element mutation (always pushes history) ───────────────────────────────
  const commitElements = useCallback((next: DesignElement[]) => {
    setElements(next);
    pushHistory(next);
  }, [pushHistory]);

  const updateEl = useCallback((id: string, attrs: Partial<DesignElement>) => {
    setElements(prev => {
      const next = prev.map(el => el.id === id ? {...el,...attrs} : el);
      return next;
    });
  }, []);

  // commit on drag/transform end (called from canvas)
  const commitUpdateEl = useCallback((id: string, attrs: Partial<DesignElement>) => {
    setElements(prev => {
      const next = prev.map(el => el.id === id ? {...el,...attrs} : el);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if ((e.metaKey||e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.metaKey||e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) { e.preventDefault(); redo(); }
      if ((e.metaKey||e.ctrlKey) && e.key === "d") { e.preventDefault(); duplicateSelected(); }
      if (e.key === "Delete") deleteSelected();
      if (e.key === "Escape") setSelectedId(null);
      if (e.key === "+" || e.key === "=") setZoom(z => Math.min(2, +(z+0.1).toFixed(1)));
      if (e.key === "-") setZoom(z => Math.max(0.25, +(z-0.1).toFixed(1)));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, elements, histIdx]);

  // ── Load from Local Storage on Mount ───────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dh_design_json");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setElements(parsed);
          setHistory([parsed]);
        }
      }
    } catch(e) {
      console.error("Failed to load design", e);
    }
  }, []);

  // Auto-focus text editor when text is selected
  useEffect(() => {
    if (selectedEl?.type === "text") {
      setTimeout(() => document.getElementById("text-edit-box")?.focus(), 50);
    }
  }, [selectedId]);

  // ── Add helpers ────────────────────────────────────────────────────────────
  const add = (partial: Omit<DesignElement,"id">) => {
    const el = {...partial, id: uid()} as DesignElement;
    const next = [...elements, el];
    commitElements(next);
    setSelectedId(el.id);
    setSection("layers");
    return el;
  };

  const addText   = () => add({ type:"text",   x:printArea.x+80,  y:printArea.y+80,  text:"Your Text Here", fontSize:32, fontFamily:"Outfit", fill:"#1A1816", fontStyle:"normal", align:"left", opacity:1 });
  const addRect   = () => add({ type:"rect",   x:printArea.x+120, y:printArea.y+120, width:160, height:100, fill:"#C45D3E", opacity:1 });
  const addCircle = () => add({ type:"circle", x:printArea.x+220, y:printArea.y+200, radius:60, fill:"#4A8C6F", opacity:1 });
  const addTri    = () => add({ type:"triangle",x:printArea.x+240, y:printArea.y+200, radius:70, fill:"#D4A03C", opacity:1 });
  const addStar   = () => add({ type:"star",   x:printArea.x+280, y:printArea.y+200, outerRadius:70, innerRadius:35, numPoints:5, fill:"#D4A03C", opacity:1 });
  const addArrow  = () => add({ type:"arrow",  x:printArea.x+100, y:printArea.y+200, points:[0,0,150,0], stroke:"#C45D3E", fill:"#C45D3E", strokeWidth:4, opacity:1 });
  const addLine   = () => add({ type:"line",   x:printArea.x+100, y:printArea.y+200, points:[0,0,150,0], stroke:"#1A1816", strokeWidth:3, opacity:1 });

  const loadTemplate = (tpl: typeof TEMPLATES[0]) => {
    const els: DesignElement[] = tpl.els.map(e => ({...e, id:uid(), opacity:1}));
    commitElements(els);
    setSelectedId(null);
    showToast(`Template "${tpl.label}" loaded`, "success");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const src = URL.createObjectURL(file);
    add({ type:"image", x:printArea.x+60, y:printArea.y+60, width:200, height:200, src, opacity:1 });
    showToast("Image added", "success");
    e.target.value = "";
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const next = elements.filter(e => e.id !== selectedId);
    commitElements(next);
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selectedEl) return;
    const el = {...selectedEl, id:uid(), x:selectedEl.x+20, y:selectedEl.y+20};
    const next = [...elements, el];
    commitElements(next);
    setSelectedId(el.id);
  };

  const moveLayer = (dir: "up"|"down") => {
    if (!selectedId) return;
    const i = elements.findIndex(e => e.id === selectedId);
    const next = [...elements];
    if (dir === "up" && i < next.length-1) { [next[i],next[i+1]] = [next[i+1],next[i]]; }
    if (dir === "down" && i > 0) { [next[i],next[i-1]] = [next[i-1],next[i]]; }
    commitElements(next);
  };

  const flipH = () => {
    if (!selectedEl) return;
    updateEl(selectedEl.id, { scaleX: (selectedEl.scaleX||1) * -1 });
  };
  const flipV = () => {
    if (!selectedEl) return;
    updateEl(selectedEl.id, { scaleY: (selectedEl.scaleY||1) * -1 });
  };

  const handleSave = () => {
    if (!stageRef.current) return;
    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    localStorage.setItem("dh_design_json", JSON.stringify(elements));
    localStorage.setItem("dh_design_preview", dataURL);
    showToast("Design saved ✓", "success");
  };

  const handleDownload = () => {
    if (!stageRef.current) return;
    
    // Deselect elements temporarily before downloading so the blue transformer border is hidden
    const tempId = selectedId;
    setSelectedId(null);
    
    // Wait a brief tick for state to settle, then download
    setTimeout(() => {
      if (!stageRef.current) return;
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 3, mimeType: "image/png" });
      const link = document.createElement("a");
      link.download = `design-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSelectedId(tempId);
      showToast("Download started", "success");
    }, 50);
  };

  const submitForProof = async () => {
    if (elements.length === 0) { showToast("Add elements to your design first!", ""); return; }
    
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast("Please log in to submit your design for proof!", "error");
      return;
    }

    const orderId = `DH-DESIGN-${Date.now()}`;
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      customer_id: session.user.id,
      subtotal: 0,
      vat: 0,
      total: 0,
      status: 'pending'
    });

    if (orderError) {
      console.error(orderError);
      showToast("Failed to submit order. Please try again.", "error");
      return;
    }

    const { error: jobError } = await supabase.from('jobs').insert({
      order_id: orderId,
      status: 'proof',
      artwork_json: elements,
      files_ready: true
    });

    if (jobError) {
      console.error(jobError);
      showToast("Failed to submit job. Please try again.", "error");
      return;
    }

    handleSave();
    showToast("Submitted for proof 🎉", "success");
    setTimeout(() => router.push("/dashboard"), 1800);
  };

  const filteredFonts = ALL_FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));

  // ── Style constants ────────────────────────────────────────────────────────
  const S = {
    panel: { background:"#1E1C1A", color:"#D0C8C0" } as React.CSSProperties,
    border: "1px solid #2E2C29",
    input: { background:"#2A2826", borderWidth:1, borderStyle:"solid", borderColor:"#3A3835", borderRadius:6, color:"#D0C8C0", fontSize:12, padding:"7px 9px", width:"100%", boxSizing:"border-box" as const },
    btn: { background:"#2A2826", borderWidth:1, borderStyle:"solid", borderColor:"#3A3835", borderRadius:6, color:"#D0C8C0", fontSize:12, padding:"7px 10px", cursor:"pointer", transition:"all 0.15s" } as React.CSSProperties,
    btnAccent: { background:"#C45D3E", border:"none", borderRadius:6, color:"white", fontSize:12, fontWeight:700, padding:"8px 16px", cursor:"pointer" } as React.CSSProperties,
    label: { fontSize:10, color:"#666", textTransform:"uppercase" as const, letterSpacing:"0.08em", fontWeight:700, marginBottom:5 } as React.CSSProperties,
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-[#1E1C1A] text-[#D0C8C0] font-['Outfit'] overflow-y-auto lg:overflow-hidden">

      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[230px] flex flex-col border-b lg:border-b-0 lg:border-r border-[#2E2C29] shrink-0 max-h-[40vh] lg:max-h-none overflow-hidden">
        {/* Logo */}
        <div style={{ padding:"16px 16px 12px", borderBottom:S.border }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#C45D3E", letterSpacing:"0.1em", textTransform:"uppercase" }}>Digital Heroes</div>
          <div style={{ fontSize:11, color:"#555", marginTop:1 }}>Print Designer</div>
        </div>

        {/* Section tabs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", borderBottom:S.border }}>
          {(["settings","shapes","text","templates","upload","layers"] as Section[]).map(s => (
            <button key={s} onClick={() => setSection(s)}
              title={s.charAt(0).toUpperCase()+s.slice(1)}
              style={{ padding:"10px 0", background:activeSection===s?"#2A2826":"transparent", color:activeSection===s?"#D0C8C0":"#555", border:"none", cursor:"pointer", borderBottom:activeSection===s?"2px solid #C45D3E":"2px solid transparent", fontSize:15 }}>
              {s==="settings"?"⚙":s==="shapes"?"◻":s==="text"?"T":s==="templates"?"▤":s==="upload"?"↑":"☰"}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          {/* SETTINGS */}
          {activeSection==="settings" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={S.label}>Canvas Settings</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div>
                    <div style={{ fontSize:10, color:"#666", marginBottom:4 }}>Width (px)</div>
                    <input type="number" value={printArea.width} min={100} max={3000}
                      onChange={e=>setPrintArea(p=>({...p, width:parseInt(e.target.value)||100}))}
                      style={S.input} />
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:"#666", marginBottom:4 }}>Height (px)</div>
                    <input type="number" value={printArea.height} min={100} max={3000}
                      onChange={e=>setPrintArea(p=>({...p, height:parseInt(e.target.value)||100}))}
                      style={S.input} />
                  </div>
                </div>
                <div style={{ fontSize:11, color:"#555", marginTop:10, lineHeight:1.6 }}>
                  Adjust the print dimensions. Elements outside this area will be clipped.
                </div>
              </div>
            </div>
          )}

          {/* SHAPES */}
          {activeSection==="shapes" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {[
                { label:"Text",     icon:"T",  action:addText, big:true },
                { label:"Rect",     icon:"▭",  action:addRect },
                { label:"Circle",   icon:"●",  action:addCircle },
                { label:"Triangle", icon:"▲",  action:addTri },
                { label:"Star",     icon:"★",  action:addStar },
                { label:"Arrow",    icon:"→",  action:addArrow },
                { label:"Line",     icon:"—",  action:addLine },
                { label:"Image",    icon:"🖼",  action:()=>fileInputRef.current?.click() },
              ].map(b => (
                <button key={b.label} onClick={b.action}
                  style={{ ...S.btn, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"12px 8px",
                    gridColumn: b.big ? "span 2" : undefined }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="#C45D3E")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="#3A3835")}>
                  <span style={{ fontSize:20 }}>{b.icon}</span>
                  <span style={{ fontSize:10, color:"#888" }}>{b.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* TEXT STYLES */}
          {activeSection==="text" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"Heading",    fontSize:40, fontFamily:"Bebas Neue", text:"Add a heading" },
                { label:"Subheading", fontSize:24, fontFamily:"Montserrat", text:"Add a subheading" },
                { label:"Body",       fontSize:16, fontFamily:"Outfit",     text:"Add body text" },
                { label:"Caption",    fontSize:12, fontFamily:"Lato",       text:"Add a caption" },
              ].map(s => (
                <button key={s.label} onClick={() => add({ type:"text", x:printArea.x+60, y:printArea.y+60, text:s.text, fontSize:s.fontSize, fontFamily:s.fontFamily, fill:"#1A1816", opacity:1 })}
                  style={{ ...S.btn, padding:"12px", textAlign:"left" }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="#C45D3E")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="#3A3835")}>
                  <div style={{ fontFamily:s.fontFamily, fontSize:s.fontSize * 0.35 + 10, color:"#D0C8C0", marginBottom:2 }}>{s.label}</div>
                  <div style={{ fontSize:10, color:"#555" }}>{s.fontFamily} · {s.fontSize}px</div>
                </button>
              ))}
            </div>
          )}

          {/* TEMPLATES */}
          {activeSection==="templates" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {TEMPLATES.map(tpl => (
                <button key={tpl.label} onClick={() => loadTemplate(tpl)}
                  style={{ ...S.btn, padding:"16px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="#C45D3E")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="#3A3835")}>
                  <span style={{ fontSize:24 }}>{tpl.icon}</span>
                  <span style={{ fontSize:10, color:"#888", textAlign:"center" }}>{tpl.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* UPLOAD */}
          {activeSection==="upload" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ background:"#C45D3E18", border:"1px dashed #C45D3E", borderRadius:8, padding:"24px 12px", cursor:"pointer", textAlign:"center", color:"#C45D3E", fontSize:12, lineHeight:1.8 }}>
                <div style={{ fontSize:28, marginBottom:6 }}>📁</div>
                Upload Image<br/>
                <span style={{ color:"#555", fontSize:10 }}>PNG · JPG · SVG · WEBP</span>
              </button>
              <button onClick={() => bgFileRef.current?.click()}
                style={{ ...S.btn, padding:"12px", textAlign:"center" }}>
                🖼 Set Background Image
              </button>
              <div style={{ fontSize:11, color:"#555", lineHeight:1.7, marginTop:4 }}>
                💡 300 DPI or higher recommended for print quality.
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImageUpload} />
              <input ref={bgFileRef}   type="file" accept="image/*" style={{ display:"none" }} onChange={handleImageUpload} />
            </div>
          )}

          {/* LAYERS */}
          {activeSection==="layers" && (
            elements.length === 0
              ? <div style={{ textAlign:"center", padding:"40px 12px", color:"#444", fontSize:12 }}>No layers yet.</div>
              : [...elements].reverse().map((el, ri) => {
                  const i = elements.length - 1 - ri;
                  const sel = el.id === selectedId;
                  return (
                    <div key={el.id} onClick={() => setSelectedId(el.id)}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:6, marginBottom:4,
                        background:sel?"#C45D3E18":"#2A2826", border:`1px solid ${sel?"#C45D3E":"transparent"}`, cursor:"pointer" }}>
                      <span style={{ fontSize:14, width:18, textAlign:"center" }}>
                        {el.type==="text"?"T":el.type==="rect"?"▭":el.type==="circle"?"●":el.type==="triangle"?"▲":el.type==="star"?"★":el.type==="arrow"?"→":el.type==="line"?"—":"🖼"}
                      </span>
                      <span style={{ fontSize:11, color:sel?"#D0C8C0":"#888", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {el.type==="text"?(el.text||"Text").slice(0,18):el.type} {i+1}
                      </span>
                    </div>
                  );
                })
          )}
        </div>
      </div>

      {/* ── CENTRE ─────────────────────────────────────────────────────────── */}
      <div className="w-full lg:flex-1 flex flex-col overflow-hidden min-h-[50vh] lg:min-h-0 relative">

        {/* Toolbar */}
        <div style={{ background:"#1A1816", borderBottom:S.border, padding:"9px 16px", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {/* Back button */}
          <button onClick={() => router.push("/dashboard")} style={{ ...S.btn, padding:"6px 12px", marginRight:8, background:"transparent", borderColor:"#333" }}>
            ← Dashboard
          </button>

          {/* Undo/Redo */}
          <button title="Undo (Ctrl+Z)" onClick={undo} disabled={histIdx<=0} style={{ ...S.btn, opacity:histIdx<=0?0.4:1, fontSize:16 }}>↩</button>
          <button title="Redo (Ctrl+Y)" onClick={redo} disabled={histIdx>=history.length-1} style={{ ...S.btn, opacity:histIdx>=history.length-1?0.4:1, fontSize:16 }}>↪</button>

          <div style={{ width:1, height:22, background:"#333", margin:"0 4px" }}/>

          {/* Layer order */}
          <button title="Bring forward" onClick={() => moveLayer("up")} disabled={!selectedId} style={{ ...S.btn, opacity:selectedId?1:0.4 }}>▲</button>
          <button title="Send back"     onClick={() => moveLayer("down")} disabled={!selectedId} style={{ ...S.btn, opacity:selectedId?1:0.4 }}>▼</button>
          <button title="Duplicate (Ctrl+D)" onClick={duplicateSelected} disabled={!selectedId} style={{ ...S.btn, opacity:selectedId?1:0.4 }}>⧉</button>
          <button title="Flip Horizontal" onClick={flipH} disabled={!selectedId} style={{ ...S.btn, opacity:selectedId?1:0.4 }}>⇔</button>
          <button title="Flip Vertical"   onClick={flipV} disabled={!selectedId} style={{ ...S.btn, opacity:selectedId?1:0.4 }}>⇕</button>
          <button title="Delete (Del)" onClick={deleteSelected} disabled={!selectedId}
            style={{ ...S.btn, opacity:selectedId?1:0.4, background:selectedId?"#C44A4A18":"", borderColor:selectedId?"#C44A4A55":"#3A3835", color:selectedId?"#C44A4A":"#555" }}>✕</button>

          <div style={{ flex:1 }}/>

          {/* Zoom */}
          <button onClick={() => setZoom(z=>Math.max(0.25,+(z-0.1).toFixed(1)))} style={{ ...S.btn, padding:"5px 10px" }}>−</button>
          <span style={{ fontSize:12, color:"#888", minWidth:42, textAlign:"center" }}>{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z=>Math.min(2.0,+(z+0.1).toFixed(1)))} style={{ ...S.btn, padding:"5px 10px" }}>+</button>
          <button onClick={() => setZoom(0.85)} style={{ ...S.btn, padding:"5px 10px", fontSize:11 }}>Fit</button>

          <div style={{ width:1, height:22, background:"#333", margin:"0 4px" }}/>

          <button onClick={handleSave} style={{ ...S.btn }}>💾 Save</button>
          <button onClick={handleDownload} style={{ ...S.btn }}>⬇️ Download</button>
          <button onClick={submitForProof} style={{ ...S.btnAccent }}>Submit for Proof →</button>
        </div>

        {/* Canvas viewport */}
        <div style={{ flex:1, overflow:"auto", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 16px", background:"#161412" }}>
          <DesignerCanvas
            printArea={printArea}
            elements={elements}
            selectedId={selectedId}
            stageRef={stageRef}
            zoom={zoom}
            onSelect={setSelectedId}
            onUpdateElement={commitUpdateEl}
          />
        </div>
      </div>

      {/* ── RIGHT PROPERTIES PANEL ─────────────────────────────────────────── */}
      <div className="w-full lg:w-[256px] flex flex-col border-t lg:border-t-0 lg:border-l border-[#2E2C29] shrink-0 max-h-[50vh] lg:max-h-none overflow-hidden">
        <div style={{ padding:"13px 16px", borderBottom:S.border, fontSize:11, fontWeight:700, color:"#D0C8C0", textTransform:"uppercase", letterSpacing:"0.1em" }}>
          Properties
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          {!selectedEl ? (
            <div style={{ textAlign:"center", padding:"40px 12px", color:"#444", fontSize:12, lineHeight:1.8 }}>
              Click an element<br/>to edit its properties.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ padding:"5px 10px", borderRadius:5, background:"#2A2826", fontSize:11, color:"#C45D3E", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{selectedEl.type}</div>

              {/* ── TEXT PROPERTIES ────────── */}
              {selectedEl.type === "text" && (<>
                <Prop label="Text Content">
                  <textarea id="text-edit-box" value={selectedEl.text||""} onChange={e=>updateEl(selectedEl.id,{text:e.target.value})} rows={3}
                    style={{ ...S.input, resize:"vertical", fontFamily:"inherit" }}
                    placeholder="Type your text here..." />
                </Prop>

                <Prop label="Font Family">
                  <input placeholder="Search fonts…" value={fontSearch} onChange={e=>setFontSearch(e.target.value)}
                    style={{ ...S.input, marginBottom:4 }} />
                  <select value={selectedEl.fontFamily||"Outfit"} onChange={e=>updateEl(selectedEl.id,{fontFamily:e.target.value})} size={5}
                    style={{ ...S.input, padding:0, fontFamily:"inherit" }}>
                    {filteredFonts.map(f=>(
                      <option key={f} value={f} style={{ fontFamily:f, padding:"6px 8px" }}>{f}</option>
                    ))}
                  </select>
                </Prop>

                <Prop label={`Font Size: ${selectedEl.fontSize||24}px`}>
                  <input type="range" min={8} max={200} value={selectedEl.fontSize||24}
                    onChange={e=>updateEl(selectedEl.id,{fontSize:parseInt(e.target.value)})}
                    style={{ width:"100%", accentColor:"#C45D3E" }} />
                </Prop>

                <Prop label="Style">
                  <div style={{ display:"flex", gap:4 }}>
                    {(["normal","bold","italic","bold italic"] as const).map(s=>(
                      <button key={s} onClick={()=>updateEl(selectedEl.id,{fontStyle:s})}
                        style={{ flex:1, padding:"5px 2px", borderRadius:5, border:`1px solid ${selectedEl.fontStyle===s?"#C45D3E":"#3A3835"}`,
                          background:selectedEl.fontStyle===s?"#C45D3E18":"#2A2826", color:selectedEl.fontStyle===s?"#C45D3E":"#888", fontSize:10, cursor:"pointer" }}>
                        {s==="bold italic"?"B+I":s==="bold"?"B":s==="italic"?"I":"N"}
                      </button>
                    ))}
                  </div>
                </Prop>

                <Prop label="Align">
                  <div style={{ display:"flex", gap:4 }}>
                    {(["left","center","right"] as const).map(a=>(
                      <button key={a} onClick={()=>updateEl(selectedEl.id,{align:a})}
                        style={{ flex:1, padding:"6px", borderRadius:5, border:`1px solid ${selectedEl.align===a?"#C45D3E":"#3A3835"}`,
                          background:selectedEl.align===a?"#C45D3E18":"#2A2826", color:selectedEl.align===a?"#C45D3E":"#888", fontSize:13, cursor:"pointer" }}>
                        {a==="left"?"≡":a==="center"?"☰":"≡"}
                      </button>
                    ))}
                  </div>
                </Prop>

                <Prop label={`Letter Spacing: ${selectedEl.letterSpacing||0}`}>
                  <input type="range" min={-5} max={30} value={selectedEl.letterSpacing||0}
                    onChange={e=>updateEl(selectedEl.id,{letterSpacing:parseInt(e.target.value)})}
                    style={{ width:"100%", accentColor:"#C45D3E" }} />
                </Prop>

                <Prop label={`Line Height: ${(selectedEl.lineHeight||1.2).toFixed(1)}`}>
                  <input type="range" min={0.8} max={3} step={0.1} value={selectedEl.lineHeight||1.2}
                    onChange={e=>updateEl(selectedEl.id,{lineHeight:parseFloat(e.target.value)})}
                    style={{ width:"100%", accentColor:"#C45D3E" }} />
                </Prop>

                <Prop label="Text Decoration">
                  <div style={{ display:"flex", gap:4 }}>
                    {(["","underline","line-through"] as const).map(d=>(
                      <button key={d||"none"} onClick={()=>updateEl(selectedEl.id,{textDecoration:d})}
                        style={{ flex:1, padding:"5px 2px", borderRadius:5, border:`1px solid ${(selectedEl.textDecoration||"")===d?"#C45D3E":"#3A3835"}`,
                          background:(selectedEl.textDecoration||"")===d?"#C45D3E18":"#2A2826", color:(selectedEl.textDecoration||"")===d?"#C45D3E":"#888", fontSize:10, cursor:"pointer" }}>
                        {d===""?"None":d==="underline"?"U̲":"S̶"}
                      </button>
                    ))}
                  </div>
                </Prop>

                <Prop label="Text Stroke">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:6 }}>
                    <input type="color" value={selectedEl.stroke||"#000000"}
                      onChange={e=>updateEl(selectedEl.id,{stroke:e.target.value})}
                      style={{ ...S.input, padding:2, height:34 }} />
                    <input type="number" min={0} max={10} value={selectedEl.strokeWidth||0}
                      onChange={e=>updateEl(selectedEl.id,{strokeWidth:parseFloat(e.target.value)})}
                      style={{ ...S.input }} />
                  </div>
                </Prop>
              </>)}

              {/* ── SHAPE/IMAGE: Size ────────── */}
              {(selectedEl.type==="rect" || selectedEl.type==="image") && (
                <Prop label="Size">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <div>
                      <div style={S.label}>Width</div>
                      <input type="number" min={10} max={2000}
                        defaultValue={Math.round(selectedEl.width||100)}
                        key={`w-${selectedEl.id}-${Math.round(selectedEl.width||100)}`}
                        onBlur={e=>{ const v=parseInt(e.target.value); if(!isNaN(v)&&v>=10) updateEl(selectedEl.id,{width:v}); }}
                        style={{ ...S.input }} />
                    </div>
                    <div>
                      <div style={S.label}>Height</div>
                      <input type="number" min={10} max={2000}
                        defaultValue={Math.round(selectedEl.height||100)}
                        key={`h-${selectedEl.id}-${Math.round(selectedEl.height||100)}`}
                        onBlur={e=>{ const v=parseInt(e.target.value); if(!isNaN(v)&&v>=10) updateEl(selectedEl.id,{height:v}); }}
                        style={{ ...S.input }} />
                    </div>
                  </div>
                </Prop>
              )}

              {/* ── SHAPE: radius ────────── */}
              {(selectedEl.type==="circle"||selectedEl.type==="triangle") && (
                <Prop label={`Radius: ${selectedEl.radius||50}px`}>
                  <input type="range" min={10} max={200} value={selectedEl.radius||50}
                    onChange={e=>updateEl(selectedEl.id,{radius:parseInt(e.target.value)})}
                    style={{ width:"100%", accentColor:"#C45D3E" }} />
                </Prop>
              )}

              {/* ── SHAPE: star ────────── */}
              {selectedEl.type==="star" && (<>
                <Prop label={`Points: ${selectedEl.numPoints||5}`}>
                  <input type="range" min={3} max={12} value={selectedEl.numPoints||5}
                    onChange={e=>updateEl(selectedEl.id,{numPoints:parseInt(e.target.value)})}
                    style={{ width:"100%", accentColor:"#C45D3E" }} />
                </Prop>
                <Prop label={`Outer Radius: ${selectedEl.outerRadius||60}`}>
                  <input type="range" min={20} max={200} value={selectedEl.outerRadius||60}
                    onChange={e=>updateEl(selectedEl.id,{outerRadius:parseInt(e.target.value)})}
                    style={{ width:"100%", accentColor:"#C45D3E" }} />
                </Prop>
              </>)}

              {/* ── FILL COLOR ────────────── */}
              {selectedEl.type !== "image" && selectedEl.type !== "arrow" && selectedEl.type !== "line" && (
                <Prop label="Fill Color">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:7 }}>
                    {PALETTE.map(c=>(
                      <div key={c} onClick={()=>updateEl(selectedEl.id,{fill:c})}
                        style={{ width:22, height:22, borderRadius:4, background:c, border:`2px solid ${selectedEl.fill===c?"#C45D3E":"#333"}`, cursor:"pointer" }} />
                    ))}
                  </div>
                  <input type="color" value={selectedEl.fill||"#000000"}
                    onChange={e=>updateEl(selectedEl.id,{fill:e.target.value})}
                    style={{ ...S.input, padding:2, height:34 }} />
                </Prop>
              )}

              {/* ── STROKE ────────────── */}
              {selectedEl.type !== "text" && (
                <Prop label="Stroke">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:6 }}>
                    <input type="color" value={selectedEl.stroke||"#000000"}
                      onChange={e=>updateEl(selectedEl.id,{stroke:e.target.value})}
                      style={{ ...S.input, padding:2, height:34 }} />
                    <input type="number" min={0} max={20} value={selectedEl.strokeWidth||0}
                      onChange={e=>updateEl(selectedEl.id,{strokeWidth:parseFloat(e.target.value)})}
                      style={{ ...S.input }} />
                  </div>
                </Prop>
              )}

              {/* ── OPACITY ────────────── */}
              <Prop label={`Opacity: ${Math.round((selectedEl.opacity??1)*100)}%`}>
                <input type="range" min={5} max={100} value={Math.round((selectedEl.opacity??1)*100)}
                  onChange={e=>updateEl(selectedEl.id,{opacity:parseInt(e.target.value)/100})}
                  style={{ width:"100%", accentColor:"#C45D3E" }} />
              </Prop>

              {/* ── SHADOW ────────────── */}
              <Prop label="Shadow">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div>
                    <div style={S.label}>Blur</div>
                    <input type="number" min={0} max={50} value={selectedEl.shadowBlur||0}
                      onChange={e=>updateEl(selectedEl.id,{shadowBlur:parseInt(e.target.value)||0})}
                      style={{ ...S.input }} />
                  </div>
                  <div>
                    <div style={S.label}>Color</div>
                    <input type="color" value={selectedEl.shadowColor||"#000000"}
                      onChange={e=>updateEl(selectedEl.id,{shadowColor:e.target.value})}
                      style={{ ...S.input, padding:2, height:32 }} />
                  </div>
                  <div>
                    <div style={S.label}>Offset X</div>
                    <input type="number" min={-30} max={30} value={selectedEl.shadowOffsetX||0}
                      onChange={e=>updateEl(selectedEl.id,{shadowOffsetX:parseInt(e.target.value)||0})}
                      style={{ ...S.input }} />
                  </div>
                  <div>
                    <div style={S.label}>Offset Y</div>
                    <input type="number" min={-30} max={30} value={selectedEl.shadowOffsetY||0}
                      onChange={e=>updateEl(selectedEl.id,{shadowOffsetY:parseInt(e.target.value)||0})}
                      style={{ ...S.input }} />
                  </div>
                </div>
              </Prop>

              {/* ── POSITION ────────────── */}
              <Prop label="Position">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div>
                    <div style={S.label}>X</div>
                    <input type="number"
                      defaultValue={Math.round(selectedEl.x)}
                      key={`x-${selectedEl.id}-${Math.round(selectedEl.x)}`}
                      onBlur={e=>{ const v=parseInt(e.target.value); if(!isNaN(v)) updateEl(selectedEl.id,{x:v}); }}
                      style={{ ...S.input }} />
                  </div>
                  <div>
                    <div style={S.label}>Y</div>
                    <input type="number"
                      defaultValue={Math.round(selectedEl.y)}
                      key={`y-${selectedEl.id}-${Math.round(selectedEl.y)}`}
                      onBlur={e=>{ const v=parseInt(e.target.value); if(!isNaN(v)) updateEl(selectedEl.id,{y:v}); }}
                      style={{ ...S.input }} />
                  </div>
                </div>
              </Prop>

              {/* ── ROTATION ────────────── */}
              <Prop label={`Rotation: ${Math.round(selectedEl.rotation||0)}°`}>
                <input type="range" min={-180} max={180} value={selectedEl.rotation||0}
                  onChange={e=>updateEl(selectedEl.id,{rotation:parseInt(e.target.value)})}
                  style={{ width:"100%", accentColor:"#C45D3E" }} />
              </Prop>

              {/* ── ACTIONS ────────────── */}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={duplicateSelected} style={{ ...S.btn, flex:1, textAlign:"center" }}>⧉ Duplicate</button>
                <button onClick={deleteSelected} style={{ ...S.btn, flex:1, textAlign:"center", background:"#C44A4A18", borderColor:"#C44A4A55", color:"#C44A4A" }}>✕ Delete</button>
              </div>
            </div>
          )}
        </div>

        {/* Shortcuts hint */}
        <div style={{ padding:"10px 12px", borderTop:S.border, fontSize:10, color:"#444", lineHeight:1.9 }}>
          <b style={{ color:"#666" }}>Shortcuts</b><br/>
          Ctrl+Z Undo · Ctrl+Y Redo<br/>
          Ctrl+D Duplicate · Del Delete<br/>
          + / − Zoom · Esc Deselect
        </div>
      </div>
    </div>
  );
}

function Prop({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}
