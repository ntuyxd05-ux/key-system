// pages/admin.js
import React, { useState } from "react";

export default function AdminPage() {
  // ===== STATE =====
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const [keys, setKeys] = useState([]);
  const [keysMsg, setKeysMsg] = useState("");

  const [revokeKey, setRevokeKey] = useState("");
  const [revokeMsg, setRevokeMsg] = useState("");

  // ===== HELPERS =====
  function authHeader() {
    if (!user || !pass) return {};
    try {
      const token = btoa(unescape(encodeURIComponent(`${user}:${pass}`)));
      return { Authorization: `Basic ${token}` };
    } catch {
      const token = btoa(`${user}:${pass}`);
      return { Authorization: `Basic ${token}` };
    }
  }

  function fmtTs(x) {
    if (!x) return "-";
    try {
      return new Date(Number(x)).toLocaleString("id-ID");
    } catch {
      return "-";
    }
  }

  // ===== API =====
  async function loadKeys() {
    setKeysMsg("Loading...");
    try {
      const res = await fetch("/api/admins/keys/list?limit=100", {
        headers: { ...authHeader() },
      });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : { msg: await res.text() };

      if (!res.ok) throw new Error(data.msg || `HTTP ${res.status}`);
      const items = Array.isArray(data.items) ? data.items : [];
      setKeys(items);
      setKeysMsg(items.length ? "" : "Belum ada key aktif.");
    } catch (e) {
      setKeys([]);
      setKeysMsg(`❌ ${e.message || "Load failed"}`);
    }
  }

  async function handleRevoke() {
    if (!revokeKey) {
      setRevokeMsg("Masukkan key yang akan direvoke.");
      return;
    }
    setRevokeMsg("Processing...");
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ key: revokeKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || `HTTP ${res.status}`);
      setRevokeMsg("✅ Key revoked");
      setRevokeKey("");
      await loadKeys();
    } catch (e) {
      setRevokeMsg(`❌ ${e.message || "Failed"}`);
    }
  }

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
      setKeysMsg(`❌ ${e.message || "Delete failed"}`);
    }
  }

  // ===== UI STYLE =====
  const container = {
    maxWidth: 920,
    margin: "40px auto",
    padding: 20,
    borderRadius: 16,
    background: "rgba(20,15,25,.8)",
    border: "1px solid rgba(175,80,255,.25)",
    boxShadow: "0 0 80px rgba(175,80,255,.22)",
  };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const input = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    background: "#0f0f17",
    color: "#e8defc",
    border: "1px solid rgba(255,255,255,.08)",
  };
  const pill = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    background: "rgba(30,20,45,.65)",
    border: "1px solid rgba(160,90,255,.18)",
  };

  // ===== RENDER =====
  return (
    <main style={{ padding: 16 }}>
      <div style={container}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>
          <span style={{ color: "#e984ff" }}>Admin</span> Panel
        </h1>
        <p style={{ opacity: 0.8, marginTop: 6 }}>
          Masukkan kredensial admin (Basic Auth) lalu kelola key di bawah.
        </p>

        {/* credentials */}
        <div style={{ ...grid2, marginTop: 12 }}>
          <input
            style={input}
            placeholder="Admin username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <input
            style={input}
            placeholder="Admin password"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </div>

        {/* revoke box */}
        <div style={{ marginTop: 14 }}>
          <input
            style={input}
            placeholder="Key yang akan direvoke"
            value={revokeKey}
            onChange={(e) => setRevokeKey(e.target.value)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <button className="btn" onClick={handleRevoke}>
              Revoke Key
            </button>
            <button className="btn btn-ghost" onClick={loadKeys}>
              Refresh List
            </button>
          </div>
          {revokeMsg ? (
            <div className="note" style={{ marginTop: 8 }}>{revokeMsg}</div>
          ) : null}
        </div>

        {/* keys list */}
        <div style={{ marginTop: 20 }}>
          {keysMsg ? <div className="note" style={{ marginBottom: 8 }}>{keysMsg}</div> : null}
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
      </div>
    </main>
  );
}
