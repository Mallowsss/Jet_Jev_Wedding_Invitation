// server.js — Express server for Render deployment
// FAST RESPONSE: Emails sent in background, doesn't slow down the UI
// Added: Device Binding logic to prevent link sharing & RSVP Updating

const express = require("express");
const path    = require("path");
const fs      = require("fs");
const crypto  = require("crypto"); // Added for generating unique device IDs
const guests  = require("./data/guests.json");

const app  = express();
const PORT = process.env.PORT || 3000;

// SendGrid setup (instead of nodemailer)
const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── Token Store helpers ───────────────────────────────────────────────────────
const TOKENS_FILE = path.join(__dirname, "data", "tokens.json");

function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8")); }
  catch { return {}; }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

function findGuest(submittedName) {
  const norm  = normalize(submittedName);
  const exact = guests.find((g) => normalize(g.name) === norm);
  if (exact) return exact;
  return guests.find((g) => 
    norm.includes(normalize(g.name)) || normalize(g.name).includes(norm)
  ) || null;
}

/** Get seat image URL - looks for /public/seat-images/{name}.jpg */
function getSeatImageUrl(guestName) {
  const filename = guestName.toLowerCase().replace(/\s+/g, "-") + ".jpg";
  const filepath = path.join(__dirname, "public", "seat-images", filename);
  
  if (fs.existsSync(filepath)) {
    return `/seat-images/${filename}`;
  }
  
  // Default placeholder
  return "https://placehold.co/600x400/e8eff5/667686?text=Table+Seating+%F0%9F%A5%82%0A(Chart+coming+soon)";
}

// ── Email HTML ────────────────────────────────────────────────────────────────

function hostEmailHTML({ guestName, email, attendance }) {
  const badge = attendance === "in-person"
    ? `<span style="background:#667686;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">🏛️ In-Person</span>`
    : `<span style="background:#97adc2;color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">💻 Via Zoom</span>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:26px;">New RSVP 💌</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Jet &amp; Jev — June 29, 2026</p>
  </div>
  <div style="padding:28px 32px;">
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:10px 0;color:#878787;width:38%;">Guest</td><td style="padding:10px 0;font-weight:600;color:#595d5c;">${guestName}</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:10px 0;color:#878787;">Email</td><td style="padding:10px 0;color:#595d5c;">${email}</td></tr>
      <tr style="border-top:1px solid #f0f0f0;"><td style="padding:10px 0;color:#878787;">Attendance</td><td style="padding:10px 0;">${badge}</td></tr>
    </table>
  </div>
  <div style="background:#f8f9fa;padding:14px 32px;font-size:11px;color:#aaa;text-align:center;">
    Auto-sent from wedding RSVP system
  </div>
</div>`;
}

