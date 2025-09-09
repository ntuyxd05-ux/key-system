import { useState } from "react";

export default function Home() {
  const [key, setKey] = useState("");
  const [expireAt, setExpireAt] = useState(null);
  const [probeKey, setProbeKey] = useState("");
  const [probeMsg, setProbeMsg] = useState("");

  const getKey = async () => {
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to generate");
      setKey(data.key);
      setExpireAt(data.expireAt);
    } catch (e) {
      alert(e.message);
    }
  };

  const validateKey = async () => {
    try {
      const res = await fetch(`/api/validate?key=${encodeURIComponent(probeKey)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setProbeMsg("✅ Key valid");
      } else {
        setProbeMsg(`❌ ${data.msg || "Key invalid/expired"}`);
      }
    } catch {
      setProbeMsg("⚠️ Tidak dapat menghubungi server");
    }
  };

  return (
    <div style={{maxWidth: 720, margin: "56px auto", padding: 20, fontFamily: "Inter, system-ui"}}>
      <h1>⚡ Key System (24 Jam)</h1>
      <p>Dapatkan key unik yang otomatis expired dalam 24 jam.</p>

      <button onClick={getKey} style={{padding:"10px 16px", fontSize:16, cursor:"pointer"}}>
        Get Key
      </button>

      {key && (
        <div style={{marginTop:16}}>
          <h3>Your Key</h3>
          <code style={{display:"block", padding:12, background:"#0b0b0b", color:"#9cff9c", borderRadius:8}}>
            {key}
          </code>
          <div style={{opacity:.8, marginTop:8}}>
            Expired at: {new Date(expireAt).toLocaleString()}
          </div>
        </div>
      )}

      <hr style={{margin:"28px 0"}}/>

      <h3>Validate Key</h3>
      <div style={{display:"flex", gap:8}}>
        <input
          value={probeKey}
          onChange={e=>setProbeKey(e.target.value)}
          placeholder="Paste key di sini"
          style={{flex:1, padding:"10px 12px"}}
        />
        <button onClick={validateKey} style={{padding:"10px 16px", fontSize:16}}>
          Validate
        </button>
      </div>
      {probeMsg && <p style={{marginTop:10}}>{probeMsg}</p>}
    </div>
  );
}
