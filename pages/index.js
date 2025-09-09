import React, { useEffect, useState } from "react";

export default function Home() {
  const [isHuman, setIsHuman] = useState(false);
  const [key, setKey] = useState("");
  const [expireAt, setExpireAt] = useState(null);
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(function () { setMessage(""); }, 4000);
    return () => clearTimeout(t);
  }, [message]);

  async function getKey() {
  if (!isHuman) { setMessage("✅ Ceklis dulu 'Aku manusia'."); return; }
  try {
    setCopyStatus("");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}" // kirim body kosong agar pasti POST (beberapa proxy strict)
    });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : { msg: await res.text() };
    if (!res.ok) throw new Error(data.msg || `HTTP ${res.status}`);

    setKey(data.key);
    setExpireAt(data.expireAt);
    try { await navigator.clipboard.writeText(data.key); setCopyStatus("Key tersalin ke clipboard."); }
    catch { setCopyStatus("Salin manual dengan tombol Copy Key."); }
    setMessage("Berhasil: Key dibuat. Berlaku 24 jam.");
  } catch (e) {
    setMessage(String(e.message || e));
  }
}



  async function copyKey() {
    if (!key) return;
    try { await navigator.clipboard.writeText(key); setCopyStatus("Key disalin ulang ✔"); }
    catch { setCopyStatus("Gagal menyalin. Salin manual."); }
  }

  const displayKey = key ? "FREE-" + key.slice(0,12).toUpperCase() : "FREE-XXXXXXXXXXXX";

  return (
    <div className="page">
      <div className="bg-aurora" />
      <header className="wrap"><span className="chip">FREE KEY 24H</span></header>
      <main className="wrap card">
        <h1 className="title"><span className="brand">[Neon HUB]</span> Free Key</h1>
        <p className="muted">Selesaikan verifikasi ceklis sederhana untuk mendapatkan <strong>1 Free Key</strong> yang berlaku selama <strong>24 Jam</strong>.</p>

        <label className="checkbox">
          <input type="checkbox" checked={isHuman} onChange={(e)=>setIsHuman(e.target.checked)} />
          <span className="box" /><span>Aku manusia</span>
        </label>

        <button className="btn btn-gradient" onClick={getKey}>Get Key</button>
        <button className="btn btn-ghost" onClick={copyKey} disabled={!key} style={{cursor: key ? "pointer" : "not-allowed"}}>Copy Key</button>

        <div className="keypill">
          <span className="badge">FREE</span>
          <code className="keytext">{displayKey}</code>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {copyStatus ? <div className="note">{copyStatus}</div> : null}

        <div className="footerline">
          <span className="muted">Expired: {expireAt ? new Date(expireAt).toLocaleString() : "-"}</span>
          <span className="muted">Limit Get Key : <strong>1x / 3 Jam</strong></span>
        </div>

        <a className="discord" href="https://discord.com" target="_blank" rel="noreferrer">NeonHUB ❤️</a>
      </main>
    </div>
  );
}
