// Supabase Edge Function: send-reminders
// Runs once a day (set up as a Scheduled Function in the Supabase dashboard,
// free tier: Project Settings -> Edge Functions -> Cron).
//
// It checks every tracked item's due_date and, for anything hitting the
// 30 / 14 / 7 / 1 day thresholds, sends a WhatsApp message via the free
// WhatsApp Business Cloud API (you can swap in Termii/Africa's Talking for SMS
// the same way). This is a starting point, not a finished integration --
// see README.md "Wiring up real reminders" for the setup steps.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN"); // optional until you set it up
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

const REMINDER_THRESHOLDS = [30, 14, 7, 1, 0];

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

async function sendWhatsAppMessage(toPhone: string, message: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log(`[dry-run, no WhatsApp credentials set] Would message ${toPhone}: ${message}`);
    return;
  }
  await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body: message },
    }),
  });
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: items, error } = await supabase
    .from("tracked_items")
    .select("id, category, label, due_date, vehicle_id, vehicles(name, plate, owner_id)");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const item of items ?? []) {
    const days = daysUntil(item.due_date);
    if (!REMINDER_THRESHOLDS.includes(days)) continue;

    // NOTE: once phone-number auth is added, look up the owner's phone
    // number from auth.users / a profiles table here instead of skipping.
    const vehicle = (item as any).vehicles;
    const message = `AutoDoc360 reminder: ${item.category} for ${vehicle?.name ?? "your vehicle"} (${vehicle?.plate ?? ""}) is due ${
      days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`
    }.`;

    console.log(message); // always logged; replace with real send once phone numbers exist
    // await sendWhatsAppMessage(ownerPhoneNumber, message);
    sent++;
  }

  return new Response(JSON.stringify({ checked: items?.length ?? 0, matched: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
