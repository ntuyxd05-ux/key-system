// pages/admin.js
import React, { useEffect, useState } from "react";

/**
 * Panel Admin
 * - Basic Auth via input username/password → dikirim sebagai header Authorization
 * - Refresh: GET /api/keys        (harus sudah ada di proyekmu)
 * - Revoke:  POST /api/revoke     (sudah ada)
 * - Admins:  GET/POST/DELETE /api/admins  (opsional, tombol tetap ada)
 *
 * Struktur data key pada list diasumsikan: { key, createdAt, expiresAt, ip, ttl }
 */

export default function AdminPage() {
  // ====== STATE ======
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [revokeKey, setRevokeKey] = useState("");
  const [keys, setKeys] = useState([]);
  const [keysMsg, setKeysMsg] = useState("");
  const [admins, setAdmins] = useState([]);
  const [adminsMsg, setAdminsMsg] = useState("");
  const [showAdmins, setShowAdmins] = useState(false);

  // ====== HELPERS ======
  function authHeader() {
    if (!adminUser || !adminPass) return {};
    try {
      const token = btoa(unescape(encodeURIComponent(`${adminUser}:${adminPass}`)));
      return { Authorization: `Basic ${token}` };
    } catch {
      // fallback sederhana
      const token = btoa(`${adminUser}:${adminPass}`);
      return { Authorization: `Basic ${token}` };
    }
  }

  function fmtTs(ms) {
    if (!ms) return "-";
    try {
      return new Date(Number(ms)).toLocaleString("id-ID");
    } catch {
      return "-";
    }
  }

  // ====== API CALLS ======
  async function loadKeys() {
    setKeysMsg("");
    try {
      const res = await fetch("/api/keys", { headers: { ...authHeader() } });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { msg: await res.text() };
      if (!res.ok) throw new Error(data.msg || `HTTP ${res.status}`);
      setKeys(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setKeys([]);
      setKeysMsg("❌ " + (e.message || "Internal error"));
    }
  }

  async function handleRevoke() {
    if (!revokeKey) return;
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ key: revokeKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || `HTTP ${res.status}`);
      setKeysMsg("✅ Key revoked");
      setRevokeKey("");
      await loadKeys();
    } catch (e) {
      setKeysMsg("❌ " + (e.message || "Internal error"));
    }
  }

  // --- Delete pakai endpoint revoke juga (per item) ---
  async function deleteKey(k) {
    if (!k) return;
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ key: k }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed");
      await loadKeys();
    } catch (e) {
      setKeysMsg("❌ " + (e.message || "Delete failed"));
    }
  }

  // Admins (opsional – tetap dipertahankan agar struktur tidak berubah)
  async function loadAdmins() {
    setAdminsMsg("");
    try {
      const res = await fetch("/api/admins", { headers: { ...authHeader() } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || `HTTP ${res.status}`);
      setAdmins(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setAdmins([]);
      setAdminsMsg("❌ " + (e.message || "Gagal load admins"));
    }
  }

  // ====== EFFECTS ======
  useEffect(() => {
    // otomatis tidak fetch apa pun sampai user isi credential
  }, []);

  // ====== STYLE (ringan) ======
  const panel = {
    maxWidth: 920,
    margin: "48px auto",
    padding: 24,
    background: "rgba(20,15,25,.75)",
    borderRadius: 16,
    boxShadow: "0 0 80px rgba(175, 80, 255, .25)",
    border: "1px solid rgba(175, 80, 255, .25)",
  };
  const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const pill = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    background: "rgba(30, 20, 45, .65)",
    border: "1px solid rgba(160, 90, 255, .18)",
  };

  // ====== RENDER ======
  return (
    <main style={{ padding: 16 }}>
      <div style={panel}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          <span style={{ color: "#e984ff" }}>Admin</span> Panel
        </h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Endpoint admin dilindungi <b>Basic Auth</b> + rate limit.
        </p>

        {/* creds */}
        <div style={row}>
          <input
            className="input"
            placeholder="Admin username"
            value={adminUser}
            onChange={(e) => setAdminUser(e.target.value)}
          />
          <input
            className="input"
            placeholder="Admin password"
            type="password"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
          />
        </div>

        {/* action bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <button className="btn" onClick={handleRevoke}>Revoke Key</button>
          <button className="btn btn-ghost" onClick={() => { setShowAdmins(!showAdmins); if (!showAdmins) loadAdmins(); }}>
            Admins
          </button>
        </div>

        {/* input revoke */}
        <div style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="Key yang akan direvoke"
            value={revokeKey}
            onChange={(e) => setRevokeKey(e.target.value)}
          />
          <button className="btn" style={{ width: "100%", marginTop: 12 }} onClick={handleRevoke}>
            Revoke Key
          </button>
        </div>

        {/* status */}
        {keysMsg ? (
          <div className="note" style={{ marginTop: 10 }}>
            {keysMsg}
          </div>
        ) : null}

        {/* list keys */}
        <div style={{ marginTop: 22 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            <b>Key aktif</b> (otomatis hide yang expired)
          </div>
          <button className="btn btn-ghost" style={{ width: "100%", marginBottom: 10 }} onClick={loadKeys}>
            Refresh
          </button>

          {keysMsg && keys.length === 0 ? (
            <div className="note">{keysMsg}</div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            {keys.map((row) => {
              const disp = "FREE-" + row.key.slice(0, 12).toUpperCase();
              const ttlMin = Math.max(0, Math.floor((row.ttl || 0) / 60));

              return (
                <div key={row.key} style={pill}>
                  <div style={{ display: "grid" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="badge">FREE</span>
                      <code className="keytext">{disp}</code>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      sisa {ttlMin} menit · dibuat {fmtTs(row.createdAt)} · exp {fmtTs(row.expiresAt)} · ip {row.ip}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn"
                      onClick={() => navigator.clipboard.writeText(row.key)}
                    >
                      Copy
                    </button>

                    <button
                      className="btn btn-ghost"
                      onClick={() => setRevokeKey(row.key)}
                    >
                      Gunakan
                    </button>

                    <button
                      className="btn"
                      onClick={() => deleteKey(row.key)}
                      style={{
                        background: "rgba(200,40,60,.18)",
                        border: "1px solid rgba(200,40,60,.4)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* admins section (optional UI) */}
        {showAdmins ? (
          <div style={{ marginTop: 28 }}>
            <h3 style={{ marginBottom: 8 }}>Admins</h3>
            {adminsMsg ? <div className="note">{adminsMsg}</div> : null}
            <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Total: {admins.length}
            </div>
            <ul style={{ marginTop: 8 }}>
              {admins.map((a) => (
                <li key={a} style={{ marginBottom: 6 }}>
                  <code>{a}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
