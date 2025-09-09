// pages/admin.js
import React, { useEffect, useState } from "react";

export default function AdminPage() {
  // Tab
  const [tab, setTab] = useState("revoke"); // "revoke" | "admins"

  // Basic Auth untuk call API admin
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  // Revoke Key
  const [revokeKey, setRevokeKey] = useState("");
  const [revokeMsg, setRevokeMsg] = useState("");

  // Admin management
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
        headers: Object.assign(
          { "Content-Type": "application/json" },
          authHeader()
        ),
        body: JSON.stringify({ key: revokeKey }),
      });
      const data = await res.json();
      setRevokeMsg(res.ok ? "✅ " + data.msg : "❌ " + (data.msg || "Failed"));
    } catch (e) {
      setRevokeMsg("⚠️ Network error");
    }
  }

  async function loadAdmins() {
    setAdminMsg("Loading admins...");
    try {
      const res = await fetch("/api/admins/list", {
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Unauthorized");
      setAdmins(data.users || []);
      if (data.users && data.users.length > 0 && !removeUser) {
        setRemoveUser(data.users[0]);
      }
      setAdminMsg("✅ Loaded");
      setTimeout(function () { setAdminMsg(""); }, 1500);
    } catch (e) {
      setAdminMsg("❌ " + (e.message || "Load failed"));
    }
  }

  async function addAdmin() {
    if (!addUser || !addPass) {
      setAdminMsg("Masukkan username & password admin baru.");
      return;
    }
    setAdminMsg("Adding...");
    try {
      const res = await fetch("/api/admins/add", {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          authHeader()
        ),
        body: JSON.stringify({ username: addUser, password: addPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed");
      setAdminMsg("✅ " + data.msg + " (" + data.username + ")");
      setAddUser("");
      setAddPass("");
      loadAdmins();
    } catch (e) {
      setAdminMsg("❌ " + (e.message || "Failed"));
    }
  }

  async function removeAdmin() {
    if (!removeUser) {
      setAdminMsg("Pilih admin yang akan dihapus.");
      return;
    }
    setAdminMsg("Removing...");
    try {
      const res = await fetch("/api/admins/remove", {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          authHeader()
        ),
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

  // Auto-load admins saat pindah ke tab Admins (kalau sudah isi kredensial)
  useEffect(() => {
    if (tab === "admins" && user && pass) loadAdmins();
  }, [tab, user, pass]);

  // UI helpers
  const inputStyle = {
    width: "100%", padding: 12, borderRadius: 10,
    background: "#0f0f17", color: "#e8defc",
    border: "1px solid rgba(255,255,255,.08)", marginBottom: 10
  };
  const btn = "btn";
  const btnGrad = "btn btn-gradient";
  const btnGhost = "btn btn-ghost";

  return (
    <div className="page">
      <div className="bg-aurora" />
      <main className="wrap card">
        <h1 className="title"><span className="brand">Admin</span> Panel</h1>
        <p className="muted">Endpoint admin dilindungi <strong>Basic Auth</strong> + rate limit.</p>

        {/* Kredensial untuk Authorization header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <input style={inputStyle} placeholder="Admin username" value={user} onChange={(e)=>setUser(e.target.value)} />
          <input style={inputStyle} placeholder="Admin password" type="password" value={pass} onChange={(e)=>setPass(e.target.value)} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className={tab === "revoke" ? btnGrad : btnGhost} onClick={()=>setTab("revoke")}>Revoke Key</button>
          <button className={tab === "admins" ? btnGrad : btnGhost} onClick={()=>setTab("admins")}>Admins</button>
        </div>

        {/* === TAB REVOKE === */}
        {tab === "revoke" ? (
          <div style={{ marginTop: 16 }}>
            <input style={inputStyle} placeholder="Key yang akan direvoke" value={revokeKey} onChange={(e)=>setRevokeKey(e.target.value)} />
            <button className={btnGrad} onClick={handleRevoke}>Revoke Key</button>
            {revokeMsg ? <div className="note" style={{ marginTop: 10 }}>{revokeMsg}</div> : null}
          </div>
        ) : null}

        {/* === TAB ADMINS === */}
        {tab === "admins" ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input style={inputStyle} placeholder="Username baru" value={addUser} onChange={(e)=>setAddUser(e.target.value)} />
              <input style={inputStyle} placeholder="Password baru" type="password" value={addPass} onChange={(e)=>setAddPass(e.target.value)} />
            </div>
            <button className={btnGrad} onClick={addAdmin}>Tambah Admin</button>

            <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
              <select
                value={removeUser}
                onChange={(e)=>setRemoveUser(e.target.value)}
                style={{ padding: 12, borderRadius: 10, background:"#0f0f17", color:"#e8defc", border:"1px solid rgba(255,255,255,.08)", flex:1 }}
              >
                {admins.map(function(name){ return <option key={name} value={name}>{name}</option>; })}
              </select>
              <button className={btnGhost} onClick={loadAdmins}>Refresh</button>
              <button className={btn} onClick={removeAdmin} style={{ background:"rgba(200,40,60,.18)", border:"1px solid rgba(200,40,60,.4)" }}>Hapus</button>
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
