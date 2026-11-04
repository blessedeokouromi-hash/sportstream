# SportStream

A free, ad-supported live sports streaming web-app starter with a Node.js backend and responsive frontend.

## Run locally

Requires Node.js 18 or newer. No npm packages are required.

```bash
cp .env.example .env
# Change ADMIN_KEY in .env before exposing the server
npm start
```

Open http://localhost:3000

## Admin API

Send the `X-Admin-Key` header using the `ADMIN_KEY` value.

- `GET /api/admin/overview` — dashboard metrics and current content
- `POST /api/admin/matches` — create a match
- `PATCH /api/admin/matches/:id` — update scores, status, stream URL, teams, etc.
- `DELETE /api/admin/matches/:id` — delete a match
- `POST /api/admin/ads` — create an ad
- `PATCH /api/admin/ads/:id` — update an ad

Example:

```bash
curl -X POST http://localhost:3000/api/admin/matches \
  -H 'Content-Type: application/json' -H 'X-Admin-Key: YOUR_ADMIN_KEY' \
  -d '{"sport":"Football","league":"Premier League","home":"Arsenal","away":"Chelsea","status":"live","streamUrl":"https://your-licensed-provider.example/live/index.m3u8"}'
```

Public endpoints: `GET /api/matches`, `GET /api/ads`, `GET /api/health`, `POST /api/favorites`.

## Important production work before public launch

This is a functional MVP starter, not a production-ready commercial streaming service. The included admin API is protected by a shared secret; it is not a full admin UI or multi-user identity system. JSON storage is suitable only for a small demo. Before launch, add a managed database (PostgreSQL), proper user/admin authentication and authorization, rate limiting, input validation, HTTPS, backups, monitoring, privacy/consent controls, and a CDN/video delivery provider. The sample matches have no streams configured. Only add streams for which SportStream has distribution/broadcast rights. Do not scrape or embed unauthorized broadcasts.

Advertising currently supports banner placements and basic impression/click counting. Video pre-roll ad serving, advertiser billing, fraud prevention, analytics, and consent-aware ad integrations need to be connected to a compliant ad provider. HLS playback uses hls.js from a CDN; Safari may play HLS natively.
