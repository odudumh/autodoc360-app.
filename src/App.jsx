import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Car, Plus, X, Check, AlertTriangle, Settings, ShieldCheck, Disc, Wrench,
  Flame, Zap, FileText, Smartphone, MessageCircle, Bell, Trash2, Gauge, Loader2,
  Mail, LogOut, MailCheck, History, Wrench as WrenchIcon, ChevronRight,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const FONT_HEAD = "'Barlow Semi Condensed', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const COLORS = {
  bg: "#F0EFEA", ink: "#16283D", inkSoft: "#4B5A6B", card: "#FFFFFF",
  border: "#DDDBD2", gold: "#C8952A", goldBg: "#FBF1DF", red: "#B23A2F",
  redBg: "#FBE9E7", green: "#3C7A5A", greenBg: "#E7F1EA", navyBg: "#E9EEF3",
};

// months = date interval for the next reminder; km = optional mileage interval
const CATEGORY_META = {
  licence: { label: "Driver's licence", icon: FileText, months: 12, km: null },
  registration: { label: "Vehicle particulars", icon: ShieldCheck, months: 12, km: null },
  insurance: { label: "Insurance", icon: ShieldCheck, months: 12, km: null },
  tyres: { label: "Tyres", icon: Disc, months: 48, km: null },
  oil: { label: "Engine oil change", icon: Gauge, months: 6, km: 5000 },
  service: { label: "Vehicle service", icon: Wrench, months: 6, km: 10000 },
  extinguisher: { label: "Fire extinguisher", icon: Flame, months: 12, km: null },
  plugs: { label: "Spark plugs", icon: Zap, months: 24, km: 20000 },
  custom: { label: "Custom item", icon: FileText, months: 12, km: null },
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
function statusFromDays(days) {
  if (days < 0) return "overdue";
  if (days <= 14) return "soon";
  if (days <= 30) return "month";
  return "ok";
}
function statusFromKm(kmRemaining) {
  if (kmRemaining < 0) return "overdue";
  if (kmRemaining <= 300) return "soon";
  if (kmRemaining <= 1000) return "month";
  return "ok";
}
const STATUS_RANK = { overdue: 0, soon: 1, month: 2, ok: 3 };
function worseStatus(a, b) {
  if (!a) return b; if (!b) return a;
  return STATUS_RANK[a] <= STATUS_RANK[b] ? a : b;
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
function formatNaira(n) {
  if (n === null || n === undefined || n === "") return null;
  return `\u20a6${Number(n).toLocaleString("en-NG")}`;
}
function formatKm(n) {
  if (n === null || n === undefined) return null;
  return `${Number(n).toLocaleString("en-NG")} km`;
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

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSendLink() {
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    setSending(true); setError("");
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(), options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (signInError) { setError(signInError.message); return; }
    setSent(true);
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Inter:wght@400;500;600&display=swap');`}</style>
      <div style={{ background: COLORS.card, borderRadius: 14, padding: 32, width: 360, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Car size={22} color="#fff" />
        </div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 22, color: COLORS.ink, marginBottom: 6 }}>AutoDoc360</div>
        {sent ? (
          <>
            <MailCheck size={30} color={COLORS.green} style={{ margin: "12px auto" }} />
            <p style={{ color: COLORS.ink, fontWeight: 500, fontSize: 14.5, marginBottom: 6 }}>Check your email</p>
            <p style={{ color: COLORS.inkSoft, fontSize: 13, lineHeight: 1.5 }}>
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device to log in.
            </p>
          </>
        ) : (
          <>
            <p style={{ color: COLORS.inkSoft, fontSize: 13.5, marginBottom: 18 }}>Sign in with your email \u2014 no password needed.</p>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Mail size={16} color={COLORS.inkSoft} style={{ position: "absolute", left: 12, top: 12 }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email"
                onKeyDown={(e) => { if (e.key === "Enter") handleSendLink(); }}
                style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            {error && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 10, textAlign: "left" }}>{error}</div>}
            <button className="ad-btn" disabled={sending} onClick={handleSendLink}
              style={{ width: "100%", background: COLORS.ink, color: "#fff", padding: "11px 0", borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
              {sending ? "Sending..." : "Send sign-in link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [vehicles, setVehicles] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [completingItem, setCompletingItem] = useState(null);
  const [editingMileage, setEditingMileage] = useState(false);
  const [channels, setChannels] = useState({ app: true, sms: true, whatsapp: true });
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleYear, setNewVehicleYear] = useState("");
  const [newVehicleMileage, setNewVehicleMileage] = useState("");
  const [formError, setFormError] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("oil");
  const [newItemDate, setNewItemDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [completeDate, setCompleteDate] = useState(new Date().toISOString().slice(0, 10));
  const [completeMileage, setCompleteMileage] = useState("");
  const [completeCost, setCompleteCost] = useState("");
  const [completeProvider, setCompleteProvider] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    const { data: vData, error: vErr } = await supabase
      .from("vehicles").select("*").order("created_at", { ascending: true });
    if (vErr) { setErrorMsg(vErr.message); setLoading(false); return; }

    const { data: iData, error: iErr } = await supabase.from("tracked_items").select("*");
    if (iErr) { setErrorMsg(iErr.message); setLoading(false); return; }

    const { data: hData, error: hErr } = await supabase
      .from("service_history").select("*").order("completed_date", { ascending: false });
    if (hErr) { setErrorMsg(hErr.message); setLoading(false); return; }

    const merged = (vData || []).map((v) => ({
      ...v,
      items: (iData || []).filter((it) => it.vehicle_id === v.id),
    }));
    setVehicles(merged);
    setHistory(hData || []);
    if (merged.length > 0 && !activeId) setActiveId(merged[0].id);
    setLoading(false);
  }, [activeId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadData(); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setEditingMileage(false); }, [activeId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setVehicles([]); setHistory([]); setActiveId(null);
  }

  const active = vehicles.find((v) => v.id === activeId) || vehicles[0];

  const rows = useMemo(() => {
    if (!active) return [];
    return active.items
      .map((it) => {
        const meta = CATEGORY_META[it.category] || CATEGORY_META.custom;
        const days = daysUntil(it.due_date);
        let status = statusFromDays(days);
        let kmRemaining = null;
        if (it.due_mileage != null && active.current_mileage != null) {
          kmRemaining = it.due_mileage - active.current_mileage;
          status = worseStatus(status, statusFromKm(kmRemaining));
        }
        return { ...it, days, kmRemaining, status, meta };
      })
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.days - b.days);
  }, [active]);

  const counts = useMemo(() => {
    const c = { overdue: 0, soon: 0, month: 0, ok: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const topAction = rows.length > 0 && rows[0].status !== "ok" ? rows[0] : null;

  const vehicleHistory = useMemo(
    () => (active ? history.filter((h) => h.vehicle_id === active.id) : []),
    [history, active]
  );

  async function handleAddVehicle() {
    if (!newVehicleName.trim() || !newVehiclePlate.trim()) {
      setFormError("Enter a vehicle name and plate number."); return;
    }
    setSaving(true);
    const { data: vRow, error: vErr } = await supabase
      .from("vehicles")
      .insert({
        name: newVehicleName.trim(),
        plate: newVehiclePlate.trim().toUpperCase(),
        owner_id: session.user.id,
        year: newVehicleYear ? Number(newVehicleYear) : null,
        current_mileage: newVehicleMileage ? Number(newVehicleMileage) : null,
      })
      .select().single();
    if (vErr) { setFormError(vErr.message); setSaving(false); return; }

    const startMileage = newVehicleMileage ? Number(newVehicleMileage) : null;
    const itemsToInsert = DEFAULT_TEMPLATE.map((t) => {
      const meta = CATEGORY_META[t.category];
      return {
        vehicle_id: vRow.id,
        category: t.category,
        due_date: isoInMonths(t.months),
        due_mileage: meta.km && startMileage != null ? startMileage + meta.km : null,
      };
    });
    const { error: iErr } = await supabase.from("tracked_items").insert(itemsToInsert);
    if (iErr) { setFormError(iErr.message); setSaving(false); return; }

    setNewVehicleName(""); setNewVehiclePlate(""); setNewVehicleYear(""); setNewVehicleMileage("");
    setFormError(""); setShowAddVehicle(false); setSaving(false);
    setActiveId(vRow.id);
    await loadData();
  }

  async function updateItemDate(itemId, dateStr) {
    await supabase.from("tracked_items").update({ due_date: dateStr }).eq("id", itemId);
    await loadData();
  }

  async function removeItem(itemId) {
    await supabase.from("tracked_items").delete().eq("id", itemId);
    await loadData();
  }

  async function updateVehicleMileage(newMileage) {
    if (newMileage === "" || newMileage === null) { setEditingMileage(false); return; }
    await supabase.from("vehicles").update({ current_mileage: Number(newMileage) }).eq("id", active.id);
    setEditingMileage(false);
    await loadData();
  }

  async function handleAddItem() {
    if (!newItemDate) { setFormError("Pick a due date first."); return; }
    setSaving(true);
    const meta = CATEGORY_META[newItemCategory];
    const { error } = await supabase.from("tracked_items").insert({
      vehicle_id: active.id,
      category: newItemCategory,
      due_date: newItemDate,
      due_mileage: meta.km && active.current_mileage != null ? active.current_mileage + meta.km : null,
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setNewItemDate(""); setFormError(""); setShowAddItem(false);
    await loadData();
  }

  function openCompleteModal(item) {
    setCompletingItem(item);
    setCompleteDate(new Date().toISOString().slice(0, 10));
    setCompleteMileage(active?.current_mileage ? String(active.current_mileage) : "");
    setCompleteCost(""); setCompleteProvider(""); setCompleteNotes(""); setFormError("");
  }

  async function handleCompleteItem() {
    if (!completeDate) { setFormError("Enter the date it was completed."); return; }
    setSaving(true);
    const meta = completingItem.meta;
    const mileageNum = completeMileage ? Number(completeMileage) : null;
    const nextDueDate = addMonths(completeDate, meta.months).toISOString().slice(0, 10);
    const nextDueMileage = meta.km && mileageNum != null ? mileageNum + meta.km : null;

    const { error: histErr } = await supabase.from("service_history").insert({
      vehicle_id: active.id,
      tracked_item_id: completingItem.id,
      category: completingItem.category,
      completed_date: completeDate,
      mileage: mileageNum,
      cost: completeCost ? Number(completeCost) : null,
      provider: completeProvider || null,
      notes: completeNotes || null,
    });
    if (histErr) { setFormError(histErr.message); setSaving(false); return; }

    await supabase.from("tracked_items")
      .update({ due_date: nextDueDate, due_mileage: nextDueMileage })
      .eq("id", completingItem.id);

    if (mileageNum != null && (active.current_mileage == null || mileageNum > active.current_mileage)) {
      await supabase.from("vehicles").update({ current_mileage: mileageNum }).eq("id", active.id);
    }

    setSaving(false);
    setCompletingItem(null);
    await loadData();
  }

  if (session === undefined) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="ad-spin" size={26} color={COLORS.ink} />
        <style>{`.ad-spin { animation: adspin 1s linear infinite; } @keyframes adspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (session === null) return <LoginScreen />;

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
            Make sure migration_v2.sql has been run in your Supabase project.
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="ad-btn" onClick={() => setShowSettings(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, fontSize: 13.5 }}>
              <Settings size={15} /> Reminder settings
            </button>
            <button className="ad-btn" onClick={handleSignOut} title={session?.user?.email}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, fontSize: 13.5 }}>
              <LogOut size={15} />
            </button>
          </div>
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
            {/* Vehicle profile card */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 19, color: COLORS.ink }}>
                  {active.name}{active.year ? ` \u2022 ${active.year}` : ""}
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{active.plate}</span>
                  {editingMileage ? (
                    <input
                      type="number"
                      autoFocus
                      defaultValue={active.current_mileage ?? ""}
                      placeholder="Enter mileage"
                      onBlur={(e) => updateVehicleMileage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                      style={{ width: 110, fontSize: 12.5, padding: "2px 6px", borderRadius: 5, border: `1px solid ${COLORS.border}` }}
                    />
                  ) : (
                    <button className="ad-btn" onClick={() => setEditingMileage(true)}
                      style={{ background: "none", color: COLORS.inkSoft, fontSize: 12.5, padding: 0, textDecoration: "underline", textDecorationStyle: "dotted" }}>
                      {active.current_mileage != null ? `\u00b7 ${formatKm(active.current_mileage)}` : "\u00b7 Add mileage"}
                    </button>
                  )}
                </div>
              </div>
              <button className="ad-btn" onClick={() => setShowHistory(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.navyBg, color: COLORS.ink, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                <History size={14} /> Service history ({vehicleHistory.length})
              </button>
            </div>

            {/* Action Required hero */}
            {topAction && (
              <div style={{ background: STATUS_META[topAction.status].bg, border: `1px solid ${STATUS_META[topAction.status].color}33`, borderRadius: 10, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_META[topAction.status].color, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                    Action required
                  </div>
                  <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17, color: COLORS.ink }}>{topAction.meta.label}</div>
                  <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>
                    {formatDays(topAction.days)} \u00b7 {formatDate(topAction.due_date)}
                    {topAction.kmRemaining != null && ` \u00b7 ${formatKm(topAction.due_mileage)}`}
                  </div>
                </div>
                <button className="ad-btn" onClick={() => openCompleteModal(topAction)}
                  style={{ background: COLORS.ink, color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  Resolve now <ChevronRight size={14} />
                </button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 26 }}>
              {[["overdue", "Overdue"], ["soon", "Due within 14 days"], ["month", "Due within 30 days"], ["ok", "On track"]].map(([key, label]) => (
                <div key={key} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 26, fontFamily: FONT_HEAD, fontWeight: 700, color: STATUS_META[key].color }}>{counts[key]}</div>
                  <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 17, color: COLORS.ink }}>Tracked items</span>
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
                          {formatDate(r.due_date)}{r.due_mileage != null ? ` \u00b7 ${formatKm(r.due_mileage)}` : ""} \u00b7 edit
                        </button>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: sm.color, background: sm.bg, padding: "3px 9px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {r.status === "overdue" && <AlertTriangle size={12} />}
                        {formatDays(r.days)}
                      </div>
                    </div>
                    <button className="ad-btn" onClick={() => openCompleteModal(r)} title="Mark as completed"
                      style={{ background: COLORS.greenBg, color: COLORS.green, width: 34, height: 34, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={16} />
                    </button>
                    <button className="ad-btn" onClick={() => removeItem(r.id)} title="Remove item"
                      style={{ background: "transparent", color: COLORS.inkSoft, width: 34, height: 34, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: COLORS.inkSoft }}>
              Tap the check to log a completed renewal or service, with mileage, cost, and notes saved to your service history.
            </div>
          </>
        )}
      </div>

      {/* Add vehicle modal */}
      {showAddVehicle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
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
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Year (optional)</label>
                <input value={newVehicleYear} onChange={(e) => setNewVehicleYear(e.target.value)} placeholder="2018" type="number"
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Mileage (optional)</label>
                <input value={newVehicleMileage} onChange={(e) => setNewVehicleMileage(e.target.value)} placeholder="85000" type="number"
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {formError && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 8 }}>{formError}</div>}
            <button className="ad-btn" disabled={saving} onClick={handleAddVehicle}
              style={{ width: "100%", background: COLORS.ink, color: "#fff", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 6 }}>
              {saving ? "Adding..." : "Add vehicle"}
            </button>
          </div>
        </div>
      )}

      {/* Add item modal */}
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

      {/* Complete item modal */}
      {completingItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, width: 380, border: `1px solid ${COLORS.border}`, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>
                Complete: {completingItem.meta.label}
              </span>
              <button className="ad-btn" onClick={() => setCompletingItem(null)} style={{ background: "none", color: COLORS.inkSoft }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 16 }}>This gets saved to your service history and schedules the next reminder.</p>

            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Date completed</label>
            <input type="date" value={completeDate} onChange={(e) => setCompleteDate(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />

            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Mileage / odometer (optional)</label>
            <input type="number" value={completeMileage} onChange={(e) => setCompleteMileage(e.target.value)} placeholder="e.g. 185420"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />

            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Cost, NGN (optional)</label>
            <input type="number" value={completeCost} onChange={(e) => setCompleteCost(e.target.value)} placeholder="e.g. 45000"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />

            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Service provider / mechanic (optional)</label>
            <input value={completeProvider} onChange={(e) => setCompleteProvider(e.target.value)} placeholder="e.g. Mike's Auto Garage"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }} />

            <label style={{ fontSize: 12.5, color: COLORS.inkSoft, display: "block", marginBottom: 4 }}>Notes (optional)</label>
            <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} placeholder="Anything worth remembering..." rows={2}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: `1px solid ${COLORS.border}`, marginBottom: 8, fontSize: 14, boxSizing: "border-box", resize: "vertical", fontFamily: FONT_BODY }} />

            <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 }}>
              Next due: {formatDate(addMonths(completeDate || new Date(), completingItem.meta.months).toISOString().slice(0, 10))}
              {completingItem.meta.km && completeMileage ? ` or ${formatKm(Number(completeMileage) + completingItem.meta.km)}` : ""}
            </div>

            {formError && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 8 }}>{formError}</div>}
            <button className="ad-btn" disabled={saving} onClick={handleCompleteItem}
              style={{ width: "100%", background: COLORS.green, color: "#fff", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 6 }}>
              {saving ? "Saving..." : "Save & schedule next reminder"}
            </button>
          </div>
        </div>
      )}

      {/* Service history modal */}
      {showHistory && active && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, width: 420, maxHeight: "80vh", overflowY: "auto", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Service history \u2014 {active.name}</span>
              <button className="ad-btn" onClick={() => setShowHistory(false)} style={{ background: "none", color: COLORS.inkSoft }}><X size={18} /></button>
            </div>
            {vehicleHistory.length === 0 ? (
              <p style={{ color: COLORS.inkSoft, fontSize: 13.5, textAlign: "center", padding: "20px 0" }}>
                Nothing logged yet. Completed items will show up here with date, mileage, and cost.
              </p>
            ) : (
              vehicleHistory.map((h) => {
                const meta = CATEGORY_META[h.category] || CATEGORY_META.custom;
                const Icon = meta.icon;
                return (
                  <div key={h.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: `1px dashed ${COLORS.border}` }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: COLORS.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color={COLORS.green} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.ink }}>{meta.label}</div>
                      <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
                        {formatDate(h.completed_date)}
                        {h.mileage != null ? ` \u00b7 ${formatKm(h.mileage)}` : ""}
                        {h.cost != null ? ` \u00b7 ${formatNaira(h.cost)}` : ""}
                      </div>
                      {h.provider && <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 1 }}>{h.provider}</div>}
                      {h.notes && <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 1, fontStyle: "italic" }}>{h.notes}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,40,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, width: 340, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, color: COLORS.ink }}>Reminder channels</span>
              <button className="ad-btn" onClick={() => setShowSettings(false)} style={{ background: "none", color: COLORS.inkSoft }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 16 }}>
              These preferences are local for now \u2014 wiring them to real SMS/WhatsApp sending is a later build step.
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
