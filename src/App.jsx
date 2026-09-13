import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Car, Plus, X, Check, AlertTriangle, Settings, ShieldCheck, Disc, Wrench,
  Flame, Zap, FileText, Smartphone, MessageCircle, Bell, Trash2, Gauge, Loader2,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT_HEAD = "'Barlow Semi Condensed', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const COLORS = {
  bg: "#F0EFEA", ink: "#16283D", inkSoft: "#4B5A6B", card: "#FFFFFF",
  border: "#DDDBD2", gold: "#C8952A", goldBg: "#FBF1DF", red: "#B23A2F",
  redBg: "#FBE9E7", green: "#3C7A5A", greenBg: "#E7F1EA", navyBg: "#E9EEF3",
};

const CATEGORY_META = {
  licence: { label: "Driver's licence", icon: FileText, defaultMonths: 12 },
  registration: { label: "Vehicle particulars", icon: ShieldCheck, defaultMonths: 12 },
  insurance: { label: "Insurance", icon: ShieldCheck, defaultMonths: 12 },
  tyres: { label: "Tyres", icon: Disc, defaultMonths: 48 },
  oil: { label: "Engine oil change", icon: Gauge, defaultMonths: 6 },
  service: { label: "Vehicle service", icon: Wrench, defaultMonths: 6 },
  extinguisher: { label: "Fire extinguisher", icon: Flame, defaultMonths: 12 },
  plugs: { label: "Spark plugs", icon: Zap, defaultMonths: 24 },
  custom: { label: "Custom item", icon: FileText, defaultMonths: 12 },
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function isoInMonths(months) {
  return addMonths(new Date(), months).toISOString().slice(0, 10);
}
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}
function statusOf(days) {
  if (days < 0) return "overdue";
  if (days <= 14) return "soon";
  if (days <= 30) return "month";
  return "ok";
}
const STATUS_META = {
  overdue: { label: "Overdue", color: COLORS.red, bg: COLORS.redBg },
  soon: { label: "Due soon", color: COLORS.gold, bg: COLORS.goldBg },
  month: { label: "Due this month", color: COLORS.ink, bg: COLORS.navyBg },
  ok: { label: "On track", color: COLORS.green, bg: COLORS.greenBg },
};
function formatDays(days) {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const DEFAULT_TEMPLATE = [
  { category: "licence", months: 2 },
  { category: "registration", months: 4 },
  { category: "insurance", months: 5 },
  { category: "tyres", months: 9 },
  { category: "oil", months: 0.4 },
  { category: "service", months: 1 },
  { category: "extinguisher", months: 3 },
  { category: "plugs", months: 14 },
];

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [channels, setChannels] = useState({ app: true, sms: true, whatsapp: true });
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [formError, setFormError] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("oil");
  const [newItemDate, setNewItemDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const { data: vData, error: vErr } = await supabase
      .from("vehicles").select("*").order("created_at", { ascending: true });
    if (vErr) { setErrorMsg(vErr.message); setLoading(false); return; }

    const { data: iData, error: iErr } = await supabase
      .from("tracked_items").select("*");
    if (iErr) { setErrorMsg(iErr.message); setLoading(false); return; }

    const merged = (vData || []).map((v) => ({
      ...v,
      items: (iData || []).filter((it) => it.vehicle_id === v.id),
    }));
    setVehicles(merged);
    if (merged.length > 0 && !activeId) setActiveId(merged[0].id);
    setLoading(false);
  }, [activeId]);

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const active = vehicles.find((v) => v.id === activeId) || vehicles[0];

  const rows = useMemo(() => {
    if (!active) return [];
    return active.items
      .map((it) => {
        const days = daysUntil(it.due_date);
        const meta = CATEGORY_META[it.category] || CATEGORY_META.custom;
        return { ...it, days, status: statusOf(days), meta };
      })
      .sort((a, b) => a.days - b.days);
  }, [active]);

  const counts = useMemo(() => {
    const c = { overdue: 0, soon: 0, month: 0, ok: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  async function handleAddVehicle() {
    if (!newVehicleName.trim() || !newVehiclePlate.trim()) {
      setFormError("Enter a vehicle name and plate number.");
      return;
    }
    setSaving(true);
    const { data: vRow, error: vErr } = await supabase
      .from("vehicles")
      .insert({ name: newVehicleName.trim(), plate: newVehiclePlate.trim().toUpperCase() })
      .select().single();
    if (vErr) { setFormError(vErr.message); setSaving(false); return; }

    const itemsToInsert = DEFAULT_TEMPLATE.map((t) => ({
      vehicle_id: vRow.id, category: t.category, due_date: isoInMonths(t.months),
    }));
    const { error: iErr } = await supabase.from("tracked_items").insert(itemsToInsert);
    if (iErr) { setFormError(iErr.message); setSaving(false); return; }

    setNewVehicleName(""); setNewVehiclePlate(""); setFormError(""); setShowAddVehicle(false);
    setSaving(false);
    setActiveId(vRow.id);
    await loadData();
  }

  async function updateItemDate(itemId, dateStr) {
    await supabase.from("tracked_items").update({ due_date: dateStr }).eq("id", itemId);
    await loadData();
  }

  async function markDone(item) {
    const months = item.meta.defaultMonths;
    await updateItemDate(item.id, isoInMonths(months));
  }

  async function removeItem(itemId) {
    await supabase.from("tracked_items").delete().eq("id", itemId);
    await loadData();
  }

  async function handleAddItem() {
    if (!newItemDate) { setFormError("Pick a due date first."); return; }
    setSaving(true);
    const { error } = await supabase.from("tracked_items").insert({
      vehicle_id: active.id, category: newItemCategory, due_date: newItemDate,
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setNewItemDate(""); setFormError(""); setShowAddItem(false);
    await loadData();
  }

  if (loading) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <Loader2 className="ad-spin" size={26} color={COLORS.ink} />
        <span style={{ color: COLORS.inkSoft, fontSize: 14 }}>Loading your vehicles...</span>
        <style>{`.ad-spin { animation: adspin 1s linear infinite; } @keyframes adspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <AlertTriangle size={28} color={COLORS.red} style={{ marginBottom: 10 }} />
          <p style={{ color: COLORS.ink, fontWeight: 600, marginBottom: 6 }}>Couldn't reach the database</p>
          <p style={{ color: COLORS.inkSoft, fontSize: 13.5 }}>{errorMsg}</p>
          <p style={{ color: COLORS.inkSoft, fontSize: 12.5, marginTop: 12 }}>
            Check that .env has your Supabase URL and anon key, and that supabase/schema.sql has been run in your project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: COLORS.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .ad-btn { cursor: pointer; border: none; font-family: ${FONT_BODY}; }
        .ad-btn:active { transform: scale(0.98); }
        .ad-btn:disabled { opacity: 0.6; cursor: default; }
        input[type="date"] { font-family: ${FONT_BODY}; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Car size={19} color="#fff" />
            </div>
            <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 22, color: COLORS.ink }}>AutoDoc360</span>
          </div>
          <button className="ad-btn" onClick={() => setShowSettings(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, fontSize: 13.5 }}>
            <Settings size={15} /> Reminder settings
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
          {vehicles.map((v) => (
            <button key={v.id} className="ad-btn" onClick={() => setActiveId(v.id)}
              style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 8,
                background: v.id === activeId ? COLORS.ink : COLORS.card,
                color: v.id === activeId ? "#fff" : COLORS.ink,
                border: `1px solid ${v.id === activeId ? COLORS.ink : COLORS.border}`,
                fontSize: 14, fontWeight: 500, textAlign: "left" }}>
              <div style={{ fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11.5, opacity: 0.75 }}>{v.plate}</div>
            </button>
          ))}
          <button className="ad-btn" onClick={() => setShowAddVehicle(true)}
            style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 8, background: "transparent", border: `1px dashed ${COLORS.inkSoft}`, color: COLORS.inkSoft, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Add vehicle
          </button>
        </div>

        {!active ? (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 32, textAlign: "center", color: COLORS.inkSoft }}>
            Add your first vehicle to start tracking documents and maintenance.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 26 }}>
              {[["overdue", "Overdue"], ["soon", "Due within 14 days"], ["month", "Due within 30 days"], ["ok", "On track"]].map(([key, label]) => (
                <div key={key} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 26, fontFamily: FONT_HEAD, fontWeight: 700, color: STATUS_META[key].color }}>{counts[key]}</div>
                  <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 17, color: COLORS.ink }}>Tracked items for {active.name}</span>
              <button className="ad-btn" onClick={() => { setShowAddItem(true); setFormError(""); }}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", color: COLORS.ink, fontSize: 13.5, fontWeight: 500 }}>
                <Plus size={15} /> Add item
              </button>
            </div>

            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
              {rows.length === 0 && (
                <div style={{ padding: 28, textAlign: "center", color: COLORS.inkSoft, fontSize: 14 }}>
                  No items tracked yet. Add one to start getting reminders.
                </div>
              )}
              {rows.map((r, i) => {
                const Icon = r.meta.icon;
                const sm = STATUS_META[r.status];
                const isEditing = editingItem === r.id;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                    borderLeft: `4px solid ${sm.color}`, borderTop: i === 0 ? "none" : `1px dashed ${COLORS.border}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={17} color={sm.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 500, color: COLORS.ink }}>{r.meta.label}</div>
                      {isEditing ? (
                        <input type="date" defaultValue={r.due_date} autoFocus
                          onBlur={(e) => { if (e.target.value) updateItemDate(r.id, e.target.value); setEditingItem(null); }}
                          style={{ marginTop: 4, fontSize: 13, padding: "3px 6px", borderRadius: 6, border: `1px solid ${COLORS.border}` }} />
                      ) : (
                        <button className="ad-btn" onClick={() => setEditingItem(r.id)}
                          style={{ background: "none", color: COLORS.inkSoft, fontSize: 12.5, padding: 0, marginTop: 2 }}>
                          Due {formatDate(r.due_date)} · edit
                        </button>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: sm.color, background: sm.bg, padding: "3px 9px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {r.status === "overdue" && <AlertTriangle size={12} />}
                        {formatDays(r.days)}
                      </div>
                    </div>
                    <button className="ad-btn" onClick={() => markDone(r)} title="Mark as renewed/done"
                      style={{ background: COLORS.greenBg, color: COLORS.green, width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={15} />
                    </button>
                    <button className="ad-btn" onClick={() => removeItem(r.id)} title="Remove item"
                      style={{ background: "transparent", color: COLORS.inkSoft, width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: COLORS.inkSoft }}>
              Tap the check to mark an item renewed — it schedules the next due date automatically. Data is saved to your Supabase project.
            </div>
          </>
        )}
      </div>

      {showAddVehicle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, width: 340, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Add a vehicle</span>
              <button className="ad-btn" onClick={() => setShowAddVehicle(false)} style={{ background: "none", color: COLORS.inkSoft }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Vehicle name</label>
            <input value={newVehicleName} onChange={(e) => setNewVehicleName(e.target.value)} placeholder="e.g. Honda Accord"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />
            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Plate number</label>
            <input value={newVehiclePlate} onChange={(e) => setNewVehiclePlate(e.target.value)} placeholder="e.g. LND-442-KJ"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 8, fontSize: 14, boxSizing: "border-box" }} />
            {formError && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 8 }}>{formError}</div>}
            <button className="ad-btn" disabled={saving} onClick={handleAddVehicle}
              style={{ width: "100%", background: COLORS.ink, color: "#fff", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 6 }}>
              {saving ? "Adding..." : "Add vehicle"}
            </button>
          </div>
        </div>
      )}

      {showAddItem && active && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, width: 340, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Add tracked item</span>
              <button className="ad-btn" onClick={() => setShowAddItem(false)} style={{ background: "none", color: COLORS.inkSoft }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Category</label>
            <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }}>
              {Object.entries(CATEGORY_META).filter(([k]) => k !== "custom").map(([key, m]) => (
                <option key={key} value={key}>{m.label}</option>
              ))}
            </select>
            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Due date</label>
            <input type="date" value={newItemDate} onChange={(e) => setNewItemDate(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 8, fontSize: 14, boxSizing: "border-box" }} />
            {formError && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 8 }}>{formError}</div>}
            <button className="ad-btn" disabled={saving} onClick={handleAddItem}
              style={{ width: "100%", background: COLORS.ink, color: "#fff", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 6 }}>
              {saving ? "Adding..." : "Add item"}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, width: 340, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Reminder channels</span>
              <button className="ad-btn" onClick={() => setShowSettings(false)} style={{ background: "none", color: COLORS.inkSoft }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 16 }}>
              These preferences are local for now — wiring them to real SMS/WhatsApp sending is the next build step (see README).
            </p>
            {[["app", "In-app notifications", Bell], ["sms", "SMS", Smartphone], ["whatsapp", "WhatsApp", MessageCircle]].map(([key, label, Icon]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
                <Icon size={17} color={COLORS.inkSoft} />
                <span style={{ flex: 1, fontSize: 14, color: COLORS.ink }}>{label}</span>
                <input type="checkbox" checked={channels[key]} onChange={() => setChannels((c) => ({ ...c, [key]: !c[key] }))} style={{ width: 17, height: 17 }} />
              </label>
            ))}
            <button className="ad-btn" onClick={() => setShowSettings(false)}
              style={{ width: "100%", background: COLORS.ink, color: "#fff", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 16 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