function guestConfirmEmailHTML({ guestName, attendance, table, category, seatImageUrl, renderUrl }) {
  const isInPerson = attendance === "in-person";
  const firstName  = guestName.split(" ")[0];
  
  const fullImageUrl = seatImageUrl.startsWith("http") ? seatImageUrl : renderUrl + seatImageUrl;

  const seatBlock = isInPerson ? `
    <div style="background:#f0f4f8;border-radius:10px;padding:22px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;color:#878787;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Assigned Seat</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:700;color:#667686;">Table ${table || "TBA"}</p>
      ${category ? `<p style="margin:6px 0 0;color:#97adc2;font-size:13px;">${category}</p>` : ""}
      <div style="margin-top:18px;">
        <img src="${fullImageUrl}" alt="Seat Assignment" style="width:100%;max-width:600px;border-radius:8px;border:1px solid #d1d1d1;">
        <p style="font-size:11px;color:#bbb;margin:8px 0 0;font-style:italic;">Your seating assignment</p>
      </div>
    </div>` : `
    <div style="background:#f0f4f8;border-radius:10px;padding:22px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 8px;color:#878787;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Joining Online</p>
      <p style="margin:0;font-size:16px;color:#595d5c;">💻 You're joining <strong>via Zoom</strong>!</p>
      <p style="margin:10px 0 0;font-size:13px;color:#878787;">Zoom link will be sent closer to the event.</p>
    </div>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.65);margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">You're Invited</p>
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:32px;">Jet &amp; Jev Wedding</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">June 29, 2026 • City Garden Suites, Manila</p>
  </div>
  <div style="padding:32px;">
    <h2 style="font-family:Georgia,serif;color:#667686;font-size:22px;margin:0 0 8px;">See you there, ${firstName}! 🎉</h2>
    <p style="color:#878787;font-size:15px;margin:0 0 20px;">Your RSVP confirmed. We're excited to celebrate with you!</p>
    ${seatBlock}
    <div style="border-top:1px solid #f0f0f0;padding-top:20px;font-size:14px;color:#878787;line-height:1.9;">
      <p style="margin:0;">📅 <strong>Date:</strong> Monday, June 29, 2026</p>
      <p style="margin:0;">📍 <strong>Venue:</strong> City Garden Suites, Manila</p>
      <p style="margin:0;">⏰ <strong>Ceremony:</strong> 2:30 PM</p>
    </div>

    <div style="margin-top:28px;font-size:14px;color:#595d5c;line-height:1.8;">
      <p style="margin:0 0 12px;">Dear Family and Friends,</p>
      <p style="margin:0 0 12px;">Thank you for celebrating this special occasion with us. Your love, support, and presence mean so much to us.</p>
      <p style="margin:0 0 20px;">As Jehovah's Witnesses, we have chosen to organize our wedding in harmony with our Bible-based beliefs and values. Our desire is for the day to be joyful, dignified, and focused on honoring Jehovah God as we begin our marriage together.</p>

      <div style="background:#f0f4f8;border-radius:10px;padding:20px 24px;margin-bottom:8px;">
        <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:15px;font-weight:600;color:#667686;letter-spacing:0.3px;">Wedding Day Reminders</p>
        <p style="margin:0 0 12px;font-size:13px;color:#878787;">To help us maintain a dignified and enjoyable celebration, we kindly ask our guests to observe the following:</p>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:5px 0;color:#4a7c59;font-weight:700;width:22px;">✓</td><td style="padding:5px 0;color:#595d5c;">Formal and modest attire — strict modesty rules apply; dresses must not be overly revealing or ostentatious</td></tr>
          <tr><td style="padding:5px 0;color:#4a7c59;font-weight:700;">✓</td><td style="padding:5px 0;color:#595d5c;">Family-friendly music and dancing</td></tr>
          <tr><td style="padding:5px 0;color:#4a7c59;font-weight:700;">✓</td><td style="padding:5px 0;color:#595d5c;">Responsible and moderate use of alcohol</td></tr>
          <tr><td style="padding:8px 0 5px;color:#c0392b;font-weight:700;">✗</td><td style="padding:8px 0 5px;color:#595d5c;">No toasts or clinking of glasses</td></tr>
          <tr><td style="padding:5px 0;color:#c0392b;font-weight:700;">✗</td><td style="padding:5px 0;color:#595d5c;">No bouquet toss or garter ceremony</td></tr>
          <tr><td style="padding:5px 0;color:#c0392b;font-weight:700;">✗</td><td style="padding:5px 0;color:#595d5c;">No throwing of rice, confetti, petals, seeds, or sparklers</td></tr>
        </table>

        <p style="margin:14px 0 0;font-size:13px;color:#878787;font-style:italic;">Thank you for helping us make this occasion a joyful and respectful celebration.</p>
      </div>
    </div>
  </div>
  <div style="background:#667686;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.9);font-family:Georgia,serif;font-style:italic;margin:0;font-size:15px;">"Made with love — Jet &amp; Jev"</p>
  </div>
</div>`;
}

