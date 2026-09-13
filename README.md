# AutoDoc360

A vehicle document and maintenance reminder app — tracks driver's licence,
vehicle particulars, insurance, tyres, oil changes, servicing, fire
extinguisher expiry, spark plugs, and any custom item you add, per vehicle.

This is a real, runnable project (not just a mockup): React + Vite front end,
Supabase as the free database, and a Supabase Edge Function as the daily
reminder engine.

## 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier).
2. Create a new project. Wait ~2 minutes for it to provision.
3. In the Supabase dashboard, go to the **SQL Editor**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `vehicles` and
   `tracked_items` tables.
4. Go to **Project Settings -> API**. Copy the **Project URL** and the
   **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Open `.env` and paste in your Project URL and anon key.

## 3. Install and run locally

You need [Node.js](https://nodejs.org) installed (free). Then:

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`) in your browser.
Add a vehicle and confirm it still shows up after refreshing the page —
that confirms Supabase is saving your data.

## 4. Deploy it for free

1. Push this folder to a new GitHub repository.
2. Go to [vercel.com](https://vercel.com), sign up free, and import the repo.
3. Add the same two environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) in Vercel's project settings.
4. Deploy. You'll get a real `https://...vercel.app` link you can send to
   pilot users. On a phone, they can add it to their home screen like an app.

## 5. Wiring up real reminders (next step)

The daily reminder engine lives in
`supabase/functions/send-reminders/index.ts`. Right now it calculates which
items are due and logs the message — it doesn't send anything yet, because
sending requires two more free/low-cost pieces:

1. **A way to know who owns each vehicle and their phone number.** This
   needs login. Supabase supports free phone-number (OTP) auth — add a
   `profiles` table linked to `auth.users`, and an `owner_id` column on
   `vehicles` (already present in the schema, just unused for now).
2. **A messaging provider.** For WhatsApp, sign up for the free tier of the
   [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp)
   directly through Meta (no middleman fees), and set the `WHATSAPP_TOKEN`
   and `WHATSAPP_PHONE_ID` secrets in your Supabase project. For SMS, a
   Nigeria-friendly option is [Termii](https://termii.com) — swap the
   `sendWhatsAppMessage` function for a call to their API.

Once both exist, deploy the function with the Supabase CLI:

```bash
supabase functions deploy send-reminders
```

Then schedule it to run daily from **Project Settings -> Edge Functions ->
Cron** in the Supabase dashboard (free tier includes scheduled functions at
low volume).

## Project structure

```
autodoc360-app/
├── src/
│   ├── App.jsx            -- main screen: vehicles, tracked items, modals
│   ├── main.jsx            -- React entry point
│   └── supabaseClient.js   -- Supabase connection
├── supabase/
│   ├── schema.sql          -- database tables
│   └── functions/
│       └── send-reminders/ -- daily reminder check (Edge Function)
├── .env.example
├── package.json
└── vite.config.js
```

## What's deliberately left out for now

- **Login** — every visitor currently sees the same shared vehicle list.
  Fine for testing with one phone; add phone-number auth before a real launch.
- **Reminder channel preferences** — the toggle in the app is visual only
  until step 5 above is wired up.
- **Native app / offline support** — this is a web app (installable to a
  home screen). Move to Flutter or React Native later if you need offline
  use or deeper phone integration.
