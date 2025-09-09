// pages/admin.js
import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [tab, setTab] = useState("revoke"); // "revoke" | "admins"
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  // Revoke
  const [revokeKey, setRevokeKey] = useState("");
  const [revokeMsg, setRevokeMsg] = useState("");

  // List keys
  const [keys, setKeys] = useState([]);
  const [keysMsg, setKeysMsg] = useState("");
  const [keysLoading, setKeysLoading] = useState(false);

  // Admin mgmt
  const [admins, setAdmins] = useState([]);
  const [addUser, setAddUser] = useState("");
  const [addPass, setAddPass] = useState("");
  const [removeUser, setRemoveUser] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  function authHeader() {
    if (!user || !pass) return {};
    const token = typeof window !== "undefined" ? btoa(user + ":" + pass) : "";
    return { Authorization: "Basic " + token };
  }

  async function handleRevoke() {
    setRevokeMsg("Processing...");
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ key: revokeKey }),
      });
      const data = await res.json();
      setRevokeMsg(res.ok ? "✅ " + data.msg : "❌ " + (data.msg || "Failed"));
      if (res.ok) loadKeys();
    } catch {
      setRevokeMsg("⚠️ Network error");
    }
  }

  async function loadKeys() {
    if (!user || !pass) { setKeysMsg("Isi Admin username/password dulu di atas."); return; }
    setKeysLoading(true);
    setKeysMsg("Loading...");
    try {
      const res = await fetch("/api/admins/keys/list?limit=100", { headers: authHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Unauthorized");
      setKeys(data.items || []);
      setKeysMsg(data.items && data.items.length ? "" : "Belum ada key aktif.");
    } catch (e) {
      setKeysMsg("❌ " + (e.message || "Load failed"));
    } finally {
      setKeysLoading(false);
    }
  }

  // Admin CRUD
  async function loadAdmins() {
    setAdminMsg("Loading admins...");
    try {
      const res = await fetch("/api/admins/list", { headers: authHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Unauthorized");
      setAdmins(data.users || []);
      if (data.users && data.users.length > 0 && !removeUser) setRemoveUser(data.users[0]);
      setAdminMsg("");
    } catch (e) {
      setAdminMsg("❌ " + (e.message || "Load failed"));
    }
  }

  async function addAdmin() {
    if (!addUser || !addPass) { setAdminMsg("Masukkan username & password admin baru."); return; }
    setAdminMsg("Adding...");
    try {
      const res = await fetch("/api/admins/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ username: addUser, password: addPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed");
      setAdminMsg("✅ " + data.msg + " (" + data.username + ")");
      setAddUser(""); setAddPass(""); loadAdmins();
    } catch (e) {
      setAdminMsg("❌ " + (e.message || "Failed"));
    }
  }

  async function removeAdmin() {
    if (!removeUser) { setAdminMsg("Pilih admin yang akan dihapus."); return; }
    setAdminMsg("Removing...");
    try {
      const res = await fetch("/api/admins/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ username: removeUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed");
      setAdminMsg("✅ " + data.msg + " (" + data.username + ")");
      loadAdmins();
    } catch (e) {
      setAdminMsg("❌ " + (e.message || "Failed"));
    }
  }

  useEffect(() => { if (tab === "admins" && user && pass) loadAdmins(); }, [tab, user, pass]);

  const inputStyle = { width: "100%", padding: 12, borderRadius: 10, background: "#0f0f17", color: "#e8defc", border: "1px solid rgba(255,255,255,.08)", marginBottom: 10 };
  const pill = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, marginBottom: 8 };

  function fmtTs(ts) {
    if (!ts) return "-";
    try { return new Date(Number(ts)).toLocaleString(); } catch { return "-"; }
  }

  return (
    <div className="page">
      <div className="bg-aurora" />
      <main className="wrap card">
        <h1 className="title"><span className="brand">Admin</span> Panel</h1>
        <p className="muted">Endpoint admin dilindungi <strong>Basic Auth</strong> + rate limit.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <input style={inputStyle} placeholder="Admin username" value={user} onChange={(e)=>setUser(e.target.value)} />
          <input style={inputStyle} placeholder="Admin password" type="password" value={pass} onChange={(e)=>setPass(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className={tab === "revoke" ? "btn btn-gradient" : "btn btn-ghost"} onClick={()=>setTab("revoke")}>Revoke Key</button>
          <button className={tab === "admins" ? "btn btn-gradient" : "btn btn-ghost"} onClick={()=>setTab("admins")}>Admins</button>
        </div>

        {/* ==== TAB REVOKE ==== */}
        {tab === "revoke" ? (
          <div style={{ marginTop: 16 }}>
            <input style={inputStyle} placeholder="Key yang akan direvoke" value={revokeKey} onChange={(e)=>setRevokeKey(e.target.value)} />
            <button className="btn btn-gradient" onClick={handleRevoke}>Revoke Key</button>
            {revokeMsg ? <div className="note" style={{ marginTop: 10 }}>{revokeMsg}</div> : null}

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <div className="muted" style={{ flex: 1 }}>Key aktif (otomatis hide yang expired)</div>
              <button className="btn btn-ghost" onClick={loadKeys} disabled={keysLoading}>{keysLoading ? "Loading..." : "Refresh"}</button>
            </div>

            <div style={{ marginTop: 8, maxHeight: 320, overflowY: "auto" }}>
              {keysMsg && <div className="note">{keysMsg}</div>}
              {keys.map(function (row) {
                const disp = "FREE-" + row.key.slice(0, 12).toUpperCase();
                const ttlMin = Math.floor(row.ttl / 60);
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
                      <button className="btn" onClick={()=>{ navigator.clipboard.writeText(row.key); }}>Copy</button>
                      <button className="btn btn-ghost" onClick={()=> setRevokeKey(row.key)}>Gunakan</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ==== TAB ADMINS (tetap seperti sebelumnya) ==== */}
        {tab === "admins" ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input style={inputStyle} placeholder="Username baru" value={addUser} onChange={(e)=>setAddUser(e.target.value)} />
              <input style={inputStyle} placeholder="Password baru" type="password" value={addPass} onChange={(e)=>setAddPass(e.target.value)} />
            </div>
            <button className="btn btn-gradient" onClick={addAdmin}>Tambah Admin</button>

            <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
              <select value={removeUser} onChange={(e)=>setRemoveUser(e.target.value)}
                style={{ padding: 12, borderRadius: 10, background:"#0f0f17", color:"#e8defc", border:"1px solid rgba(255,255,255,.08)", flex:1 }}>
                {admins.map(function(name){ return <option key={name} value={name}>{name}</option>; })}
              </select>
              <button className="btn btn-ghost" onClick={loadAdmins}>Refresh</button>
              <button className="btn" onClick={removeAdmin} style={{ background:"rgba(200,40,60,.18)", border:"1px solid rgba(200,40,60,.4)" }}>Hapus</button>
            </div>

            {adminMsg ? <div className="note" style={{ marginTop: 10 }}>{adminMsg}</div> : null}

            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Daftar Admin:</div>
              <div className="keypill" style={{ flexWrap: "wrap" }}>
                {admins.length === 0 ? <span className="muted">Kosong</span> : admins.map(function(name){
                  return <span key={name} className="badge" style={{ marginRight: 6, marginBottom: 6 }}>{name}</span>;
                })}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