function notOnListEmailHTML({ guestName }) {
  const firstName = guestName.split(" ")[0];
  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
  <div style="background:#667686;padding:32px;text-align:center;">
    <h1 style="color:#fff;font-family:Georgia,serif;margin:0;font-size:28px;">Jet &amp; Jev</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">June 29, 2026 • City Garden Suites, Manila</p>
  </div>
  <div style="padding:32px;">
    <h2 style="font-family:Georgia,serif;color:#667686;font-size:20px;margin:0 0 16px;">Thank you, ${firstName}!</h2>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0 0 14px;">We truly appreciate your warm wishes and love. 💙</p>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0 0 14px;">Unfortunately, we have limited seats and our guest list is finalized. We hope you understand.</p>
    <p style="color:#595d5c;font-size:15px;line-height:1.8;margin:0;">We hope to celebrate with you another time soon!</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:24px 0;font-style:italic;color:#878787;font-size:14px;text-align:center;">
      "Though you may not be in the room, you are always in our hearts." 💛
    </div>
  </div>
  <div style="background:#667686;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.9);font-family:Georgia,serif;font-style:italic;margin:0;font-size:15px;">"Made with love — Jet &amp; Jev"</p>
  </div>
</div>`;
}

// ── Async email sender (using SendGrid) ──────────────────────────────────────

async function sendEmailsAsync(params) {
  console.log("📧 Starting email send...");
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY not set in environment variables!");
    return;
  }

  const HOST_EMAIL = "jeverlyn.labasan26@gmail.com";
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "jeverlyn.labasan26@gmail.com";

  try {
    if (params.type === "confirmed") {
      const { guestName, email, attendance, table, category, seatImageUrl, renderUrl, isUpdate } = params;

      // Switch subject line if this is an update
      const hostSubject = isUpdate
        ? `🔄 UPDATED RSVP: ${guestName} (${attendance === "in-person" ? "In-Person" : "Zoom"})`
        : `💌 RSVP: ${guestName} (${attendance === "in-person" ? "In-Person" : "Zoom"})`;
      
      const guestSubject = isUpdate
        ? `🔄 RSVP Updated — Jet & Jev, June 29, 2026`
        : `✅ RSVP Confirmed — Jet & Jev, June 29, 2026`;

      await sgMail.send({
        from: FROM_EMAIL,
        to: HOST_EMAIL,
        subject: hostSubject,
        html: hostEmailHTML({ guestName, email, attendance }),
      });
      console.log(`  ✅ Host email sent to ${HOST_EMAIL}`);

      await sgMail.send({
        from: FROM_EMAIL,
        to: email,
        subject: guestSubject,
        html: guestConfirmEmailHTML({ guestName, attendance, table, category, seatImageUrl, renderUrl }),
      });
      console.log(`  ✅ Guest email sent to ${email}`);
      console.log(`✅ ALL EMAILS SENT for: ${guestName}`);

    } else if (params.type === "not-listed") {
      const { guestName, email, attendance } = params;

      try {
        await sgMail.send({
          from: FROM_EMAIL,
          to: email,
          subject: `Thank you for your RSVP — Jet & Jev`,
          html: notOnListEmailHTML({ guestName }),
        });
        console.log(`  ✅ Guest email sent to ${email}`);
      } catch (err) {
        console.error("❌ Guest email failed:", err.message);
      }

      try {
        await sgMail.send({
          from: FROM_EMAIL,
          to: HOST_EMAIL,
          subject: `⚠️ Unlisted RSVP: ${guestName}`,
          html: hostEmailHTML({ guestName: `${guestName} ⚠️ (NOT ON LIST)`, email, attendance }),
        });
        console.log(`  ✅ Host email sent for unlisted: ${guestName}`);
      } catch (err) {
        console.error("❌ Host email failed:", err.message);
      }
    }
  } catch (err) {
    console.error("❌ EMAIL SEND FAILED!", err.message);
  }
}

// ── Test endpoint ─────────────────────────────────────────────────────────────
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!", timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── TOKEN ENDPOINTS ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/validate-token?invite=<token>&deviceId=<string>
 * Called by the frontend on page load.
 * Validates the token and binds it to the user's specific browser/device.
 */
app.get("/api/validate-token", (req, res) => {
  const { invite, deviceId } = req.query;

  if (!invite) {
    return res.status(400).json({ valid: false, reason: "no_token" });
  }

  const tokens = loadTokens();
  const entry  = tokens[invite];

  if (!entry) {
    return res.status(404).json({ valid: false, reason: "invalid_token" });
  }

  // ── CASE A: First time claiming the token ──
  if (!entry.claimed) {
    // Generate a new, unique ID for this device
    const newDeviceId = crypto.randomBytes(16).toString('hex');
    
    entry.claimed   = true;
    entry.claimedAt = new Date().toISOString();
    entry.deviceId  = newDeviceId; 
    
    tokens[invite]  = entry;
    saveTokens(tokens);
    
    console.log(`🎟️  Token claimed & bound to device: ${entry.name} (${invite.slice(0, 8)}...)`);
    
    return res.json({
      valid:     true,
      deviceId:  newDeviceId, 
      name:      entry.name,
      category:  entry.category,
      table:     entry.table,
      claimed:   entry.claimed,
      rsvpDone:  entry.rsvpDone,
    });
  }

  // ── CASE B: Token already claimed, verify the device ──
  if (entry.claimed) {
    if (!deviceId || deviceId !== entry.deviceId) {
      console.log(`🔒 Blocked access: ${entry.name}'s token opened on a different device.`);
      return res.status(403).json({ valid: false, reason: "already_claimed" });
    }
    
    return res.json({
      valid:     true,
      name:      entry.name,
      category:  entry.category,
      table:     entry.table,
      claimed:   entry.claimed,
      rsvpDone:  entry.rsvpDone,
    });
  }
});

