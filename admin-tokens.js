/**
 * admin-tokens.js
 * ─────────────────────────────────────────────────────────────
 * View the status of all guest invitation tokens.
 *
 *   node admin-tokens.js           — show all guests
 *   node admin-tokens.js claimed   — show only guests who opened their link
 *   node admin-tokens.js rsvp      — show only guests who submitted RSVP
 *   node admin-tokens.js pending   — show guests who haven't opened yet
 * ─────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");

const TOKENS_FILE = path.join(__dirname, "data", "tokens.json");

if (!fs.existsSync(TOKENS_FILE)) {
  console.error("❌ tokens.json not found. Run: node generate-tokens.js");
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
const filter = process.argv[2]; // claimed | rsvp | pending | (none = all)

const entries = Object.entries(tokens).map(([token, data]) => ({ token, ...data }));

const filtered = entries.filter(e => {
  if (filter === "claimed")  return e.claimed;
  if (filter === "rsvp")     return e.rsvpDone;
  if (filter === "pending")  return !e.claimed;
  return true;
});

const total   = entries.length;
const claimed = entries.filter(e => e.claimed).length;
const rsvped  = entries.filter(e => e.rsvpDone).length;
const pending = total - claimed;

console.log("\n═══════════════════════════════════════════════════════");
console.log("  🎟️  Jet & Jev — Invitation Token Status");
console.log("═══════════════════════════════════════════════════════");
console.log(`  Total guests : ${total}`);
console.log(`  Link opened  : ${claimed}  (${Math.round(claimed/total*100)}%)`);
console.log(`  RSVP done    : ${rsvped}   (${Math.round(rsvped/total*100)}%)`);
console.log(`  Not opened   : ${pending}`);
console.log("═══════════════════════════════════════════════════════\n");

if (filtered.length === 0) {
  console.log("  No guests match this filter.\n");
} else {
  const colW = [28, 8, 9, 22, 22];
  const header = [
    "Guest Name".padEnd(colW[0]),
    "Claimed".padEnd(colW[1]),
    "RSVP".padEnd(colW[2]),
    "Claimed At".padEnd(colW[3]),
    "RSVP At".padEnd(colW[4]),
  ].join("  ");

  console.log("  " + header);
  console.log("  " + "─".repeat(header.length));

  for (const e of filtered) {
    const row = [
      e.name.slice(0, colW[0]-1).padEnd(colW[0]),
      (e.claimed  ? "✅" : "⏳").padEnd(colW[1]),
      (e.rsvpDone ? "✅" : "—").padEnd(colW[2]),
      (e.claimedAt ? new Date(e.claimedAt).toLocaleString() : "—").padEnd(colW[3]),
      (e.rsvpAt    ? new Date(e.rsvpAt).toLocaleString()    : "—").padEnd(colW[4]),
    ].join("  ");
    console.log("  " + row);
  }
  console.log();
}

console.log("  Filter options: claimed | rsvp | pending");
console.log("  e.g.  node admin-tokens.js pending\n");
