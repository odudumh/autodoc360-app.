// Supabase Edge Function: send-reminders (v3 — fixes overdue items never firing)
//
// Runs once a day via a scheduled trigger (set up separately, see README).
// Checks every tracked item's due_date against 30/14/7/1/0-day thresholds,
// PLUS any item that is already overdue (fires daily until marked complete).
// Looks up the vehicle owner's WhatsApp number from the profiles table,
// and sends a message via the free-tier WhatsApp Business Cloud API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

const REMINDER_THRESHOLDS = [30, 14, 7, 1, 0];

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// WhatsApp requires numbers with no "+", spaces, or dashes, e.g. 2348012345678
function cleanPhone(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

async function sendWhatsAppMessage(toPhone: string, message: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log(`[no WhatsApp credentials set, dry-run] Would message ${toPhone}: ${message}`);
    return { ok: false, reason: "no_credentials" };
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanPhone(toPhone),
      type: "text",
      text: { body: message },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("WhatsApp send failed:", JSON.stringify(body));
    return { ok: false, reason: body };
  }
  return { ok: true };
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: items, error } = await supabase
    .from("tracked_items")
    .select("id, category, due_date, vehicle_id, vehicles(name, plate, owner_id)");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let attempted = 0;
  let sent = 0;
  const results: any[] = [];

  for (const item of items ?? []) {
    const days = daysUntil(item.due_date);

    // Fire on exact milestone days (30/14/7/1/0) OR every day once overdue,
    // so a missed item keeps nudging the owner instead of going silent.
    const isOverdue = days < 0;
    const isMilestone = REMINDER_THRESHOLDS.includes(days);
    if (!isOverdue && !isMilestone) continue;

    const vehicle = (item as any).vehicles;
    if (!vehicle?.owner_id) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_number")
      .eq("id", vehicle.owner_id)
      .maybeSingle();

    if (!profile?.phone_number) {
      results.push({ item: item.id, skipped: "no_phone_number" });
      continue;
    }

    const dueText = days === 0
      ? "today"
      : days > 0
        ? `in ${days} day${days === 1 ? "" : "s"}`
        : `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;

    const message = `AutoDoc360 reminder: ${item.category} for ${vehicle.name} (${vehicle.plate}) is ${dueText}. Open the app to mark it complete.`;

    attempted++;
    const result = await sendWhatsAppMessage(profile.phone_number, message);
    if (result.ok) sent++;
    results.push({ item: item.id, phone: profile.phone_number, ...result });
  }

  return new Response(JSON.stringify({ checked: items?.length ?? 0, attempted, sent, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
