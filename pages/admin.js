// pages/admin.js
import { useState } from "react";


export default function Admin() {
const [key, setKey] = useState("");
const [user, setUser] = useState("");
const [pass, setPass] = useState("");
const [msg, setMsg] = useState("");


const revoke = async () => {
setMsg("Processing...");
try {
const auth = "Basic " + btoa(`${user}:${pass}`);
const res = await fetch("/api/revoke", {
method: "POST",
headers: { "Content-Type": "application/json", Authorization: auth },
body: JSON.stringify({ key }),
});
const data = await res.json();
setMsg(res.ok ? `✅ ${data.msg}` : `❌ ${data.msg}`);
} catch {
setMsg("⚠️ Network error");
}
};


return (
<div className="page">
<div className="bg-aurora" />
<main className="wrap card">
<h1 className="title"><span className="brand">Admin</span> Revoke</h1>
<p className="muted">Halaman ini dibatasi Basic Auth + rate limit oleh middleware.</p>
<input value={key} onChange={(e)=>setKey(e.target.value)} placeholder="Key yang akan direvoke" style={{display:"block", width:"100%", padding:12, marginBottom:10, borderRadius:10, background:"#0f0f17", color:"#e8defc", border:"1px solid rgba(255,255,255,.08)"}}/>
<div style={{display:"flex", gap:8}}>
<input value={user} onChange={(e)=>setUser(e.target.value)} placeholder="Admin username" style={{flex:1, padding:12, borderRadius:10, background:"#0f0f17", color:"#e8defc", border:"1px solid rgba(255,255,255,.08)"}}/>
<input type="password" value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="Admin password" style={{flex:1, padding:12, borderRadius:10, background:"#0f0f17", color:"#e8defc", border:"1px solid rgba(255,255,255,.08)"}}/>
</div>
<button className="btn btn-gradient" onClick={revoke} style={{marginTop:12}}>Revoke Key</button>
{msg && <div className="note" style={{marginTop:10}}>{msg}</div>}
</main>
</div>
);
                                                                                                      }
