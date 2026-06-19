import { useState, useEffect } from "react";

/* ─── data ─────────────────────────────────────────────── */
const INITIAL_EVENTS = [
  { id:0,  date:"9 Ago",    name:"Concerto Juventude 3 — Bach",                        mandatory:false, cordas:6    },
  { id:1,  date:"22 Ago",   name:"Folga Obrigatória — Semana Metais",                  mandatory:true,  cordas:null },
  { id:2,  date:"11 Set",   name:"Concerto Juventude 4",                               mandatory:false, cordas:6    },
  { id:3,  date:"23 Set",   name:"Tributo a John Williams",                            mandatory:false, cordas:10   },
  { id:4,  date:"3 Out",    name:"Festival Brahms-Schumann 1.1",                       mandatory:false, cordas:9    },
  { id:5,  date:"9 Out",    name:"Concerto Juventude 5 / VALE",                        mandatory:false, cordas:6    },
  { id:6,  date:"17 Out",   name:"Festival Brahms-Schumann 1.2",                       mandatory:false, cordas:9    },
  { id:7,  date:"24 Out",   name:"Folga Obrigatória — 20 a 25/Out",                   mandatory:true,  cordas:null },
  { id:8,  date:"31 Out",   name:"Festival Brahms-Schumann 1.3",                       mandatory:false, cordas:9    },
  { id:12, date:"8 Nov",    name:"Os Pequenos Chiquinha Gonzaga e Carlos Gomes",       mandatory:false, cordas:6    },
  { id:9,  date:"19 Nov",   name:"Aquarius / Concerto Juventude 6",                    mandatory:false, cordas:8    },
  { id:10, date:"28 Nov",   name:"Série Mundo: Alemanha",                              mandatory:false, cordas:null },
  { id:13, date:"4 Dez",    name:"Concerto John Williams (CDA)",                       mandatory:false, cordas:10   },
  { id:11, date:"19 Dez",   name:"Strauss — Marcelo Lehninger",                        mandatory:false, cordas:null },
];

const MUSICIANS = [
  { id:1, name:"Mateus",   abbr:"Mt", role:"Chefe",      total:9, taken:2 },
  { id:2, name:"Lucas",    abbr:"Lu", role:"Concertino", total:7, taken:2 },
  { id:3, name:"André",    abbr:"An", role:"Tutti",      total:6, taken:3 },
  { id:4, name:"Angélica", abbr:"Ag", role:"Tutti",      total:6, taken:2 },
  { id:5, name:"Cleber",   abbr:"Cl", role:"Tutti",      total:6, taken:3 },
  { id:6, name:"Desiree",  abbr:"De", role:"Tutti",      total:6, taken:3 },
  { id:7, name:"Nikolay",  abbr:"Nk", role:"Tutti",      total:6, taken:3 },
  { id:8, name:"Sérgio",   abbr:"Sr", role:"Tutti",      total:6, taken:4 },
  { id:9, name:"Daniel",   abbr:"Dn", role:"Tutti",      total:6, taken:3 },
];

const MAN = 2; // mandatory leaves absorbed

/* ─── palette ──────────────────────────────────────────── */
const BG    = "#08090B";
const SURF  = "#0F1117";
const LINE  = "#16191F";
const MUTED = "#2E3440";
const DIM   = "#4A5568";
const TEXT  = "#EEF0F4";
const GOLD  = "#C9A84C";
const RED   = "#D94040";
const GREEN = "#3A9E5F";
const ROLE_C = { Chefe:"#C9A84C", Concertino:"#8BAAC8", Tutti: TEXT };

/* ─── sub-components ────────────────────────────────────── */

/** Thin progress bar (2 px, full width) */
const ThinBar = ({ pct, done }) => (
  <div style={{ height:2, background:LINE, borderRadius:99, overflow:"hidden", width:"100%" }}>
    <div style={{
      height:"100%", width:`${pct}%`, borderRadius:99,
      background: done ? GREEN : GOLD,
      transition:"width .5s ease",
    }}/>
  </div>
);

/** SVG circular progress ring */
const Ring = ({ pct, rem, done }) => {
  const sz=64, sw=3, r=(sz-sw*2)/2, circ=2*Math.PI*r, fill=(pct/100)*circ;
  return (
    <div style={{ position:"relative", width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:"rotate(-90deg)", display:"block" }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={LINE} strokeWidth={sw}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none"
          stroke={done ? GREEN : GOLD} strokeWidth={sw}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray .5s ease, stroke .4s" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex",
                    alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize: done?18:22, fontWeight:700, lineHeight:1,
                       color: done ? GREEN : TEXT }}>
          {done ? "✓" : rem}
        </span>
      </div>
    </div>
  );
};

