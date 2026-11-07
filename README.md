# Doppy

Doppy is a Next.js app for AI-assisted social video discovery.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Create a Groq API key in your Groq account and set `GROQ_API_KEY` in `.env.local`.
   Groq may offer free-tier usage, subject to its current limits and availability.
4. Create a Supabase project, run
   `supabase/migrations/20261107000000_social_connections.sql`, and set the
   server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Register OAuth apps for the social providers you want to enable. Configure
   the callback URLs listed in `.env.example` and add their client credentials.
   TikTok requires HTTPS redirect URIs, so use an HTTPS development tunnel when
   testing locally and set `APP_URL` to that tunnel URL.
   Instagram login requires a professional account and the
   `instagram_business_basic` permission. TikTok uses `user.info.basic`.
   YouTube channel identity lookup uses Google's YouTube read-only scope and may
   require OAuth consent-screen verification before general use.
6. Set `SOCIAL_TOKEN_ENCRYPTION_KEY` to a base64-encoded random 32-byte key.
   Social access tokens are encrypted before storage and are never returned to
   the browser.
7. Start the development server with `npm run dev`, then visit http://localhost:3000.

The chat model can be changed with `GROQ_MODEL`. Never commit `.env.local` or share
API keys. Social connections verify account identities only; Doppy does not import
social posts or videos. Configure `APP_URL` to the canonical deployment URL outside
local development. Until Doppy user sign-in is added, connections are scoped to a
secure browser session cookie; clearing that cookie loses the local account links.
