import { useState, useEffect } from "react";
import {
  signInWithGoogle, signOutUser, onAuth,
  isAdmin, getAllUsers, getAllAdmins,
  promoteToAdmin, removeAdmin, deleteUser,
} from "./firebase";
import {
  calculateRasiNakshatra, getChandrastamamRasi,
  getUpcomingChandrastamamDates, formatDate, RASI_SYMBOLS,
} from "./vedic";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminPage() {
  const [authUser,    setAuthUser]    = useState(undefined); // undefined = loading
  const [adminStatus, setAdminStatus] = useState(null);      // null | true | false
  const [tab,         setTab]         = useState("users");

  const [users,  setUsers]  = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  const [promoteEmail, setPromoteEmail]   = useState("");
  const [promoteStatus, setPromoteStatus] = useState(null);

  const [bulkStatus, setBulkStatus] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Watch Firebase auth state
  useEffect(() => {
    const unsub = onAuth(async (user) => {
      setAuthUser(user);
      if (user) {
        const ok = await isAdmin(user.email);
        setAdminStatus(ok);
        if (ok) loadData();
      } else {
        setAdminStatus(null);
      }
    });
    return unsub;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([getAllUsers(), getAllAdmins()]);
      setUsers(u);
      setAdmins(a);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    setPromoteStatus("loading");
    try {
      await promoteToAdmin(promoteEmail.trim().toLowerCase(), authUser.email);
      setPromoteStatus("success");
      setPromoteEmail("");
      loadData();
    } catch {
      setPromoteStatus("error");
    }
  };

  const handleRemoveAdmin = async (email) => {
    if (email === import.meta.env.VITE_SUPER_ADMIN_EMAIL) return;
    if (!confirm(`Remove admin privileges from ${email}?`)) return;
    await removeAdmin(email);
    loadData();
  };

  const handleDeleteUser = async (phone) => {
    if (!confirm("Delete this user permanently?")) return;
    await deleteUser(phone);
    loadData();
  };

  const handleBulkSMS = async () => {
    if (!users.length) return;
    setBulkLoading(true);
    setBulkStatus(null);
    try {
      // Build payload: calculate upcoming dates for each user on client
      const payload = users.map((u) => {
        const astro    = calculateRasiNakshatra(u.dob, u.birthTime !== "Not provided" ? u.birthTime : "");
        const upcoming = getUpcomingChandrastamamDates(astro.rasi, 3).slice(0, 3);
        return {
          phone:        u.phone,
          name:         u.name,
          rasi:         u.rasi || astro.rasi,
          nakshatra:    u.nakshatra || astro.nakshatra,
          chandraRasi:  u.chandraRasi,
          upcomingDates: upcoming.map((d) => ({
            start: formatDate(d.start),
            end:   formatDate(d.end),
          })),
        };
      });

      const res  = await fetch(`${API}/api/send-sms-bulk`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ users: payload }),
      });
      const data = await res.json();
      setBulkStatus(data.success ? `✓ Sent to ${data.sent} users` : `✗ Error: ${data.error}`);
    } catch (err) {
      setBulkStatus("✗ Network error — check backend");
    }
    setBulkLoading(false);
  };

  // ── RENDER STATES ──────────────────────────────────────────────────────────
  if (authUser === undefined) {
    return <CenteredPage><div className="spinner">☽</div><p>Loading…</p></CenteredPage>;
  }

  if (!authUser) {
    return (
      <CenteredPage>
        <div className="moon-icon">☽</div>
        <h1 style={{ fontFamily:"'Cinzel',serif", color:"var(--accent2)", marginBottom:6 }}>
          Chandrastamam
        </h1>
        <p className="subtitle" style={{ marginBottom:32 }}>Admin Portal</p>
        <div className="card" style={{ maxWidth:360, textAlign:"center" }}>
          <div className="card-icon" style={{ fontSize:"2rem", marginBottom:12 }}>🔐</div>
          <h2 style={{ fontFamily:"'Cinzel',serif", color:"var(--accent2)", marginBottom:8 }}>
            Admin Sign In
          </h2>
          <p className="info-text" style={{ marginBottom:20 }}>
            Sign in with your Google account. Access is granted only to authorised admins.
          </p>
          <button className="btn-google" onClick={signInWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight:10 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </div>
        <a href="/" className="admin-link" style={{ marginTop:20, display:"block" }}>← Back to App</a>
      </CenteredPage>
    );
  }

  if (adminStatus === false) {
    return (
      <CenteredPage>
        <div className="card" style={{ maxWidth:400, textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🚫</div>
          <h2 style={{ fontFamily:"'Cinzel',serif", color:"var(--danger)", marginBottom:8 }}>
            Access Denied
          </h2>
          <p className="info-text">
            <strong>{authUser.email}</strong> does not have admin privileges.
            Contact the super admin to be promoted.
          </p>
          <button className="btn-secondary" onClick={signOutUser}>Sign Out</button>
        </div>
      </CenteredPage>
    );
  }

  // ── ADMIN DASHBOARD ────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header>
        <div className="moon-icon">☽</div>
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Chandrastamam Indicator</p>
        <div className="admin-header-row">
          <img src={authUser.photoURL} alt="" className="avatar" />
          <span className="admin-email">{authUser.email}</span>
          <button className="btn-tiny" onClick={signOutUser}>Sign Out</button>
          <a href="/" className="btn-tiny">← App</a>
        </div>
      </header>

      <main>
        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-num">{users.length}</span>
            <span className="stat-label">Users</span>
          </div>
          <div className="stat">
            <span className="stat-num">{admins.length + 1}</span>
            <span className="stat-label">Admins</span>
          </div>
          <div className="stat">
            <span className="stat-num">{users.filter(u => {
              const d = new Date(u.createdAt);
              return Date.now() - d < 7 * 86400000;
            }).length}</span>
            <span className="stat-label">This Week</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {["users","sms","admins"].map(t => (
            <button
              key={t} className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              { t === "users"  ? "👥 Users"
              : t === "sms"    ? "📱 Send SMS"
              :                  "🔑 Admins" }
            </button>
          ))}
        </div>

        {/* ── USERS TAB ─────────────────────────────────── */}
        {tab === "users" && (
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-icon">👥</span>
              <h2>All Users</h2>
              <button className="btn-tiny ml-auto" onClick={loadData}>↻ Refresh</button>
            </div>
            {loading ? <p className="no-data">Loading…</p>
            : users.length === 0 ? <p className="no-data">No users yet.</p>
            : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>DOB</th>
                      <th>Time</th>
                      <th>Rasi</th>
                      <th>Nakshatra</th>
                      <th>Chandrastamam</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.phone}</td>
                        <td>{u.dob}</td>
                        <td>{u.birthTime}</td>
                        <td>
                          <span className="rasi-tag-sm">
                            {RASI_SYMBOLS[u.rasi]} {u.rasi}
                          </span>
                        </td>
                        <td>{u.nakshatra}</td>
                        <td>
                          <span className="danger-tag">
                            {RASI_SYMBOLS[u.chandraRasi]} {u.chandraRasi}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-icon-danger"
                            title="Delete user"
                            onClick={() => handleDeleteUser(u.phone)}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SMS TAB ───────────────────────────────────── */}
        {tab === "sms" && (
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-icon">📱</span>
              <h2>Send SMS to All Users</h2>
            </div>
            <p className="info-text">
              This will send a personalised Chandrastamam schedule SMS to all{" "}
              <strong>{users.length} registered users</strong>. Each message will include
              their upcoming Chandrastamam dates for the next 3 months.
            </p>
            <div className="warning-box">
              ⚠ Each SMS uses Twilio credits. Ensure you have sufficient balance before sending.
            </div>
            <button
              className="btn-primary btn-danger-fill"
              onClick={handleBulkSMS}
              disabled={bulkLoading || users.length === 0}
            >
              {bulkLoading
                ? "Sending to all users…"
                : `Send SMS to ${users.length} Users 📤`}
            </button>
            {bulkStatus && (
              <div className={`alert ${bulkStatus.startsWith("✓") ? "success" : "error"}`}>
                {bulkStatus}
              </div>
            )}
          </div>
        )}

        {/* ── ADMINS TAB ────────────────────────────────── */}
        {tab === "admins" && (
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-icon">🔑</span>
              <h2>Admin Management</h2>
            </div>

            {/* Promote */}
            <div className="promote-section">
              <h3>Promote New Admin</h3>
              <p className="info-text">Enter the Gmail address of the person you want to grant admin access.</p>
              <div className="promote-row">
                <input
                  type="email"
                  placeholder="user@gmail.com"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePromote()}
                />
                <button
                  className="btn-primary"
                  style={{ width:"auto", padding:"13px 24px" }}
                  onClick={handlePromote}
                  disabled={!promoteEmail.trim() || promoteStatus === "loading"}
                >
                  {promoteStatus === "loading" ? "…" : "Promote"}
                </button>
              </div>
              {promoteStatus === "success" && <div className="alert success">✓ Admin promoted successfully!</div>}
              {promoteStatus === "error"   && <div className="alert error">✗ Failed to promote admin.</div>}
            </div>

            {/* Current admins list */}
            <h3 style={{ marginTop:28, marginBottom:12 }}>Current Admins</h3>

            {/* Super admin row */}
            <div className="admin-row">
              <div className="admin-info">
                <span className="admin-badge super">SUPER</span>
                <span className="admin-name">{import.meta.env.VITE_SUPER_ADMIN_EMAIL}</span>
              </div>
              <span className="admin-meta">via environment config</span>
            </div>

            {admins.map((a) => (
              <div className="admin-row" key={a.email}>
                <div className="admin-info">
                  <span className="admin-badge">ADMIN</span>
                  <span className="admin-name">{a.email}</span>
                </div>
                <div className="admin-row-right">
                  <span className="admin-meta">by {a.promotedBy}</span>
                  <button
                    className="btn-icon-danger"
                    title="Remove admin"
                    onClick={() => handleRemoveAdmin(a.email)}
                  >✕</button>
                </div>
              </div>
            ))}

            {admins.length === 0 && (
              <p className="no-data" style={{ marginTop:12 }}>No additional admins promoted yet.</p>
            )}
          </div>
        )}
      </main>

      <footer>
        <p>Chandrastamam Admin · Vedic Lunar Transit Indicator</p>
      </footer>
    </div>
  );
}

function CenteredPage({ children }) {
  return (
    <div className="app centered-page">
      <main style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:60 }}>
        {children}
      </main>
    </div>
  );
}