/**
 * GET /api/token-status?invite=<token>
 * Lightweight check — does NOT mutate claimed status.
 */
app.get("/api/token-status", (req, res) => {
  const { invite } = req.query;
  if (!invite) return res.status(400).json({ valid: false });

  const tokens = loadTokens();
  const entry  = tokens[invite];
  if (!entry) return res.status(404).json({ valid: false, reason: "invalid_token" });

  return res.json({
    valid:    true,
    name:     entry.name,
    claimed:  entry.claimed,
    rsvpDone: entry.rsvpDone,
  });
});

// ── RSVP API ──────────────────────────────────────────────────────────────────

app.post("/api/rsvp", async (req, res) => {
  const { name, email, attendance, inviteToken } = req.body;
  
  console.log("=".repeat(60));
  console.log("🎯 RSVP ENDPOINT HIT");
  console.log("   Name:", name);
  console.log("   Email:", email);
  console.log("   Attendance:", attendance);
  console.log("   Token:", inviteToken ? inviteToken.slice(0, 8) + "..." : "none");
  console.log("=".repeat(60));

  if (!name || !email || !attendance) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // ── Token validation ──────────────────────────────────────────
  if (!inviteToken) {
    console.log("❌ No invite token provided");
    return res.status(403).json({ error: "No invitation token provided." });
  }

  const tokens = loadTokens();
  const entry  = tokens[inviteToken];

  if (!entry) {
    console.log("❌ Invalid token");
    return res.status(403).json({ error: "Invalid invitation token." });
  }

  // Check if this is an update or a new RSVP
  const isUpdate = entry.rsvpDone === true;

  // ── Look up guest in database ─────────────────────────────────
  const guest    = findGuest(name);
  const isOnList = !!guest;

  console.log("🔍 Guest lookup result:", isOnList ? "FOUND" : "NOT FOUND");
  if (isOnList) {
    console.log("   Guest:", guest.name, "| Table:", guest.table);
  }

  // Mark RSVP as done and save
  entry.rsvpDone  = true;
  entry.rsvpAt    = new Date().toISOString();
  tokens[inviteToken] = entry;
  saveTokens(tokens);
  console.log(`✅ Token RSVP ${isUpdate ? 'UPDATED' : 'LOCKED'}: ${entry.name}`);

  const renderUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

  // ⚡ RESPOND IMMEDIATELY
  if (isOnList) {
    const { table, category } = guest;
    const seatImageUrl = getSeatImageUrl(guest.name);
    
    res.json({ success: true, onList: true, table, category, isUpdate });
    
    process.nextTick(() => {
      sendEmailsAsync({ 
        type: "confirmed", 
        guestName: name, 
        email, 
        attendance, 
        table, 
        category, 
        seatImageUrl, 
        renderUrl,
        isUpdate
      }).catch(err => console.error("❌ Email failed:", err.message));
    });

  } else {
    res.json({ success: true, onList: false });
    
    process.nextTick(() => {
      sendEmailsAsync({ 
        type: "not-listed", 
        guestName: name, 
        email, 
        attendance 
      }).catch(err => console.error("❌ Email failed:", err.message));
    });
  }
});

// ── Static files (AFTER API routes) ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── Catch-all: serve index.html for any unmatched route ──────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎟️  Token store: ${fs.existsSync(path.join(__dirname, "data", "tokens.json")) ? "✅ Found" : "❌ Not found — run: node generate-tokens.js"}`);
  console.log(`📧 SendGrid: ${process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Not set'}`);
  console.log(`📮 From Email: ${process.env.SENDGRID_FROM_EMAIL || 'jeverlyn.labasan26@gmail.com'}`);
  console.log(`🌐 URL: ${process.env.RENDER_EXTERNAL_URL || 'localhost'}`);
});
