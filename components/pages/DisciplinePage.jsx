"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X as LucideX,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  Check as LucideCheck,
  Pencil,
  Plus,
  GripVertical,
} from "lucide-react";
import { T } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useDisciplineTracking } from "@/lib/hooks/useDisciplineTracking";
import { useCustomDisciplineRules } from "@/lib/hooks/useCustomDisciplineRules";
import { useCloudState } from "@/lib/hooks/useCloudState";
import { getLocalDateString } from "@/lib/dateUtils";
import { getCurrencySymbol } from "@/lib/userPrefs";

function reorder(arr, from, to) {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Édition inline : le bloc lui-même devient éditable (pas de modale ni de drawer).
// On affiche les items en cards éditables avec poignée + champ + corbeille.
function EditListModal({ open, title, accent, items, isCheckList, onClose, onSave }) {
  const [draft, setDraft] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  useEffect(() => {
    if (open) setDraft(items.map(it => isCheckList ? { ...it } : { label: it }));
  }, [open, items, isCheckList]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const update = (i, val) => setDraft(d => d.map((x, idx) => idx === i ? { ...x, label: val } : x));
  const remove = (i) => setDraft(d => d.filter((_, idx) => idx !== i));
  const add = () => setDraft(d => [...d, isCheckList ? { id: `personal_${Date.now()}_${d.length}`, label: "" } : { label: "" }]);
  const move = (from, to) => setDraft(d => reorder(d, from, to));
  const save = () => {
    const cleaned = draft.map(x => ({ ...x, label: (x.label || "").trim() })).filter(x => x.label);
    if (isCheckList) onSave(cleaned);
    else onSave(cleaned.map(x => x.label));
    onClose();
  };
  return ReactDOM.createPortal(
    <>
      {/* Backdrop avec slide-in fade */}
      <div onClick={onClose} style={{
        position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:9998,
        animation:"tr4de-drawer-fade 180ms ease both",
      }}/>

      {/* Drawer latéral */}
      <aside style={{
        position:"fixed",top:0,right:0,bottom:0,width:"min(440px, 92vw)",
        background:"#FFFFFF",borderLeft:"1px solid #E5E5E5",
        zIndex:9999,display:"flex",flexDirection:"column",
        boxShadow:"-12px 0 40px rgba(0,0,0,0.10)",
        fontFamily:"var(--font-sans)",
        animation:"tr4de-drawer-slide 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}>

        {/* Header avec accent à gauche */}
        <div style={{display:"flex",alignItems:"stretch",borderBottom:"1px solid #F0F0F0"}}>
          <div style={{width:3,background:accent,flexShrink:0}}/>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"18px 20px"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,color:"#8E8E8E",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Édition</div>
              <h2 style={{fontSize:16,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</h2>
            </div>
            <button onClick={onClose} aria-label="Fermer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,background:"transparent",border:"none",cursor:"pointer",color:"#8E8E8E",borderRadius:8,flexShrink:0}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5";e.currentTarget.style.color="#0D0D0D"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8E8E8E"}}>
              <LucideX size={18} strokeWidth={1.75}/>
            </button>
          </div>
        </div>

        {/* Liste éditable */}
        <div className="scroll-thin" style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          {draft.length === 0 ? (
            <div style={{padding:"48px 16px",textAlign:"center",color:"#8E8E8E",fontSize:13}}>
              Aucune règle pour l'instant.<br/>
              <span style={{fontSize:12,color:"#B4B4B4"}}>Ajoute-en une avec le bouton ci-dessous.</span>
            </div>
          ) : (
            <ol style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
              {draft.map((it, i) => (
                <li key={i}
                  draggable
                  onDragStart={()=>setDragIdx(i)}
                  onDragOver={(e)=>{e.preventDefault();setOverIdx(i)}}
                  onDragLeave={()=>setOverIdx(null)}
                  onDrop={()=>{ if (dragIdx!==null && dragIdx!==i) move(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                  onDragEnd={()=>{setDragIdx(null);setOverIdx(null)}}
                  style={{
                    display:"flex",alignItems:"center",gap:6,
                    background: overIdx===i && dragIdx!==i ? "#F5F5F5" : "#FFFFFF",
                    border:`1px solid ${overIdx===i && dragIdx!==i ? accent : "#E5E5E5"}`,
                    borderRadius:10,
                    padding:"4px 8px 4px 4px",
                    opacity: dragIdx===i ? 0.4 : 1,
                    transition:"border-color .12s ease, background .12s ease, opacity .12s ease",
                  }}>
                  <span style={{cursor:"grab",color:"#C8C8C8",display:"inline-flex",padding:"6px 4px",flexShrink:0}} title="Glisser pour réordonner">
                    <GripVertical size={14} strokeWidth={1.75}/>
                  </span>
                  <input
                    type="text" value={it.label} placeholder={`Règle ${i+1}`}
                    onChange={(e)=>update(i, e.target.value)}
                    style={{flex:1,padding:"8px 0",border:"none",outline:"none",fontSize:13,fontFamily:"inherit",color:"#0D0D0D",background:"transparent"}}
                  />
                  <button type="button" onClick={()=>remove(i)} title="Supprimer"
                    style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#B4B4B4",borderRadius:6,flexShrink:0,transition:"color .12s ease, background .12s ease"}}
                    onMouseEnter={(e)=>{e.currentTarget.style.color="#EF4444";e.currentTarget.style.background="#FEF2F2"}}
                    onMouseLeave={(e)=>{e.currentTarget.style.color="#B4B4B4";e.currentTarget.style.background="transparent"}}>
                    <LucideTrash2 size={14} strokeWidth={1.75}/>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {/* Bouton ajouter */}
          <button type="button" onClick={add}
            style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,
              padding:"10px",fontSize:13,fontWeight:500,
              color:"#0D0D0D",background:"transparent",
              border:"1px dashed #D4D4D4",cursor:"pointer",borderRadius:10,
              fontFamily:"inherit",width:"100%",marginTop:draft.length === 0 ? 0 : 8,
              transition:"background .12s ease, border-color .12s ease",
            }}
            onMouseEnter={(e)=>{e.currentTarget.style.background=accent+"14";e.currentTarget.style.borderColor=accent}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="#D4D4D4"}}>
            <Plus size={14} strokeWidth={2}/> Ajouter une règle
          </button>
        </div>

        {/* Footer */}
        <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderTop:"1px solid #F0F0F0",background:"#FAFAFA"}}>
          <span style={{fontSize:11,color:"#8E8E8E",fontVariantNumeric:"tabular-nums"}}>
            {draft.filter(d => (d.label || "").trim()).length} règle{draft.length > 1 ? "s" : ""}
          </span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"0 16px",height:34,borderRadius:8,border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#0D0D0D",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
            <button onClick={save} style={{padding:"0 16px",height:34,borderRadius:8,border:"1px solid #0D0D0D",background:"#0D0D0D",color:"#FFFFFF",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Enregistrer</button>
          </div>
        </div>

      </aside>

      <style>{`
        @keyframes tr4de-drawer-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tr4de-drawer-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>,
    document.body
  );
}
function EditableTextList({ title, iconBg, icon, items, onSave, renderPrefix, accent }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const enterEdit = () => { setDraft(items.map(it => ({ label: it }))); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft([]); };
  const saveEdit = () => {
    const cleaned = draft.map(x => (x.label || "").trim()).filter(Boolean);
    onSave(cleaned);
    setEditing(false); setDraft([]);
  };
  const update = (i, val) => setDraft(d => d.map((x, idx) => idx === i ? { ...x, label: val } : x));
  const removeRow = (i) => setDraft(d => d.filter((_, idx) => idx !== i));
  const addRow = () => setDraft(d => [...d, { label: "" }]);
  const move = (from, to) => setDraft(d => reorder(d, from, to));
  return (
    <div
      style={{background:"#FFFFFF",border:`1px solid ${editing ? accent : "#E5E5E5"}`,borderRadius:12,overflow:"hidden",transition:"border-color .15s ease"}}
      onMouseEnter={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 1; } }}
      onMouseLeave={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 0; } }}>
      {/* Header */}
      <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${editing ? accent + "30" : "#E5E5E5"}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:24,height:24,borderRadius:6,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div>
        <div style={{fontSize:13,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.1,flex:1}}>{title}</div>
        {editing ? (
          <div style={{display:"flex",gap:6}}>
            <button onClick={cancelEdit} style={{height:26,padding:"0 10px",border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#5C5C5C",fontSize:12,fontWeight:500,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>Annuler</button>
            <button onClick={saveEdit} style={{height:26,padding:"0 10px",border:`1px solid ${accent}`,background:accent,color:"#FFFFFF",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>OK</button>
          </div>
        ) : (
          <button data-edit-btn type="button" onClick={enterEdit} title="Modifier"
            style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,border:"none",background:"transparent",cursor:"pointer",color:"#8E8E8E",borderRadius:6,opacity:0,transition:"opacity .15s ease"}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0";e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8E8E8E"}}>
            <Pencil size={13} strokeWidth={1.75}/>
          </button>
        )}
      </div>

      {/* Corps */}
      {editing ? (
        <div style={{padding:"8px 10px 12px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {draft.map((it,i)=>(
              <div key={i}
                draggable
                onDragStart={()=>setDragIdx(i)}
                onDragOver={(e)=>{e.preventDefault();setOverIdx(i)}}
                onDragLeave={()=>setOverIdx(null)}
                onDrop={()=>{ if (dragIdx!==null && dragIdx!==i) move(dragIdx,i); setDragIdx(null); setOverIdx(null); }}
                onDragEnd={()=>{setDragIdx(null);setOverIdx(null)}}
                style={{display:"flex",alignItems:"center",gap:4,padding:"2px 4px",borderRadius:6,
                  background: overIdx===i && dragIdx!==i ? "#F5F5F5" : "transparent",
                  opacity: dragIdx===i ? 0.4 : 1,
                  transition:"background .12s ease",
                }}>
                <span style={{cursor:"grab",color:"#C8C8C8",display:"inline-flex",padding:4,flexShrink:0}}><GripVertical size={12} strokeWidth={1.75}/></span>
                <input
                  type="text" value={it.label} placeholder={`Règle ${i+1}`}
                  onChange={(e)=>update(i, e.target.value)}
                  onKeyDown={(e)=>{ if (e.key==="Enter"){ e.preventDefault(); addRow(); } }}
                  style={{flex:1,fontSize:12,padding:"6px 8px",border:"1px solid transparent",borderRadius:6,outline:"none",fontFamily:"inherit",color:"#0D0D0D",background:"#FAFAFA"}}
                  onFocus={(e)=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.background="#FFFFFF"}}
                  onBlur={(e)=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.background="#FAFAFA"}}
                />
                <button type="button" onClick={()=>removeRow(i)} title="Supprimer"
                  style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#B4B4B4",borderRadius:4,flexShrink:0}}
                  onMouseEnter={(e)=>{e.currentTarget.style.color="#EF4444"}} onMouseLeave={(e)=>{e.currentTarget.style.color="#B4B4B4"}}>
                  <LucideTrash2 size={12} strokeWidth={1.75}/>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,padding:"6px 8px",fontSize:12,color:"#5C5C5C",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5";e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5C5C5C"}}>
            <Plus size={12} strokeWidth={2}/> Ajouter
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",padding:"8px 6px"}}>
          {items.length === 0 && (
            <div style={{padding:"12px",fontSize:12,color:"#8E8E8E",textAlign:"center"}}>Aucun élément. Survolez et cliquez ✎ pour ajouter.</div>
          )}
          {items.map((txt,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"6px 10px",borderRadius:6,transition:"background .12s ease"}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
              {renderPrefix?.(i)}
              <div style={{fontSize:12,color:"#0D0D0D",fontWeight:400,lineHeight:1.5,flex:1}}>{txt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableCheckList({ title, iconBg, icon, items, checkedRuleIds, onToggleCheck, onSave, accent }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const checkedCount = items.filter(r => !!checkedRuleIds[r.id]).length;
  const enterEdit = () => { setDraft(items.map(it => ({...it}))); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft([]); };
  const saveEdit = () => {
    const cleaned = draft.map(x => ({...x, label: (x.label||"").trim()})).filter(x => x.label);
    onSave(cleaned);
    setEditing(false); setDraft([]);
  };
  const update = (i, val) => setDraft(d => d.map((x,idx) => idx===i ? {...x, label: val} : x));
  const removeRow = (i) => setDraft(d => d.filter((_,idx) => idx!==i));
  const addRow = () => setDraft(d => [...d, { id: `personal_${Date.now()}_${d.length}`, label: "" }]);
  const move = (from, to) => setDraft(d => reorder(d, from, to));
  return (
    <div style={{background:"#FFFFFF",border:`1px solid ${editing ? accent : "#E5E5E5"}`,borderRadius:12,overflow:"hidden",transition:"border-color .15s ease"}}
      onMouseEnter={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 1; } }}
      onMouseLeave={(e)=>{ if (!editing) { const btn = e.currentTarget.querySelector('[data-edit-btn]'); if (btn) btn.style.opacity = 0; } }}>
      <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${editing ? accent + "30" : "#E5E5E5"}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:24,height:24,borderRadius:6,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div>
        <div style={{fontSize:13,fontWeight:600,color:"#0D0D0D",letterSpacing:-0.1,flex:1}}>{title}</div>
        {editing ? (
          <div style={{display:"flex",gap:6}}>
            <button onClick={cancelEdit} style={{height:26,padding:"0 10px",border:"1px solid #E5E5E5",background:"#FFFFFF",color:"#5C5C5C",fontSize:12,fontWeight:500,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>Annuler</button>
            <button onClick={saveEdit} style={{height:26,padding:"0 10px",border:`1px solid ${accent}`,background:accent,color:"#FFFFFF",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}>OK</button>
          </div>
        ) : (
          <>
            <div style={{fontSize:11,color:"#8E8E8E",fontVariantNumeric:"tabular-nums"}}>{checkedCount}/{items.length}</div>
            <button data-edit-btn type="button" onClick={enterEdit} title="Modifier"
              style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,border:"none",background:"transparent",cursor:"pointer",color:"#8E8E8E",borderRadius:6,opacity:0,transition:"opacity .15s ease"}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#F0F0F0";e.currentTarget.style.color="#0D0D0D"}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#8E8E8E"}}>
              <Pencil size={13} strokeWidth={1.75}/>
            </button>
          </>
        )}
      </div>

      {editing ? (
        <div style={{padding:"8px 10px 12px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {draft.map((it,i)=>(
              <div key={i}
                draggable
                onDragStart={()=>setDragIdx(i)}
                onDragOver={(e)=>{e.preventDefault();setOverIdx(i)}}
                onDragLeave={()=>setOverIdx(null)}
                onDrop={()=>{ if (dragIdx!==null && dragIdx!==i) move(dragIdx,i); setDragIdx(null); setOverIdx(null); }}
                onDragEnd={()=>{setDragIdx(null);setOverIdx(null)}}
                style={{display:"flex",alignItems:"center",gap:4,padding:"2px 4px",borderRadius:6,
                  background: overIdx===i && dragIdx!==i ? "#F5F5F5" : "transparent",
                  opacity: dragIdx===i ? 0.4 : 1,
                  transition:"background .12s ease",
                }}>
                <span style={{cursor:"grab",color:"#C8C8C8",display:"inline-flex",padding:4,flexShrink:0}}><GripVertical size={12} strokeWidth={1.75}/></span>
                <input
                  type="text" value={it.label} placeholder={`Règle ${i+1}`}
                  onChange={(e)=>update(i, e.target.value)}
                  onKeyDown={(e)=>{ if (e.key==="Enter"){ e.preventDefault(); addRow(); } }}
                  style={{flex:1,fontSize:12,padding:"6px 8px",border:"1px solid transparent",borderRadius:6,outline:"none",fontFamily:"inherit",color:"#0D0D0D",background:"#FAFAFA"}}
                  onFocus={(e)=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.background="#FFFFFF"}}
                  onBlur={(e)=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.background="#FAFAFA"}}
                />
                <button type="button" onClick={()=>removeRow(i)} title="Supprimer"
                  style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#B4B4B4",borderRadius:4,flexShrink:0}}
                  onMouseEnter={(e)=>{e.currentTarget.style.color="#EF4444"}} onMouseLeave={(e)=>{e.currentTarget.style.color="#B4B4B4"}}>
                  <LucideTrash2 size={12} strokeWidth={1.75}/>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6,padding:"6px 8px",fontSize:12,color:"#5C5C5C",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,fontFamily:"inherit"}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5";e.currentTarget.style.color="#0D0D0D"}}
            onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#5C5C5C"}}>
            <Plus size={12} strokeWidth={2}/> Ajouter
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",padding:"8px 6px"}}>
          {items.length === 0 && (
            <div style={{padding:"12px",fontSize:12,color:"#8E8E8E",textAlign:"center"}}>Aucune règle. Survolez et cliquez ✎ pour en ajouter.</div>
          )}
          {items.map(r => {
            const checked = !!checkedRuleIds[r.id];
            return (
              <label key={r.id}
                style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:6,cursor:"pointer",background:"transparent",transition:"background .12s ease"}}
                onMouseEnter={(e)=>{e.currentTarget.style.background="#F5F5F5"}}
                onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                <input type="checkbox" checked={checked} onChange={()=>onToggleCheck(r.id)}
                  style={{width:14,height:14,accentColor:"#10A37F",cursor:"pointer",margin:0,flexShrink:0}}/>
                <span style={{fontSize:12, color: checked ? "#8E8E8E" : "#0D0D0D", fontWeight:400, lineHeight:1.5, textDecoration: checked ? "line-through" : "none"}}>
                  {r.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DisciplinePage({ trades = [] }) {
  // ✅ Utiliser les hooks Supabase
  const { user } = useAuth();
  const { getDayDiscipline, setRuleCompleted, getDayScore, baseRules, disciplineData } = useDisciplineTracking();
  const { customRules, loading: rulesLoading, addRule, deleteRule } = useCustomDisciplineRules();
  
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [heatmapVersion, setHeatmapVersion] = useState(0);
  const [checkedRuleIds, setCheckedRuleIds] = useState(() => {
    try {
      const todayKey = getLocalDateString();
      return JSON.parse(localStorage.getItem(`tr4de_checked_rules_${todayKey}`) || "{}");
    } catch {
      return {};
    }
  });
  const [newManualRule, setNewManualRule] = useState("");
  const [ruleCategory, setRuleCategory] = useState("texte");
  const [ruleTime, setRuleTime] = useState("09:00");
  const [ruleAmount, setRuleAmount] = useState("");
  const [disciplineRules, setDisciplineRules] = useCloudState("tr4de_discipline_rules_config", "discipline_rules_config", {});
  const [activeDays, setActiveDays] = useCloudState("tr4de_discipline_active_days", "discipline_active_days", {});

  // Listes éditables pour Bias / Règles à suivre / Erreurs à éviter
  const DEFAULT_BIAS = [
    "Identifier le balayage de liquidité (HTF Liquidity Sweep)",
    "Définir l'objectif de prix (Draw on Liquidity)",
    "Vérifier les respects/discrédits (FVG/OB)",
    "Comparer les divergences SMT (Corrélation d'actifs)",
    "Appliquer les profils de session (Asie/Londres/New York)",
  ];
  const DEFAULT_PERSONAL = [
    { id: "personal_sl_be",       label: "Ne pas bouger son SL en BE" },
    { id: "personal_ifvg",        label: "Bien attendre le iFVG" },
    { id: "personal_focus",       label: "Être attentif sur le marché" },
    { id: "personal_no_hesitate", label: "Ne pas hésiter" },
  ];
  const DEFAULT_ERRORS = [
    "FVG au-dessus du SL (sauf si trend forte)",
    "Zone de liquidité juste au-dessus du SL (range, plus hauts, etc.)",
    "Si la majeure sellside a été prise, ne pas prendre le premier setup, attendre un meilleur retracement",
    "Rentrer sans confirmation",
  ];
  const [biasItems, setBiasItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tr4de_bias_items") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_BIAS;
    } catch { return DEFAULT_BIAS; }
  });
  const [personalRules, setPersonalRules] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tr4de_personal_rules") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_PERSONAL;
    } catch { return DEFAULT_PERSONAL; }
  });
  const [errorItems, setErrorItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tr4de_error_items") || "null");
      return Array.isArray(saved) ? saved : DEFAULT_ERRORS;
    } catch { return DEFAULT_ERRORS; }
  });
  React.useEffect(() => { try { localStorage.setItem("tr4de_bias_items", JSON.stringify(biasItems)); } catch {} }, [biasItems]);
  React.useEffect(() => { try { localStorage.setItem("tr4de_personal_rules", JSON.stringify(personalRules)); } catch {} }, [personalRules]);
  React.useEffect(() => { try { localStorage.setItem("tr4de_error_items", JSON.stringify(errorItems)); } catch {} }, [errorItems]);

  // === Sync online (Supabase user_preferences) des 3 listes Discipline ===
  const [listsLoadedFromCloud, setListsLoadedFromCloud] = useState(false);
  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = createClient();
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("bias_items, error_items, personal_rules")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          console.warn("⚠️ load discipline lists:", error.code, error.message);
        } else if (!cancelled && data) {
          if (Array.isArray(data.bias_items))     setBiasItems(data.bias_items);
          if (Array.isArray(data.error_items))    setErrorItems(data.error_items);
          if (Array.isArray(data.personal_rules)) setPersonalRules(data.personal_rules);
        }
      } catch (e) { console.error("⚠️ load discipline lists failed:", e?.message || e); }
      finally { if (!cancelled) setListsLoadedFromCloud(true); }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  // Auto-save (debounced) à chaque modification d'une des 3 listes
  React.useEffect(() => {
    if (!user?.id || !listsLoadedFromCloud) return;
    const supabase = createClient();
    const handle = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("user_preferences")
          .upsert([{
            user_id: user.id,
            bias_items: biasItems,
            error_items: errorItems,
            personal_rules: personalRules,
            updated_at: new Date().toISOString(),
          }], { onConflict: "user_id" });
        if (error) console.error("⚠️ save discipline lists failed:", error.message);
      } catch (e) { console.error("⚠️ save discipline lists error:", e); }
    }, 600);
    return () => clearTimeout(handle);
  }, [biasItems, errorItems, personalRules, user?.id, listsLoadedFromCloud]);

  const heatmapScrollRef = useRef(null);
  const today = getLocalDateString();
  const todayDate = new Date();
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonth = monthNames[todayDate.getMonth()];
  const currentDay = todayDate.getDate();
  const dayLabelsShort = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // ✅ Récupérer les règles d'aujourd'hui depuis Supabase via le hook
  const todayRules = getDayDiscipline(today);
  const todayScore = getDayScore(today);
  
  // ✅ disciplineData (depuis Supabase) est la source de vérité.
  //    setRuleCompleted fait un optimistic update synchrone, donc cet effet
  //    reflète toujours soit Supabase, soit la dernière action utilisateur.
  React.useEffect(() => {
    const fromSupabase = (disciplineData && disciplineData[today]) || {};
    setCheckedRuleIds(fromSupabase);
  }, [today, disciplineData]);

  // Auto-update journal rule when daily notes change
  React.useEffect(() => {
    const handleStorageChange = () => {
      const currentDate = getLocalDateString();
      const dailyNotesData = JSON.parse(localStorage.getItem("tr4de_daily_notes") || "{}");
      const todayNote = dailyNotesData[currentDate];
      
      setCheckedRuleIds(prev => {
        const updated = { ...prev };
        if (todayNote && todayNote.trim().length > 0) {
          updated.journal = true;
        } else {
          // Don't auto-uncheck if note is removed - let user decide
          // This preserves manual override
        }
        return updated;
      });
    };

    // Listen for storage changes (when notes are saved from JournalPage)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case save happens in same tab
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    setHeatmapVersion(v => v + 1);
  }, [disciplineData]);

  React.useEffect(() => {
    if (heatmapScrollRef.current) {
      const container = heatmapScrollRef.current;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Find all month labels and scroll to the current month
      const monthLabels = container.querySelectorAll('[data-month]');
      monthLabels.forEach((label) => {
        const monthIndex = parseInt(label.getAttribute('data-month'));
        if (monthIndex === currentMonth) {
          // Scroll this month into view
          setTimeout(() => {
            label.parentElement.scrollLeft = label.offsetLeft - 100;
          }, 0);
        }
      });
    }
  }, [heatmapVersion]);

  const toggleRule = (ruleId, currentAllRules) => {
    setCheckedRuleIds(prev => {
      const updated = { ...prev, [ruleId]: !prev[ruleId] };
      localStorage.setItem(`tr4de_checked_rules_${today}`, JSON.stringify(updated));
      
      // ✅ Sauvegarder dans Supabase via le hook
      const newStatus = !prev[ruleId];
      setRuleCompleted(today, ruleId, newStatus).catch(err => {
        console.error("❌ Erreur sauvegarde discipline Supabase:", err);
      });
      
      return updated;
    });
    setHeatmapVersion(v => v + 1);
  };

  const ruleDescriptions = {
    premarket: "Effectuer votre routine matinale avant l'ouverture du marché pour une meilleure préparation",
    biais: "Identifier et trader selon le biais dominant du marché du jour",
    news: "Consulter les actualités importantes et identifier les niveaux clés du marché",
    followall: "Vérifier que toutes les règles de discipline ont été respectées durant la session",
    journal: "Consigner votre analyse et vos apprentissages après la fermeture du marché"
  };

  // Liste quotidienne uniquement (base + custom Supabase). Affichée dans la
  // section "Liste quotidienne".
  const dailyRules = [
    { id: "premarket", label: "Routine pré-marché", uuid: null },
    { id: "biais", label: "Biais journalier", uuid: null },
    { id: "news", label: "News et niveaux clés", uuid: null },
    { id: "followall", label: "Toutes les règles respectées", uuid: null },
    { id: "journal", label: "Journal d'après-session", uuid: null },
    ...customRules.map(r => ({ id: r.rule_id, label: r.text, uuid: r.id })),
  ].map(r => ({ ...r, status: checkedRuleIds[r.id] || false }));

  // Le progress tracker / la heatmap ne comptent QUE la liste quotidienne.
  // Les règles perso "Règles à suivre" sont indépendantes.
  const allRules = dailyRules;

  const completedCount = allRules.filter(r => r.status).length;
  const completeProgress = (completedCount / Math.max(allRules.length, 1)) * 100;
  const currentDate = new Date();

  // Auto-toggle "Followed All Rules" quand toutes les règles perso sont cochées.
  // (Les règles perso ne comptent toujours PAS dans le progress tracker, mais elles
  // pilotent cette case-là, qui elle est dans la liste quotidienne.)
  React.useEffect(() => {
    if (!personalRules.length) return;
    const allChecked = personalRules.every(r => !!checkedRuleIds[r.id]);
    const followAllCurrent = !!checkedRuleIds["followall"];
    if (allChecked && !followAllCurrent) {
      toggleRule("followall", allRules);
    } else if (!allChecked && followAllCurrent) {
      toggleRule("followall", allRules);
    }
  }, [checkedRuleIds, personalRules]);

  const saveDisciplineRules = () => {
    // useCloudState persists automatically (localStorage + Supabase debounced)
    setShowRulesModal(false);
  };

  const addManualRule = async () => {
    if (ruleCategory === "texte" && !newManualRule.trim()) return;
    if (ruleCategory === "horaire" && !ruleTime) return;
    if (ruleCategory === "argent" && !ruleAmount.trim()) return;
    
    try {
      let displayText = "";
      if (ruleCategory === "texte") {
        displayText = newManualRule;
      } else if (ruleCategory === "horaire") {
        displayText = `Horaire: ${ruleTime}`;
      } else if (ruleCategory === "argent") {
        displayText = `Argent: $${ruleAmount}`;
      }
      
      // Sauvegarder dans Supabase via le hook
      await addRule(ruleCategory, displayText, ruleTime, ruleAmount);
    } catch (err) {
      console.error("❌ Erreur ajout règle:", err);
    }
    
    // Reset form
    setNewManualRule("");
    setRuleTime("09:00");
    setRuleAmount("");
    setRuleCategory("texte");
    setShowRuleForm(false);
  };

  const removeManualRule = async (id) => {
    try {
      await deleteRule(id);
    } catch (err) {
      console.error("❌ Erreur suppression règle:", err);
    }
  };

  const toggleActiveDay = (ruleId, dayIdx) => {
    setActiveDays(prev => ({
      ...prev,
      [ruleId]: prev[ruleId].map((day, idx) => idx === dayIdx ? !day : day)
    }));
  };

  return (
    <>
      <div style={{display:"flex",flexDirection:"column",gap:16}} className="anim-1">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <h1 style={{fontSize:17,fontWeight:600,color:"#0D0D0D",margin:0,letterSpacing:-0.1,fontFamily:"var(--font-sans)"}}>{t("disc.title")}</h1>
          <div id="tr4de-page-header-slot" style={{marginLeft:"auto"}} />
        </div>
        {/* TOP SECTION - 4 COLUMNS */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12}}>
          {/* DATE */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",justifyContent:"space-between",height:"100%"}}>
            <div style={{fontSize:12,color:T.textMut,fontWeight:600}}>{t("disc.todayProgress")}</div>
            <div style={{display:"flex",justifyContent:"flex-start",alignItems:"flex-end",gap:12}}>
              <div style={{display:"flex",gap:4,flex:1}}>
                <div style={{fontSize:32,fontWeight:700,color:T.text}}>{currentMonth}</div>
                <div style={{fontSize:28,fontWeight:700,color:T.text}}>{currentDay}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flex:1,justifyContent:"flex-end"}}>
                <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="35" cy="35" r="30" fill="none" stroke={T.bg} strokeWidth="4"/>
                  <circle
                    cx="35" cy="35" r="30"
                    fill="none"
                    stroke={T.green}
                    strokeWidth="4"
                    strokeDasharray={`${30 * 2 * Math.PI}`}
                    strokeDashoffset={`${30 * 2 * Math.PI * (1 - completeProgress / 100)}`}
                    strokeLinecap="round"
                    style={{transition:"stroke-dashoffset 0.3s"}}
                  />
                  <text
                    x="35" y="40"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="700"
                    fill={T.text}
                    style={{transform:"rotate(90deg)",transformOrigin:"35px 35px"}}
                  >
                    {Math.round(completeProgress)}%
                  </text>
                </svg>
                <div style={{fontSize:10,fontWeight:500,color:T.textMut}}>{completedCount} sur {allRules.length} règles</div>
              </div>
            </div>
          </div>

          {/* BIAS JOURNALIER */}
          <EditableTextList
            title={t("disc.biasDaily")}
            iconBg="#EFF6FF"
            accent="#3B82F6"
            icon={<LucideTrendingUp size={13} strokeWidth={1.75} color="#3B82F6"/>}
            items={biasItems}
            onSave={setBiasItems}
            renderPrefix={(i)=>(
              <div style={{minWidth:18,fontSize:11,color:T.textMut,fontVariantNumeric:"tabular-nums",marginTop:1}}>{i+1}.</div>
            )}
          />

          {/* REGLES A SUIVRE */}
          <EditableCheckList
            title={t("disc.rulesToFollow")}
            iconBg="#E6F7F1"
            accent={T.green}
            icon={<LucideCheck size={13} strokeWidth={2} color={T.green}/>}
            items={personalRules}
            checkedRuleIds={checkedRuleIds}
            onToggleCheck={(id)=>toggleRule(id, allRules)}
            onSave={setPersonalRules}
          />

          {/* ERREURS A EVITER */}
          <EditableTextList
            title={t("disc.errorsToAvoid")}
            iconBg="#FEF2F2"
            accent={T.red}
            icon={<LucideX size={13} strokeWidth={2} color={T.red}/>}
            items={errorItems}
            onSave={setErrorItems}
            renderPrefix={()=>(
              <div style={{minWidth:18,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <LucideX size={11} strokeWidth={2.25} color={T.red}/>
              </div>
            )}
          />
        </div>

        {/* MIDDLE SECTION - 2 COLUMNS */}
        <div style={{display:"grid",gridTemplateColumns:"0.8fr 2.2fr",gap:12}}>
          {/* DAILY CHECKLIST */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12}}>
            <div style={{padding:16,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text}}>{t("disc.checklist")}</div>
                <div style={{fontSize:11,color:T.textMut}}>{currentDay} {currentMonth.toLowerCase()}.</div>
              </div>
              <div style={{fontSize:11,color:T.textMut,background:T.bg,padding:"4px 8px",borderRadius:4}}>{dailyRules.filter(r=>r.status).length}/{dailyRules.length}</div>
            </div>
            <div style={{maxHeight:"none",overflowY:"visible",paddingTop:8}}>
              {dailyRules.map(rule => (
                <div
                  key={rule.id}
                  onClick={() => toggleRule(rule.id, allRules)}
                  style={{
                    padding:"12px 16px",
                    display:"flex",
                    alignItems:"center",
                    gap:12,
                    background:rule.status?T.bg:"transparent",
                    cursor:"pointer",
                    transition:"background 0.15s"
                  }}
                >
                  <div style={{
                    width:18,
                    height:18,
                    borderRadius:3,
                    background:rule.status?T.green:"transparent",
                    border:`2px solid ${rule.status?T.green:T.border2}`,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    color:"white",
                    fontSize:12,
                    fontWeight:600,
                    flexShrink:0,
                    transition:"all 0.15s"
                  }}>
                    {rule.status ? "✓" : ""}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:rule.status?T.textMut:T.text,textDecoration:rule.status?"line-through":"none"}}>{rule.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HEATMAP CALENDAR - DISCIPLINE TRACKER */}
          <div key={heatmapVersion} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:28,minWidth:0,overflow:"hidden"}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{t("disc.progressTracker")}</div>
              <div style={{fontSize:12,fontWeight:600,color:T.accent,marginTop:4}}>{dailyRules.filter(r => r.status).length}/{dailyRules.length}</div>
              
              {(() => {
                // Calculer la streak de jours consécutifs (Supabase d'abord, localStorage en fallback)
                let streak = 0;
                const cursor = new Date();
                while (true) {
                  const dateStr = getLocalDateString(cursor);
                  let checked = null;
                  if (disciplineData && disciplineData[dateStr]) {
                    checked = disciplineData[dateStr];
                  } else {
                    const stored = localStorage.getItem(`tr4de_checked_rules_${dateStr}`);
                    if (stored) {
                      try { checked = JSON.parse(stored); } catch {}
                    }
                  }
                  if (checked) {
                    const hasAnyRule = Object.values(checked).some(v => v === true);
                    if (hasAnyRule) {
                      streak++;
                      cursor.setDate(cursor.getDate() - 1);
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }
                
                return (
                  <div style={{fontSize:12,color:T.textSub,marginTop:6}}>
                    {streak >= 2 ? `${streak} jours de suite` : 'Pas de streak active'}
                  </div>
                );
              })()}
            </div>
            
            <div ref={heatmapScrollRef} style={{overflowX:"auto",paddingBottom:12,cursor:"grab"}}>
              <div style={{minWidth:"max-content"}}>
              {(() => {
                const frMonths = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
                const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                const today = new Date();
                
                // Find the earliest trade date, fallback to Jan 1st of current year
                const earliestTrade = trades && trades.length > 0
                  ? trades.reduce((min, t) => {
                      const d = new Date(t.date || t.open_time || t.closeTime || t.created_at);
                      return d < min ? d : min;
                    }, new Date())
                  : new Date(today.getFullYear(), 0, 1);
                
                const startDate = new Date(earliestTrade.getFullYear(), earliestTrade.getMonth(), 1);
                const endDate = new Date(today.getFullYear(), 11, 31); // End of current year
                
                // Build months array from startDate to endDate
                const monthCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
                const months = Array.from({length: monthCount}, (_, i) => frMonths[(startDate.getMonth() + i) % 12]);
                
                /**
                 * Moteur de Couleur - Calcule la couleur basée sur la discipline
                 * Logique - 5 paliers:
                 * - Si pas de trading: Gris Clair
                 * - 1-20%: Vert Très Pâle
                 * - 21-40%: Vert Pâle
                 * - 41-60%: Vert Moyen
                 * - 61-80%: Vert Clair
                 * - 81-100%: Vert Vif
                 */
                const getColorByDiscipline = (percentage) => {
                  if (percentage === 0) return null; // Pas de couleur = gris clair
                  if (percentage <= 20) return '#DCFCE7'; // Vert très pâle (1-20%)
                  if (percentage <= 40) return '#86EFAC'; // Vert pâle (21-40%)
                  if (percentage <= 60) return '#4ADE80'; // Vert moyen (41-60%)
                  if (percentage <= 80) return '#22C55E'; // Vert clair (61-80%)
                  return '#10A37F';                       // Vert vif (81-100%)
                };
                
                // Function to get daily completion data: prioritize Supabase (disciplineData), fallback to localStorage
                const getDailyData = (dateStr) => {
                  try {
                    let checked = null;
                    if (disciplineData && disciplineData[dateStr]) {
                      checked = disciplineData[dateStr];
                    } else {
                      const stored = localStorage.getItem(`tr4de_checked_rules_${dateStr}`);
                      if (stored) checked = JSON.parse(stored);
                    }
                    if (checked) {
                      // On ne compte QUE les règles de la liste quotidienne
                      // (les règles perso "Règles à suivre" sont exclues).
                      const dailyIds = new Set([
                        "premarket","biais","news","followall","journal",
                        ...customRules.map(r => r.rule_id),
                      ]);
                      const checkedCount = Object.entries(checked)
                        .filter(([id, v]) => v === true && dailyIds.has(id))
                        .length;
                      const totalRules = 5 + customRules.length;
                      const percentage = Math.round((checkedCount / Math.max(totalRules, 1)) * 100);
                      return { percentage, hadTrading: true, rulesRespected: checkedCount, totalRules };
                    }
                  } catch (e) {}
                  return { percentage: 0, hadTrading: false, rulesRespected: 0, totalRules: 0 };
                };
                
                // Build all weeks across all months
                const allWeeks = [];
                
                // Build calendar continuously across all 6 months
                // (endDate already defined above as Dec 31)
                
                // Find the Monday of the week containing startDate
                const calStart = new Date(startDate);
                const dow = calStart.getDay();
                const offsetToMonday = dow === 0 ? -6 : 1 - dow;
                calStart.setDate(calStart.getDate() + offsetToMonday);
                
                // Find the Sunday of the week containing endDate
                const calEnd = new Date(endDate);
                const dowEnd = calEnd.getDay();
                const offsetToSunday = dowEnd === 0 ? 0 : 7 - dowEnd;
                calEnd.setDate(calEnd.getDate() + offsetToSunday);
                
                let currentWeek = [];
                const cursor = new Date(calStart);
                
                while (cursor <= calEnd) {
                  const dayOfWeek = cursor.getDay();
                  const adjustedDow = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Mon
                  
                  if (adjustedDow === 0) {
                    currentWeek = new Array(7).fill(null);
                  }
                  
                  const inRange = cursor >= startDate && cursor <= endDate;
                  if (inRange) {
                    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
                    const dailyData = getDailyData(dateStr);
                    const color = getColorByDiscipline(dailyData.percentage);
                    currentWeek[adjustedDow] = { dateStr, ...dailyData, color };
                  }
                  
                  if (adjustedDow === 6) {
                    allWeeks.push(currentWeek);
                  }
                  
                  cursor.setDate(cursor.getDate() + 1);
                }
                
                // Close last week if needed
                if (currentWeek.length > 0 && currentWeek.some(d => d !== null)) {
                  allWeeks.push(currentWeek);
                }
                
                // Calculate month positions AFTER building allWeeks (precise alignment)
                const monthPositions = months.map((monthName, mi) => {
                  const targetMonth = (startDate.getMonth() + mi) % 12;
                  const targetYear = startDate.getFullYear() + Math.floor((startDate.getMonth() + mi) / 12);
                  let firstWeek = -1, lastWeek = -1;
                  allWeeks.forEach((week, wi) => {
                    const hasDay = week.some(d => {
                      if (!d) return false;
                      const date = new Date(d.dateStr);
                      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
                    });
                    if (hasDay) { if (firstWeek === -1) firstWeek = wi; lastWeek = wi; }
                  });
                  return { name: monthName, start: firstWeek, end: lastWeek + 1, monthIndex: targetMonth };
                }).filter(p => p.start !== -1);
                
                return (
                  <div style={{display:"flex"}}>
                    {/* Days of week labels */}
                    <div style={{display:"flex",flexDirection:"column",marginRight:12}}>
                      <div style={{height:24,fontSize:10,fontWeight:400,color:T.textMut,marginBottom:0}}></div>
                      {dayLabels.map(day => (
                        <div 
                          key={day}
                          style={{
                            height:28,
                            marginBottom:3,
                            display:"flex",
                            alignItems:"center",
                            fontSize:12,
                            fontWeight:400,
                            color:T.textMut,
                            width:40
                          }}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar grid */}
                    <div>
                      {/* Month labels */}
                      <div style={{display:"flex",gap:0,marginBottom:8}}>
                        {monthPositions.map((pos, idx) => {
                          const weeksCount = pos.end - pos.start;
                          return (
                            <div
                              key={`month-label-${idx}`}
                              data-month={pos.monthIndex}
                              style={{
                                fontSize:11,
                                fontWeight:400,
                                color:T.textMut,
                                display:"flex",
                                gap:0,
                                width:(weeksCount * 31),
                                alignItems:"center",
                                justifyContent:"center"
                              }}
                            >
                              {pos.name}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Heatmap grid */}
                      <div>
                        {dayLabels.map((dayLabel, dayIdx) => (
                          <div key={`row-${dayIdx}`} style={{display:"flex",gap:3,marginBottom:3}}>
                            {allWeeks.map((week, weekIdx) => {
                              const day = week[dayIdx];
                              if (!day) {
                                return (
                                  <div
                                    key={`empty-${weekIdx}`}
                                    style={{
                                      width:28,
                                      height:28,
                                      background:"transparent",
                                      borderRadius:4,
                                      flexShrink:0
                                    }}
                                  />
                                );
                              }
                              
                              return (
                                <div
                                  key={`${weekIdx}-${dayIdx}`}
                                  onClick={() => {
                                    // TODO: Open daily checklist for this date
                                    console.log('Clicked:', day.dateStr, 'Discipline:', day.percentage + '%');
                                  }}
                                  style={{
                                    width:28,
                                    height:28,
                                    background: day.color || '#F1F5F9',
                                    borderRadius:4,
                                    cursor:"pointer",
                                    flexShrink:0,
                                    transition:"all 0.2s",
                                    border: 'none',
                                    opacity: 1
                                  }}
                                  title={`${day.dateStr}: ${day.percentage}% discipline (${day.rulesRespected}/${day.totalRules} rules)`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>

            {/* Legend */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:20,fontSize:11,color:T.textMut}}>
              <span>Moins</span>
              {[
                '#DCFCE7',
                '#86EFAC',
                '#4ADE80',
                '#22C55E',
                '#10A37F'
              ].map((color, i) => (
                <div
                  key={i}
                  style={{
                    width:16,
                    height:16,
                    background:color,
                    borderRadius:2,
                    border:'none'
                  }}
                />
              ))}
              <span>Plus</span>
            </div>
          </div>
        </div>

        {/* RULES TABLE */}
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
              <thead>
                <tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colRule")}</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colType")}</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colCondition")}</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colStreak")}</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colAvgPerf")}</th>
                  <th style={{padding:"10px 12px",textAlign:"center",fontSize:10,fontWeight:600,color:T.textMut,textTransform:"uppercase"}}>{t("disc.colFollowRate")}</th>
                </tr>
              </thead>
              <tbody>
                {allRules.map((rule, i) => {
                  const ruleData = {
                    "journal": { type: "Auto", condition: disciplineRules.journalTime, ruleKey: "journal" },
                    "strategy": { type: "Auto", condition: "—", ruleKey: "strategy" },
                    "stoploss": { type: "Auto", condition: "—", ruleKey: "stoploss" },
                    "maxLossPerTrade": { type: "Auto", condition: `${getCurrencySymbol()}${disciplineRules.maxLossPerTrade}`, ruleKey: "maxLossPerTrade" },
                    "maxLossPerDay": { type: "Auto", condition: `${getCurrencySymbol()}${disciplineRules.maxLossPerDay}`, ruleKey: "maxLossPerDay" },
                  };
                  
                  const data = ruleData[rule.id];
                  const days = data ? activeDays[data.ruleKey] : [true,true,true,true,true,true,false];
                  
                  return (
                    <tr key={rule.id} onClick={() => setShowRulesModal(true)} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg,cursor:"pointer",transition:"background 0.2s"}} onMouseEnter={(e) => e.currentTarget.style.background = T.accentBg} onMouseLeave={(e) => e.currentTarget.style.background = (i%2===0?T.white:T.bg)}>
                      <td style={{padding:"10px 12px",fontSize:12,color:rule.status?T.green:T.text,fontWeight:500}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:rule.status?T.green:"#D1D5DB"}}/>
                          {rule.label}
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:11}}>
                        <span style={{background:data?.type==="Auto"?T.accentBg:T.bg,color:data?.type==="Auto"?T.accent:T.text,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600}}>
                          {data?.type||"Manuel"}
                        </span>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:12,color:T.textMut}}>{data?.condition||"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,textAlign:"center",fontWeight:600,color:T.text}}>0</td>
                      <td style={{padding:"10px 12px",fontSize:12,textAlign:"center",color:T.textMut}}>—</td>
                      <td style={{padding:"10px 12px",fontSize:12,textAlign:"center",fontWeight:600,color:rule.status?T.green:T.red}}>
                        {rule.status ? "100%" : "0%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:12,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:T.textSub}}>{allRules.length} rules</div>
            <button
              onClick={() => setShowRulesModal(true)}
              style={{
                padding:"6px 12px",
                background:T.bg,
                border:`1px solid ${T.border}`,
                color:T.text,
                borderRadius:6,
                fontSize:11,
                fontWeight:600,
                cursor:"pointer"
              }}
            >
              ✏️ Edit rules
            </button>
          </div>
        </div>
      </div>

      {/* MODAL MODIFIER REGLES */}
      {showRulesModal && (
        <div onClick={() => setShowRulesModal(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div onClick={(e) => e.stopPropagation()} style={{background:T.white,borderRadius:12,paddingTop:40,paddingRight:40,paddingBottom:40,paddingLeft:40,maxWidth:450,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
            <button 
              onClick={() => setShowRulesModal(false)}
              style={{float:"right",background:"none",border:"none",fontSize:20,cursor:"pointer",color:T.textMut,marginBottom:12}}
            >
              ✕
            </button>

            {/* AUTOMATED RULES WITH ACTIVE DAYS */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Règles journalières</div>

              {allRules.filter(r => ["premarket", "biais", "news", "followall", "journal"].includes(r.id)).map(rule => (
                <div key={rule.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
                  <input 
                    type="checkbox"
                    checked={checkedRuleIds[rule.id] || false}
                    onChange={() => toggleRule(rule.id, allRules)}
                    style={{marginTop:4,width:18,height:18,cursor:"pointer"}}
                  />
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:4}}>{rule.label}</div>
                    <div style={{fontSize:11,color:T.textSub,marginBottom:8}}>{ruleDescriptions[rule.id]}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* MANUAL RULES */}
            {customRules.length > 0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>{t("disc.personalRules")}</div>
                {allRules.filter(r => !["premarket", "biais", "news", "followall", "journal"].includes(r.id)).map(rule => (
                  <div key={rule.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`,marginBottom:12}}>
                    <input 
                      type="checkbox"
                      checked={checkedRuleIds[rule.id] || false}
                      onChange={() => toggleRule(rule.id, allRules)}
                      style={{marginTop:4,width:18,height:18,cursor:"pointer"}}
                    />
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:4}}>{rule.label}</div>
                      <button
                        onClick={() => removeManualRule(rule.uuid || rule.id)}
                        style={{fontSize:11,color:T.accent,background:"none",border:"none",cursor:"pointer",padding:0,marginTop:4}}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ADD NEW RULE */}
            <div style={{marginBottom:24,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <input
                  type="text"
                  placeholder="Ajouter une règle..."
                  value={newManualRule}
                  onChange={(e) => setNewManualRule(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      if (newManualRule.trim()) {
                        addManualRule();
                      }
                    }
                  }}
                  style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,background:T.bg,color:T.text}}
                />
                <button
                  onClick={() => {
                    if (newManualRule.trim()) {
                      addManualRule();
                    }
                  }}
                  style={{padding:"8px 16px",background:"#0D0D0D",color:"white",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* BUTTONS */}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button
                onClick={() => setShowRulesModal(false)}
                style={{
                  padding:"10px 20px",
                  background:"#0D0D0D",
                  color:"white",
                  border:"none",
                  borderRadius:6,
                  fontSize:12,
                  fontWeight:600,
                  cursor:"pointer"
                }}
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