/* ─── persistence helpers (localStorage) ──────────────────── */
const STORAGE_KEY = "osb-cordas-escala-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* ─── main ──────────────────────────────────────────────── */
export default function App() {
  const saved = loadState();

  const [events,    setEvents]    = useState(saved?.events    ?? INITIAL_EVENTS);
  const [schedule,  setSchedule]  = useState(saved?.schedule  ?? {});
  const [otherOrch, setOtherOrch] = useState(saved?.otherOrch ?? {});
  const [requests,  setRequests]  = useState(saved?.requests  ?? []);
  const [nextEvtId, setNextEvtId] = useState(saved?.nextEvtId ?? 100);
  const [musicians, setMusicians] = useState(saved?.musicians ?? MUSICIANS);
  const [nextMusId, setNextMusId] = useState(saved?.nextMusId ?? 100);

  const [reqMus, setReqMus] = useState("");
  const [reqEvt, setReqEvt] = useState("");
  const [tab,    setTab]    = useState("grade");
  const [toast,  setToast]  = useState(null);

  // ── event editor state ──
  const [editingId,   setEditingId]   = useState(null); // null = not editing, "new" = adding
  const [formDate,    setFormDate]    = useState("");
  const [formName,    setFormName]    = useState("");
  const [formMand,    setFormMand]    = useState(false);
  const [formCordas,  setFormCordas]  = useState("");

  // ── musician editor state ──
  const [editingMusId,  setEditingMusId]  = useState(null);
  const [formMusName,   setFormMusName]   = useState("");
  const [formMusRole,   setFormMusRole]   = useState("");
  const [formMusTotal,  setFormMusTotal]  = useState(6);
  const [formMusTaken,  setFormMusTaken]  = useState(0);

  // ── timeline expand state ──
  const [expandedEvt, setExpandedEvt] = useState(null);

  // persist whenever core data changes
  useEffect(() => {
    saveState({ events, schedule, otherOrch, requests, nextEvtId, musicians, nextMusId });
  }, [events, schedule, otherOrch, requests, nextEvtId, musicians, nextMusId]);

  /* helpers */
  const flash = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(()=>setToast(null), 2800);
  };

  const gridLeaves = id =>
    Object.values(schedule[id]||{}).filter(v=>v==="leave").length;

  const rem  = m => m.total - m.taken - MAN - gridLeaves(m.id);
  const pct  = m => Math.min(((m.taken + MAN + gridLeaves(m.id)) / m.total) * 100, 100);
  const done = m => rem(m) <= 0;

  const toggle = (mId, eId) => {
    const ev = events.find(e=>e.id===eId);
    if (ev?.mandatory) return;
    const m  = musicians.find(x=>x.id===mId);
    const on = schedule[mId]?.[eId]==="leave";
    if (!on && rem(m)<=0) { flash(`${m.name}: quota atingida.`, "warn"); return; }
    if (!on && ev.cordas != null) {
      const currentAbsences = musicians.filter(x=>schedule[x.id]?.[eId]==="leave").length;
      const presentAfter = musicians.length - (currentAbsences + 1);
      if (presentAfter < ev.cordas) {
        flash(
          `Bloqueado: este evento precisa de pelo menos ${ev.cordas} músicos presentes. ` +
          `Marcar essa folga deixaria apenas ${presentAfter}.`,
          "warn"
        );
        return;
      }
    }
    setSchedule(p=>({ ...p, [mId]:{ ...(p[mId]||{}), [eId]: on?null:"leave" } }));
  };

  const addReq = () => {
    if (!reqMus||reqEvt==="") return;
    const ev = events.find(e=>e.id===+reqEvt);
    if (ev?.mandatory) { flash("Evento é folga obrigatória.", "warn"); return; }
    if (requests.find(r=>r.mId===+reqMus&&r.eIdx===+reqEvt)) { flash("Pedido já na fila.", "warn"); return; }
    setRequests(p=>[...p, {
      id:Date.now(), mId:+reqMus, eIdx:+reqEvt,
      time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
    }]);
    setReqMus(""); setReqEvt(""); flash("Pedido registrado.");
  };

  const approve = rId => {
    const r = requests.find(x=>x.id===rId);
    const m = musicians.find(x=>x.id===r.mId);
    if (otherOrch[r.mId]) { flash(`${m.name}: confirme a outra orq. antes.`, "warn"); return; }
    if (rem(m)<=0) { flash(`${m.name} sem folgas restantes.`, "warn"); return; }
    setSchedule(p=>({ ...p, [r.mId]:{ ...(p[r.mId]||{}), [r.eIdx]:"leave" } }));
    setRequests(p=>p.filter(x=>x.id!==rId));
    flash(`Folga de ${m.name} aprovada.`);
  };

  const deny = rId => setRequests(p=>p.filter(x=>x.id!==rId));

  /* ── manual event editor ── */
  const openNewEvent = () => {
    setEditingId("new"); setFormDate(""); setFormName(""); setFormMand(false); setFormCordas("");
  };

  const openEditEvent = ev => {
    setEditingId(ev.id); setFormDate(ev.date); setFormName(ev.name); setFormMand(ev.mandatory);
    setFormCordas(ev.cordas != null ? String(ev.cordas) : "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEvent = () => {
    if (!formDate.trim() || !formName.trim()) { flash("Preencha data e nome.", "warn"); return; }
    const cordas = (!formMand && formCordas.trim() !== "") ? Number(formCordas) : null;
    if (editingId === "new") {
      setEvents(p => [...p, { id: nextEvtId, date: formDate.trim(), name: formName.trim(), mandatory: formMand, cordas }]);
      setNextEvtId(n => n + 1);
      flash("Evento adicionado.");
    } else {
      setEvents(p => p.map(e => e.id === editingId
        ? { ...e, date: formDate.trim(), name: formName.trim(), mandatory: formMand, cordas }
        : e));
      flash("Evento atualizado.");
    }
    setEditingId(null);
  };

  const deleteEvent = eId => {
    if (!window.confirm("Excluir este evento? As folgas marcadas nele serão removidas.")) return;
    setEvents(p => p.filter(e => e.id !== eId));
    setSchedule(p => {
      const next = {};
      for (const mId in p) {
        const { [eId]: _, ...rest } = p[mId];
        next[mId] = rest;
      }
      return next;
    });
    setRequests(p => p.filter(r => r.eIdx !== eId));
    if (editingId === eId) setEditingId(null);
    flash("Evento excluído.");
  };

  const moveEvent = (eId, dir) => {
    setEvents(p => {
      const idx = p.findIndex(e => e.id === eId);
      if (idx < 0) return p;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= p.length) return p;
      const next = [...p];
      const tmp = next[idx]; next[idx] = next[newIdx]; next[newIdx] = tmp;
      return next;
    });
  };

  /* ── musician editor ── */
  const openNewMusician = () => {
    setEditingMusId("new"); setFormMusName(""); setFormMusRole(""); setFormMusTotal(6); setFormMusTaken(0);
  };

  const openEditMusician = m => {
    setEditingMusId(m.id); setFormMusName(m.name); setFormMusRole(m.role);
    setFormMusTotal(m.total); setFormMusTaken(m.taken);
  };

  const cancelEditMusician = () => setEditingMusId(null);

  const saveMusician = () => {
    if (!formMusName.trim() || !formMusRole.trim()) { flash("Preencha nome e cargo.", "warn"); return; }
    const abbr = formMusName.trim().slice(0,2);
    if (editingMusId === "new") {
      setMusicians(p => [...p, {
        id: nextMusId, name: formMusName.trim(), abbr,
        role: formMusRole.trim(), total: +formMusTotal, taken: +formMusTaken,
      }]);
      setNextMusId(n => n + 1);
      flash("Músico adicionado.");
    } else {
      setMusicians(p => p.map(m => m.id === editingMusId
        ? { ...m, name: formMusName.trim(), abbr: formMusName.trim().slice(0,2),
            role: formMusRole.trim(), total: +formMusTotal, taken: +formMusTaken }
        : m));
      flash("Músico atualizado.");
    }
    setEditingMusId(null);
  };

  const deleteMusician = mId => {
    const m = musicians.find(x => x.id === mId);
    if (!window.confirm(`Excluir ${m.name}? Folgas marcadas e pedidos pendentes serão removidos.`)) return;
    setMusicians(p => p.filter(x => x.id !== mId));
    setSchedule(p => { const next = { ...p }; delete next[mId]; return next; });
    setOtherOrch(p => { const next = { ...p }; delete next[mId]; return next; });
    setRequests(p => p.filter(r => r.mId !== mId));
    if (editingMusId === mId) setEditingMusId(null);
    flash("Músico excluído.");
  };

  /* derived */
  const totalRem = musicians.reduce((a,m)=>a+Math.max(rem(m),0),0);

  const SEL = { background:SURF, border:`1px solid ${LINE}`, borderRadius:12, color:TEXT,
                padding:"13px 14px", fontSize:14, outline:"none", width:"100%" };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <div className="app-root"
         style={{ background:BG, color:TEXT, display:"flex",
                  flexDirection:"column", overflow:"hidden",
                  fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  maxWidth:430, margin:"0 auto" }}>

      {/* toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:72, left:"50%", transform:"translateX(-50%)",
                      background: toast.type==="warn" ? "#2A1500" : "#0D2A1A",
                      border:`1px solid ${toast.type==="warn"?GOLD:GREEN}`,
                      color:TEXT, padding:"10px 20px", borderRadius:20, fontSize:13,
                      zIndex:99, whiteSpace:"nowrap", boxShadow:"0 8px 32px #0009" }}>
          {toast.msg}
        </div>
      )}

      {/* header */}
      <div style={{ padding:"16px 20px 14px", display:"flex",
                    alignItems:"flex-start", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:3, color:GOLD, marginBottom:5 }}>OSB • 2º Violino</div>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:-0.5 }}>Mateus Vieira Rocha</div>
        </div>
        <div style={{ textAlign:"right", paddingTop:4 }}>
          <div style={{ fontSize:34, fontWeight:800, color:GOLD, lineHeight:1 }}>{totalRem}</div>
          <div style={{ fontSize:10, color:DIM, marginTop:2 }}>folgas restantes</div>
        </div>
      </div>

      {/* divider */}
      <div style={{ height:1, background:LINE, flexShrink:0 }}/>

      {/* content */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* ══ GRADE — linha do tempo vertical ══ */}
        {tab==="grade" && (
          <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
            {events.map((ev, i) => {
              const absCount = ev.mandatory ? 0
                : musicians.filter(m=>schedule[m.id]?.[ev.id]==="leave").length;
              const isOpen = expandedEvt === ev.id;
              const labelColor = ev.mandatory ? GOLD : "#8BAAC8";
              const dotColor = ev.mandatory ? GOLD
                : absCount>=4 ? RED
                : absCount>=2 ? "#E08A2E"
                : absCount>=1 ? GOLD
                :               MUTED;
              const filled = ev.mandatory || absCount>0;
              const isLast = i === events.length-1;
              // true when adding one more absence would drop below ev.cordas
              const coverageReached = !ev.mandatory && ev.cordas != null
                && (musicians.length - absCount) <= ev.cordas;

              return (
                <div key={ev.id} style={{ display:"flex", gap:14 }}>

                  {/* dot + connecting line */}
                  <div style={{ position:"relative", width:14, flexShrink:0,
                                display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", flexShrink:0,
                                  background: filled?dotColor:SURF,
                                  border:`2px solid ${dotColor}`, marginTop:2 }}/>
                    {!isLast && (
                      <div style={{ width:1.5, flex:1, background:LINE, marginTop:4 }}/>
                    )}
                  </div>

                  {/* event content */}
                  <div style={{ flex:1, minWidth:0, paddingBottom: isLast?0:24 }}>

                    {/* collapsed row — tap to expand */}
                    <button
                      onClick={() => !ev.mandatory && setExpandedEvt(isOpen ? null : ev.id)}
                      style={{
                        width:"100%", textAlign:"left", border:"none",
                        cursor: ev.mandatory?"default":"pointer",
                        background: isOpen ? SURF : "transparent",
                        borderRadius: isOpen ? "12px 12px 0 0" : 12,
                        padding: isOpen ? "10px 12px" : "0",
                        transition:"background .15s",
                      }}>
                      <div style={{ fontSize:10, color:labelColor, fontWeight:700,
                                    letterSpacing:0.3, marginBottom:2,
                                    display:"flex", alignItems:"center", gap:6 }}>
                        {ev.date.toUpperCase()}
                        {ev.mandatory && <span>🔒</span>}
                        {!ev.mandatory && absCount>0 &&
                          <span style={{ color: absCount>=4?RED:absCount>=2?"#E08A2E":GOLD }}>
                            · {absCount} ausente{absCount>1?"s":""}
                          </span>}
                        {coverageReached &&
                          <span style={{ color:GOLD }}>· efetivo mínimo atingido</span>}
                      </div>
                      <div style={{ fontSize:14, fontWeight:600, lineHeight:1.3,
                                    color: ev.mandatory?GOLD:TEXT }}>
                        {ev.name}
                      </div>
                      {!ev.mandatory && (
                        <div style={{ fontSize:10, color:DIM, marginTop:3 }}>
                          {ev.cordas != null
                            ? `Efetivo de cordas: ${ev.cordas}`
                            : "Efetivo de cordas: a confirmar"}
                        </div>
                      )}
                    </button>

                    {/* expanded panel — musicians list with toggle */}
                    {isOpen && (
                      <div style={{ background:SURF, borderRadius:"0 0 12px 12px",
                                    padding:"4px 12px 12px" }}>
                        {musicians.map(m => {
                          const on  = schedule[m.id]?.[ev.id]==="leave";
                          const can = rem(m)>0 || on;
                          const blockedByCoverage = !on && coverageReached;
                          const isDisabled = (!can && !on) || blockedByCoverage;
                          return (
                            <div key={m.id}
                              style={{ display:"flex", alignItems:"center",
                                       justifyContent:"space-between",
                                       padding:"9px 0",
                                       borderTop:`1px solid ${LINE}` }}>
                              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                                <span style={{ fontSize:13.5, fontWeight:500,
                                              color: isDisabled ? MUTED : TEXT }}>
                                  {m.name}
                                </span>
                                <span style={{ fontSize:10.5, color:DIM }}>{m.role}</span>
                                {!can && !on &&
                                  <span style={{ fontSize:10, color:GREEN }}>· completo</span>}
                                {blockedByCoverage &&
                                  <span style={{ fontSize:10, color:GOLD }}>· efetivo min.</span>}
                              </div>
                              <button
                                onClick={() => toggle(m.id, ev.id)}
                                disabled={isDisabled}
                                aria-label={
                                  blockedByCoverage
                                    ? "Efetivo mínimo de cordas atingido para este evento"
                                    : `Folga de ${m.name}`
                                }
                                style={{
                                  width:36, height:21, borderRadius:11, border:"none",
                                  background: on ? RED : LINE,
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                  position:"relative", flexShrink:0,
                                  transition:"background .2s",
                                }}>
                                <div style={{
                                  width:17, height:17, borderRadius:"50%",
                                  background: on ? "#fff" : DIM,
                                  position:"absolute", top:2,
                                  left: on ? 17 : 2,
                                  transition:"left .2s, background .2s",
                                }}/>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ height:6 }}/>
          </div>
        )}

        {/* ══ MÚSICOS ══ */}
        {tab==="musicos" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 0" }}>
              <div style={{ fontSize:10, letterSpacing:2, color:MUTED, marginBottom:12 }}>
                {musicians.length} MÚSICO{musicians.length!==1?"S":""}
              </div>

              {musicians.map(m => {
                const r    = Math.max(rem(m),0);
                const dn   = done(m);
                const p    = pct(m);
                const used = m.taken + MAN + gridLeaves(m.id);
                const hasO = otherOrch[m.id];
                return (
                  <div key={m.id} style={{ padding:"20px 0 16px",
                                            borderBottom:`1px solid ${LINE}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                      {/* left: info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"baseline",
                                      gap:8, marginBottom:10 }}>
                          <span style={{ fontSize:19, fontWeight:700,
                                         color:ROLE_C[m.role]||TEXT }}>
                            {m.name}
                          </span>
                          <span style={{ fontSize:12, color:DIM }}>{m.role}</span>
                          {hasO && <span style={{ fontSize:12 }}>🎻</span>}
                        </div>
                        <ThinBar pct={p} done={dn}/>
                        <div style={{ fontSize:11, color:DIM, marginTop:6 }}>
                          {used} de {m.total} folgas usadas
                        </div>
                        <div style={{ fontSize:10, color:DIM, marginTop:3, lineHeight:1.5 }}>
                          {m.taken} tiradas antes · {MAN} obrigatórias do calendário · {gridLeaves(m.id)} agendadas agora
                        </div>
                      </div>
                      {/* right: ring */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flexShrink:0 }}>
                        <Ring pct={p} rem={r} done={dn}/>
                        <span style={{ fontSize:9, color:DIM, letterSpacing:0.2 }}>
                          {dn ? "completo" : "restantes"}
                        </span>
                      </div>
                    </div>

                    {/* action row */}
                    <div style={{ display:"flex", gap:6, marginTop:14 }}>
                      <button onClick={()=>setOtherOrch(p=>({...p,[m.id]:!p[m.id]}))}
                        style={{ flex:1, padding:"10px",
                                 borderRadius:10, border:`1px solid ${hasO?GOLD:LINE}`,
                                 background:hasO?"#1E1500":SURF,
                                 color:hasO?GOLD:DIM, cursor:"pointer", fontSize:12 }}>
                        🎻 {hasO?"Outra orquestra — manual":"Marcar outra orquestra"}
                      </button>
                      <button onClick={()=>openEditMusician(m)}
                        title="Editar músico"
                        style={{ width:36, height:36, borderRadius:10,
                                 border:`1px solid ${LINE}`, background:SURF,
                                 color:DIM, cursor:"pointer", fontSize:14, flexShrink:0 }}>
                        ✎
                      </button>
                      <button onClick={()=>deleteMusician(m.id)}
                        title="Excluir músico"
                        style={{ width:36, height:36, borderRadius:10,
                                 border:`1px solid ${LINE}`, background:SURF,
                                 color:RED, cursor:"pointer", fontSize:13, flexShrink:0 }}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              <div style={{ height:140 }}/>
            </div>

            {/* fixed bottom: add button or edit form */}
            <div style={{ borderTop:`1px solid ${LINE}`, padding:"16px 20px",
                          flexShrink:0, background:BG }}>
              {editingMusId === null ? (
                <button onClick={openNewMusician}
                  style={{ width:"100%", padding:"15px", borderRadius:12, border:"none",
                           background:GOLD, color:"#09090B", fontSize:15,
                           fontWeight:700, cursor:"pointer" }}>
                  + Adicionar músico
                </button>
              ) : (
                <div>
                  <div style={{ fontSize:10, letterSpacing:2, color:MUTED, marginBottom:10 }}>
                    {editingMusId==="new" ? "NOVO MÚSICO" : "EDITAR MÚSICO"}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <input value={formMusName} onChange={e=>setFormMusName(e.target.value)}
                      placeholder="Nome"
                      style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                               color:TEXT, padding:"13px 14px", fontSize:14, outline:"none" }}/>
                    <input value={formMusRole} onChange={e=>setFormMusRole(e.target.value)}
                      placeholder="Cargo (ex: Tutti, Concertino, Chefe)"
                      style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                               color:TEXT, padding:"13px 14px", fontSize:14, outline:"none" }}/>
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:DIM, marginBottom:4, paddingLeft:2 }}>
                          Quota total de folgas
                        </div>
                        <input type="number" min="0" value={formMusTotal}
                          onChange={e=>setFormMusTotal(e.target.value)}
                          style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                                   color:TEXT, padding:"13px 14px", fontSize:14, outline:"none",
                                   width:"100%", boxSizing:"border-box" }}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:DIM, marginBottom:4, paddingLeft:2 }}>
                          Folgas já tiradas
                        </div>
                        <input type="number" min="0" value={formMusTaken}
                          onChange={e=>setFormMusTaken(e.target.value)}
                          style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                                   color:TEXT, padding:"13px 14px", fontSize:14, outline:"none",
                                   width:"100%", boxSizing:"border-box" }}/>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:4 }}>
                      <button onClick={saveMusician}
                        style={{ flex:1, padding:"14px", borderRadius:12, border:"none",
                                 background:GOLD, color:"#09090B", fontSize:14,
                                 fontWeight:700, cursor:"pointer" }}>
                        Salvar
                      </button>
                      <button onClick={cancelEditMusician}
                        style={{ flex:1, padding:"14px", borderRadius:12,
                                 border:`1px solid ${LINE}`, background:"transparent",
                                 color:DIM, fontSize:14, cursor:"pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ PEDIDOS ══ */}
        {tab==="pedidos" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"12px 20px 0" }}>
              {requests.length===0 ? (
                <div style={{ display:"flex", flexDirection:"column",
                              alignItems:"center", justifyContent:"center",
                              height:"100%", gap:12, color:DIM }}>
                  <span style={{ fontSize:40 }}>📭</span>
                  <span style={{ fontSize:14 }}>Nenhum pedido pendente</span>
                </div>
              ) : requests.map((r,idx)=>{
                const m  = musicians.find(x=>x.id===r.mId);
                const ev = events.find(e=>e.id===r.eIdx);
                const hasO = otherOrch[r.mId];
                const noR  = rem(m)<=0;
                return (
                  <div key={r.id} style={{ borderBottom:`1px solid ${LINE}`, padding:"16px 0" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%",
                                    background:SURF, display:"flex", alignItems:"center",
                                    justifyContent:"center", fontSize:11,
                                    color:GOLD, fontWeight:700, flexShrink:0 }}>
                        {idx+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700 }}>{m?.name}</div>
                        <div style={{ fontSize:12, color:DIM }}>
                          {ev?.date} · {ev?.name?.slice(0,32)} · {r.time}
                        </div>
                      </div>
                    </div>
                    {hasO&&<div style={{ fontSize:12,color:GOLD,marginBottom:8 }}>🎻 Confirmar outra orquestra antes</div>}
                    {noR &&<div style={{ fontSize:12,color:RED, marginBottom:8 }}>Quota esgotada</div>}
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>approve(r.id)} disabled={noR}
                        style={{ flex:1, padding:"13px", borderRadius:12, border:"none",
                                 background:noR?"#111":"#0D2A1A",
                                 color:noR?"#333":"#4CAF88",
                                 cursor:noR?"not-allowed":"pointer",
                                 fontSize:14, fontWeight:700 }}>
                        Aprovar
                      </button>
                      <button onClick={()=>deny(r.id)}
                        style={{ flex:1, padding:"13px", borderRadius:12,
                                 border:`1px solid ${LINE}`, background:"transparent",
                                 color:DIM, cursor:"pointer", fontSize:14 }}>
                        Recusar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* form pinned at bottom */}
            <div style={{ borderTop:`1px solid ${LINE}`, padding:"16px 20px", flexShrink:0, background:BG }}>
              <div style={{ fontSize:10, letterSpacing:2, color:MUTED, marginBottom:10 }}>
                NOVO PEDIDO
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <select value={reqMus} onChange={e=>setReqMus(e.target.value)} style={SEL}>
                  <option value="">Selecionar músico…</option>
                  {musicians.map(m=>(
                    <option key={m.id} value={m.id}>
                      {m.name} — {Math.max(rem(m),0)} rest.
                    </option>
                  ))}
                </select>
                <select value={reqEvt} onChange={e=>setReqEvt(e.target.value)} style={SEL}>
                  <option value="">Selecionar evento…</option>
                  {events.filter(e=>!e.mandatory).map(ev=>(
                    <option key={ev.id} value={ev.id}>
                      {ev.date} · {ev.name.slice(0,30)}
                    </option>
                  ))}
                </select>
                <button onClick={addReq}
                  style={{ padding:"15px", borderRadius:12, border:"none",
                           background:GOLD, color:"#09090B",
                           fontSize:15, fontWeight:700, cursor:"pointer" }}>
                  Registrar na fila
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ AGENDA ══ */}
        {tab==="agenda" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 0" }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Gerenciar agenda</div>
                <div style={{ fontSize:13, color:DIM, lineHeight:1.7 }}>
                  Adicione, edite ou remova eventos manualmente. A ordem da lista é a ordem
                  exibida na Grade — use as flechas para reordenar.
                </div>
              </div>

              <div style={{ fontSize:10, letterSpacing:2, color:MUTED, marginBottom:12 }}>
                {events.length} EVENTO{events.length!==1?"S":""}
              </div>

              {events.map((ev, i) => (
                <div key={ev.id} style={{ borderBottom:`1px solid ${LINE}`, padding:"12px 0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {/* reorder arrows */}
                    <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
                      <button
                        onClick={e=>{ e.stopPropagation(); moveEvent(ev.id,-1); }}
                        disabled={i===0}
                        style={{ width:28, height:22, border:"none", background:"transparent",
                                 color: i===0?LINE:DIM, cursor:i===0?"default":"pointer", fontSize:11 }}>▲</button>
                      <button
                        onClick={e=>{ e.stopPropagation(); moveEvent(ev.id,1); }}
                        disabled={i===events.length-1}
                        style={{ width:28, height:22, border:"none", background:"transparent",
                                 color: i===events.length-1?LINE:DIM, cursor:i===events.length-1?"default":"pointer", fontSize:11 }}>▼</button>
                    </div>

                    {/* info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div onClick={()=>openEditEvent(ev)} style={{ cursor:"pointer" }}>
                        <span style={{ fontSize:12, color:ev.mandatory?GOLD:DIM, fontWeight:600 }}>
                          {ev.date}
                        </span>
                        {ev.mandatory && <span style={{ marginLeft:6, fontSize:11 }}>🔒</span>}
                        <div style={{ fontSize:14, fontWeight:600,
                                      color:ev.mandatory?GOLD:TEXT, marginTop:2 }}>
                          {ev.name}
                        </div>
                      </div>
                    </div>

                    {/* delete */}
                    <button onClick={()=>deleteEvent(ev.id)}
                      style={{ width:30, height:30, borderRadius:8, border:`1px solid ${LINE}`,
                               background:"transparent", color:RED, cursor:"pointer",
                               fontSize:13, flexShrink:0 }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ height:140 }}/>
            </div>

            {/* fixed bottom: add button or edit form */}
            <div style={{ borderTop:`1px solid ${LINE}`, padding:"16px 20px",
                          flexShrink:0, background:BG }}>
              {editingId === null ? (
                <button onClick={openNewEvent}
                  style={{ width:"100%", padding:"15px", borderRadius:12, border:"none",
                           background:GOLD, color:"#09090B", fontSize:15,
                           fontWeight:700, cursor:"pointer" }}>
                  + Adicionar evento
                </button>
              ) : (
                <div>
                  <div style={{ fontSize:10, letterSpacing:2, color:MUTED, marginBottom:10 }}>
                    {editingId==="new" ? "NOVO EVENTO" : "EDITAR EVENTO"}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <input value={formDate} onChange={e=>setFormDate(e.target.value)}
                      placeholder="Data (ex: 9 Ago)"
                      style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                               color:TEXT, padding:"13px 14px", fontSize:14, outline:"none" }}/>
                    <input value={formName} onChange={e=>setFormName(e.target.value)}
                      placeholder="Nome do evento"
                      style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                               color:TEXT, padding:"13px 14px", fontSize:14, outline:"none" }}/>

                    {!formMand && (
                      <div>
                        <div style={{ fontSize:10, color:DIM, marginBottom:4, paddingLeft:2 }}>
                          Efetivo de cordas necessário (opcional)
                        </div>
                        <input type="number" min="1" value={formCordas}
                          onChange={e=>setFormCordas(e.target.value)}
                          placeholder="ex: 9"
                          style={{ background:SURF, border:`1px solid ${LINE}`, borderRadius:12,
                                   color:TEXT, padding:"13px 14px", fontSize:14, outline:"none",
                                   width:"100%", boxSizing:"border-box" }}/>
                      </div>
                    )}

                    <button onClick={()=>setFormMand(v=>!v)}
                      style={{ display:"flex", alignItems:"center", gap:10,
                               background:SURF, border:`1px solid ${formMand?GOLD:LINE}`,
                               borderRadius:12, padding:"13px 14px", cursor:"pointer", textAlign:"left" }}>
                      <span style={{ width:18, height:18, borderRadius:5,
                                     border:`1px solid ${formMand?GOLD:DIM}`,
                                     background:formMand?GOLD:"transparent",
                                     display:"flex", alignItems:"center", justifyContent:"center",
                                     fontSize:11, color:"#09090B", flexShrink:0 }}>
                        {formMand?"✓":""}
                      </span>
                      <span style={{ fontSize:13, color: formMand?GOLD:DIM }}>
                        🔒 Folga obrigatória (dispensa todos)
                      </span>
                    </button>

                    <div style={{ display:"flex", gap:8, marginTop:4 }}>
                      <button onClick={saveEvent}
                        style={{ flex:1, padding:"14px", borderRadius:12, border:"none",
                                 background:GOLD, color:"#09090B", fontSize:14,
                                 fontWeight:700, cursor:"pointer" }}>
                        Salvar
                      </button>
                      <button onClick={cancelEdit}
                        style={{ flex:1, padding:"14px", borderRadius:12,
                                 border:`1px solid ${LINE}`, background:"transparent",
                                 color:DIM, fontSize:14, cursor:"pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── bottom nav ── */}
      <div style={{ display:"flex", background:"#050609",
                    borderTop:`1px solid ${LINE}`, flexShrink:0 }}>
        {[
          { id:"grade",   icon:"▦",  label:"Grade"   },
          { id:"musicos", icon:"◎",  label:"Músicos" },
          { id:"pedidos", icon:"⊡",  label: requests.length?`Pedidos ${requests.length}`:"Pedidos" },
          { id:"agenda",  icon:"⊕",  label:"Agenda"  },
        ].map(({id,icon,label})=>{
          const active = tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:1, padding:"11px 0 9px", border:"none",
                       background:"transparent", cursor:"pointer",
                       display:"flex", flexDirection:"column",
                       alignItems:"center", gap:3,
                       borderTop:`2px solid ${active?GOLD:"transparent"}` }}>
              <span style={{ fontSize:19, color:active?GOLD:MUTED,
                             lineHeight:1, transition:"color .2s" }}>
                {icon}
              </span>
              <span style={{ fontSize:9, letterSpacing:0.5,
                             color:active?GOLD:MUTED,
                             fontWeight:active?700:400 }}>
                {label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
