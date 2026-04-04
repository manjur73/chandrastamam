import { useState } from "react";
import {
  calculateRasiNakshatra,
  getChandrastamamRasi,
  getUpcomingChandrastamamDates,
  formatDate,
  RASI_SYMBOLS,
} from "./vedic";
import { saveUser } from "./firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function UserPage() {
  const [form, setForm] = useState({ name: "", phone: "", dob: "", birthTime: "" });
  const [result, setResult]     = useState(null);
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsStatus, setSmsStatus]   = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCalculate = async () => {
    const { name, phone, dob, birthTime } = form;
    if (!dob || !phone) return;

    const astro       = calculateRasiNakshatra(dob, birthTime);
    const chandraRasi = getChandrastamamRasi(astro.rasi);
    const upcoming    = getUpcomingChandrastamamDates(astro.rasi, 3);

    setResult({ astro, chandraRasi, upcoming });
    setStep(2);

    // Save to Firebase
    setSaving(true);
    try {
      await saveUser({
        name:          name || "Anonymous",
        phone,
        dob,
        birthTime:     birthTime || "Not provided",
        rasi:          astro.rasi,
        rasiEnglish:   astro.rasiEnglish,
        nakshatra:     astro.nakshatra,
        nakshatraLord: astro.nakshatraLord,
        pada:          astro.pada,
        chandraRasi:   chandraRasi?.rasi || "",
        moonDegree:    astro.moonDegree,
      });
    } catch (err) {
      console.error("Firebase save error:", err);
    }
    setSaving(false);
  };

  const handleSendSMS = async () => {
    if (!form.phone || !result) return;
    setSmsLoading(true);
    setSmsStatus(null);
    try {
      const res = await fetch(`${API}/api/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone:        form.phone,
          name:         form.name || "User",
          rasi:         result.astro.rasi,
          nakshatra:    result.astro.nakshatra,
          chandraRasi:  result.chandraRasi?.rasi,
          upcomingDates: result.upcoming.slice(0, 3).map((d) => ({
            start: formatDate(d.start),
            end:   formatDate(d.end),
          })),
        }),
      });
      const data = await res.json();
      setSmsStatus(data.success ? "success" : "error");
    } catch {
      setSmsStatus("error");
    }
    setSmsLoading(false);
  };

  const reset = () => { setStep(1); setResult(null); setSmsStatus(null); };

  return (
    <div className="app">
      <header>
        <div className="moon-icon">☽</div>
        <h1>Chandrastamam</h1>
        <p className="subtitle">Vedic Lunar Transit Indicator</p>
        <a href="/admin" className="admin-link">Admin ↗</a>
      </header>

      <main>
        {step === 1 && (
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-icon">🪐</span>
              <h2>Enter Your Details</h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Your name" value={form.name} onChange={set("name")} />
              </div>

              <div className="form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input type="tel" placeholder="+91 9876543210" value={form.phone} onChange={set("phone")} />
                <span className="hint">Include country code (e.g. +91)</span>
              </div>

              <div className="form-group">
                <label>Date of Birth <span className="required">*</span></label>
                <input
                  type="date" value={form.dob} onChange={set("dob")}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="form-group">
                <label>Birth Time <span className="optional">(optional — improves accuracy)</span></label>
                <input type="time" value={form.birthTime} onChange={set("birthTime")} />
                <span className="hint">Moon shifts ~0.55° per hour — time refines your Nakshatra</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleCalculate}
              disabled={!form.dob || !form.phone}
            >
              Calculate My Chart ✦
            </button>
          </div>
        )}

        {step === 2 && result && (
          <>
            {/* Chart Card */}
            <div className="card fade-in">
              <div className="card-header">
                <span className="card-icon">✨</span>
                <h2>Your Vedic Chart</h2>
                {saving && <span className="saving-badge">saving…</span>}
              </div>

              <div className="profile-row">
                <span className="profile-name">{form.name || "Anonymous"}</span>
                <span className="profile-meta">
                  {form.dob}
                  {form.birthTime && <> · {form.birthTime}</>}
                </span>
              </div>

              <div className="chart-grid">
                <div className="chart-item">
                  <span className="label">Janma Rasi</span>
                  <span className="value">
                    {RASI_SYMBOLS[result.astro.rasi]} {result.astro.rasi}
                  </span>
                  <span className="sub">{result.astro.rasiEnglish}</span>
                </div>

                <div className="chart-item">
                  <span className="label">Nakshatra</span>
                  <span className="value">★ {result.astro.nakshatra}</span>
                  <span className="sub">Pada {result.astro.pada} · Lord: {result.astro.nakshatraLord}</span>
                </div>

                <div className="chart-item">
                  <span className="label">Moon Degree</span>
                  <span className="value">☽ {result.astro.moonDegree}°</span>
                  <span className="sub">Sidereal (Lahiri)</span>
                </div>

                <div className="chart-item highlight-danger">
                  <span className="label">Chandrastamam Rasi</span>
                  <span className="value danger">
                    {RASI_SYMBOLS[result.chandraRasi?.rasi]} {result.chandraRasi?.rasi}
                  </span>
                  <span className="sub">8th house from Janma Rasi · {result.chandraRasi?.rasiEnglish}</span>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="card fade-in">
              <div className="card-header">
                <span className="card-icon">📅</span>
                <h2>Upcoming Chandrastamam</h2>
              </div>
              <p className="info-text">
                Avoid important decisions, travel, contracts, or new ventures during these periods.
                Meditation, prayer and rest are recommended.
              </p>
              {result.upcoming.length === 0 ? (
                <p className="no-data">No upcoming periods found in the next 3 months.</p>
              ) : (
                <div className="dates-list">
                  {result.upcoming.slice(0, 6).map((d, i) => (
                    <div className="date-item" key={i}>
                      <span className="date-badge">{i + 1}</span>
                      <div className="date-info">
                        <span className="date-start">⚠ {formatDate(d.start)}</span>
                        <span className="date-arrow">→ {formatDate(d.end)}</span>
                      </div>
                      <span className="rasi-tag">
                        {RASI_SYMBOLS[d.rasi]} {d.rasi}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SMS Card */}
            <div className="card fade-in">
              <div className="card-header">
                <span className="card-icon">📱</span>
                <h2>SMS Alert</h2>
              </div>
              <p className="info-text">
                Send your Chandrastamam schedule to <strong>{form.phone}</strong>
              </p>
              <button className="btn-primary" onClick={handleSendSMS} disabled={smsLoading}>
                {smsLoading ? "Sending…" : "Send SMS ✉"}
              </button>
              {smsStatus === "success" && <div className="alert success">✓ SMS sent successfully!</div>}
              {smsStatus === "error"   && <div className="alert error">✗ SMS failed — check backend config.</div>}
            </div>

            <button className="btn-secondary" onClick={reset}>← Calculate for another person</button>
          </>
        )}
      </main>

      <footer>
        <p>Vedic (Sidereal) astrology · Lahiri Ayanamsa · Moon-based calculations</p>
      </footer>
    </div>
  );
}
