import express from "express";
import cors from "cors";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", twilio: !!twilioClient });
});

// ── SINGLE SMS ────────────────────────────────────────────────────────────────
app.post("/api/send-sms", async (req, res) => {
  const { phone, name, rasi, nakshatra, chandraRasi, upcomingDates } = req.body;

  if (!phone) return res.status(400).json({ success: false, error: "Phone required" });
  if (!twilioClient) return res.status(503).json({ success: false, error: "Twilio not configured" });

  const dateLines = (upcomingDates || [])
    .map((d, i) => `${i + 1}. ${d.start} → ${d.end}`)
    .join("\n");

  const body = `🌙 Chandrastamam Alert — ${name}

Janma Rasi : ${rasi}
Nakshatra  : ${nakshatra}
Chandrastamam Rasi: ${chandraRasi}

⚠ Upcoming Periods (next 3 months):
${dateLines}

Avoid: important decisions, travel, contracts.
Prefer: rest, prayer, meditation.

– Chandrastamam Indicator`;

  try {
    const msg = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   phone,
    });
    console.log(`[SMS] Sent to ${phone}: ${msg.sid}`);
    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    console.error("[SMS] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── BULK SMS (admin) ──────────────────────────────────────────────────────────
app.post("/api/send-sms-bulk", async (req, res) => {
  const { users } = req.body;

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ success: false, error: "No users provided" });
  }
  if (!twilioClient) {
    return res.status(503).json({ success: false, error: "Twilio not configured" });
  }

  let sent  = 0;
  let failed = 0;
  const errors = [];

  // Send sequentially to avoid Twilio rate limits
  for (const user of users) {
    const { phone, name, rasi, nakshatra, chandraRasi, upcomingDates } = user;
    if (!phone) { failed++; continue; }

    const dateLines = (upcomingDates || [])
      .map((d, i) => `${i + 1}. ${d.start} → ${d.end}`)
      .join("\n");

    const body = `🌙 Chandrastamam Alert — ${name}

Janma Rasi : ${rasi}
Nakshatra  : ${nakshatra}
Chandrastamam Rasi: ${chandraRasi}

⚠ Upcoming Periods:
${dateLines}

Avoid: decisions, travel, contracts.
Prefer: rest, meditation, prayer.

– Chandrastamam Indicator`;

    try {
      const msg = await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to:   phone,
      });
      console.log(`[BULK] Sent to ${phone}: ${msg.sid}`);
      sent++;
    } catch (err) {
      console.error(`[BULK] Failed ${phone}:`, err.message);
      errors.push({ phone, error: err.message });
      failed++;
    }

    // Small delay between messages to respect rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  res.json({
    success: failed === 0,
    sent,
    failed,
    errors: errors.length ? errors : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Chandrastamam backend running on port ${PORT}`);
  console.log(`Twilio: ${twilioClient ? "✓ configured" : "✗ not configured"}`);
});
