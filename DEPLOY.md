# Jet & Jev Wedding — Deployment Guide

## 🎟️ Token-Based Invitation System (NEW)

Guests can only access the wedding site through a unique personal link.
Without a valid `?invite=<token>` in the URL, they see a locked screen.

---

## Setup Steps

### 1. Generate invitation tokens (run once)

```bash
# Local — tokens will use localhost:3000 (fine for testing)
node generate-tokens.js

# Production — replace with your Render URL
BASE_URL=https://your-site.onrender.com node generate-tokens.js
```

This creates two files:
- `data/tokens.json` — the token database (committed to your repo)
- `guest-links.txt` — copy-paste links to send to each guest (**do not commit**)

### 2. Send each guest their personal link

Open `guest-links.txt` — it lists every guest's name and unique URL.
Send each person only their own link (via WhatsApp, SMS, email, etc.).

### 3. Deploy to Render

- Push to your GitHub repo (include `data/tokens.json`)
- Render auto-deploys on push
- Set environment variables in Render dashboard:
  - `SENDGRID_API_KEY`
  - `SENDGRID_FROM_EMAIL`
  - `RENDER_EXTERNAL_URL` (e.g. `https://your-site.onrender.com`)

---

## Token Flow

```
Host runs generate-tokens.js
  → tokens.json created (claimed: false, rsvpDone: false)

Guest opens their personal link (?invite=abc123)
  → GET /api/validate-token
  → Token status: claimed = true, claimedAt = timestamp

Guest submits RSVP form
  → POST /api/rsvp  (token included in request body)
  → Token status: rsvpDone = true, rsvpAt = timestamp
  → Confirmation emails sent
```

---

## Admin: Check token status

```bash
node admin-tokens.js             # all guests
node admin-tokens.js claimed     # guests who opened their link
node admin-tokens.js rsvp        # guests who submitted RSVP
node admin-tokens.js pending     # guests who haven't opened yet
```

---

## Regenerating tokens

If you need to resend a link (e.g. guest lost theirs):
1. Find their token in `guest-links.txt` or `data/tokens.json`
2. Resend the same link — tokens are permanent, not one-time-use for *viewing*
3. RSVP is one-time only — once `rsvpDone: true`, the form won't resubmit

To reset a guest's RSVP (e.g. they made a mistake):
- Open `data/tokens.json`, find their token, set `rsvpDone: false` and `rsvpAt: null`
- Redeploy (or restart the server if running locally)

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/validate-token?invite=<token>` | GET | Validate token, mark as claimed |
| `/api/token-status?invite=<token>` | GET | Check status without mutating |
| `/api/rsvp` | POST | Submit RSVP (requires `inviteToken` in body) |
| `/api/test` | GET | Health check |
