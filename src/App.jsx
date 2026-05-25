import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  gold: "#B8860B", goldLight: "#D4AF37", goldPale: "#FBF0CC",
  green: "#2D6A4F", greenLight: "#52B788",
  cream: "#FDF8EE", sand: "#EAD9A2",
  brown: "#5C3317", brownLight: "#8B5E3C",
  red: "#C0392B", white: "#FFFFFF",
  text: "#2C1810", textLight: "#7A5C4A",
  border: "#D9C49A", bg: "#F7EDD5", cardBg: "#FFFEF7",
};

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
const DB_KEY = "hajj_v2";

const HUSAIN_MEMBERS = [
  {id:1,name:"M.Husain Dewaswala"},{id:2,name:"M.Husain Hakimji"},{id:3,name:"M.Murtaza Raswala"},
  {id:4,name:"Akberali Kota wala"},{id:5,name:"Firoz lokhandwala"},{id:6,name:"Akber Ali Dewaswala"},
  {id:7,name:"M.Ammar Kanchwala"},{id:8,name:"Shabbir Husain Lokhandwala"},{id:9,name:"Shabbir Husain bigodwala"},
  {id:10,name:"Baqir bh chalni wala"},{id:11,name:"Khozema bh Peti wala"},{id:12,name:"Qaidjohar bh dhamangaon"},
  {id:13,name:"Zulfiqar bh Kapasi"},{id:14,name:"Shabbir Husain thekedar"},{id:15,name:"Shk. Mustafa burhani"},
  {id:16,name:"Abidali runderwala"},{id:17,name:"Imran bh Dhamman"},{id:18,name:"Shoeb bh Samrat"},
  {id:19,name:"Husain Malak"},{id:20,name:"Taher shakru"},{id:21,name:"Hasanji Nala wala"},
  {id:22,name:"Shabbir chaati"},{id:23,name:"Shabbir vadgaam"},{id:24,name:"Taher nala"},
  {id:25,name:"Husaina bn hakimji"},{id:26,name:"Arwa bn raswala"},{id:27,name:"Tasneem bn dewaswala"},
  {id:28,name:"Fatema bn kanchwala"},{id:29,name:"Fatema bn lokhandwala"},{id:30,name:"Tasneem bn lokhandwala"},
  {id:31,name:"Sakina bn kotawala"},{id:32,name:"Zahabiyah bn bigodwala"},{id:33,name:"Fatema bn chalni"},
  {id:34,name:"Khadija bn petiwala"},{id:35,name:"Shakera bn dhamangaon"},{id:36,name:"Khadija bn runderawala"},
  {id:37,name:"Mariya bn thekedar"},{id:38,name:"Sabera bn damman"},{id:39,name:"Tahera bn Samrat"},
  {id:40,name:"Farida bn kapasi"},{id:41,name:"Rashida bn shakruwala"},{id:42,name:"Sakina bn Malak"},
  {id:43,name:"Fatema bn Chati"},{id:44,name:"Mariya bn nala wala"},{id:45,name:"Mariya bn vadgam"},
  {id:46,name:"Sakina bn nalawala"},
];

function getDefaultDB() {
  return {
    users: {
      "husain_dewaswala": {
        username: "husain_dewaswala",
        displayName: "Husain Dewaswala",
        password: "7865253",
        members: HUSAIN_MEMBERS,
        events: []
      }
    }
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const def = getDefaultDB();
      saveDBRaw(def);
      return def;
    }
    const parsed = JSON.parse(raw);
    // ensure Husain account always exists with correct password
    if (!parsed.users) parsed.users = {};
    if (!parsed.users["husain_dewaswala"]) {
      parsed.users["husain_dewaswala"] = getDefaultDB().users["husain_dewaswala"];
    } else {
      parsed.users["husain_dewaswala"].password = "7865253";
      if (!parsed.users["husain_dewaswala"].members || parsed.users["husain_dewaswala"].members.length === 0) {
        parsed.users["husain_dewaswala"].members = HUSAIN_MEMBERS;
      }
    }
    return parsed;
  } catch(e) {
    console.error("loadDB error:", e);
    const def = getDefaultDB();
    saveDBRaw(def);
    return def;
  }
}

function saveDBRaw(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch(e) {
    console.error("saveDB error:", e);
  }
}

function serializeDB(db) {
  const out = { users: {} };
  Object.entries(db.users).forEach(([k, u]) => {
    out.users[k] = {
      ...u,
      events: (u.events || []).map(ev => ({
        ...ev,
        arrivedIds: Array.isArray(ev.arrivedIds) ? ev.arrivedIds : [...(ev.arrivedIds || [])]
      }))
    };
  });
  return out;
}

function deserializeDB(db) {
  const out = { ...db, users: {} };
  Object.entries(db.users || {}).forEach(([k, u]) => {
    out.users[k] = {
      ...u,
      events: (u.events || []).map(ev => ({
        ...ev,
        arrivedIds: new Set(ev.arrivedIds || [])
      }))
    };
  });
  return out;
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function fmtDate(s) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
  catch(e) { return s; }
}

// ─── TOAST HOOK ───────────────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type = "ok") => {
    setT({ msg, type });
    setTimeout(() => setT(null), 2600);
  };
  return [t, show];
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(() => deserializeDB(loadDB()));
  const [uid, setUid] = useState(() => sessionStorage.getItem("hajj_uid") || "");
  const [page, setPage] = useState(() => sessionStorage.getItem("hajj_uid") ? "home" : "login");
  const [activeEv, setActiveEv] = useState(null);
  const [toast, showToast] = useToast();

  // persist whenever db changes
  useEffect(() => {
    saveDBRaw(serializeDB(db));
  }, [db]);

  const user = uid ? db.users[uid] : null;

  function patchUser(fn) {
    setDb(prev => {
      const updated = { ...prev, users: { ...prev.users, [uid]: fn(prev.users[uid]) } };
      return updated;
    });
  }

  // AUTH
  function doLogin(name, pass) {
    const slug = slugify(name);
    const u = db.users[slug];
    if (!u) { showToast("Account not found", "err"); return; }
    if (u.password !== pass) { showToast("Wrong password", "err"); return; }
    sessionStorage.setItem("hajj_uid", slug);
    setUid(slug);
    setPage("home");
    showToast("Welcome, " + u.displayName + "!");
  }

  function doRegister(name, pass) {
    const slug = slugify(name);
    if (!name.trim()) { showToast("Enter your name", "err"); return; }
    if (pass.length < 4) { showToast("Password min 4 chars", "err"); return; }
    if (db.users[slug]) { showToast("Username taken", "err"); return; }
    const nu = { username: slug, displayName: name.trim(), password: pass, members: [], events: [] };
    setDb(prev => ({ ...prev, users: { ...prev.users, [slug]: nu } }));
    sessionStorage.setItem("hajj_uid", slug);
    setUid(slug);
    setPage("home");
    showToast("Account created!");
  }

  function doLogout() {
    sessionStorage.removeItem("hajj_uid");
    setUid("");
    setActiveEv(null);
    setPage("login");
  }

  // MEMBERS
  function addMember(name, id) {
    const num = parseInt(id);
    if (!name.trim() || !num) { showToast("Fill name and ID", "err"); return false; }
    const ms = user.members || [];
    if (ms.find(m => m.id === num)) { showToast("ID #" + num + " already exists", "err"); return false; }
    if (ms.find(m => m.name.toLowerCase() === name.toLowerCase())) { showToast("Name already exists", "err"); return false; }
    patchUser(u => ({ ...u, members: [...(u.members||[]), {id:num,name:name.trim()}].sort((a,b)=>a.id-b.id) }));
    showToast(name + " added!");
    return true;
  }

  function deleteMember(id) {
    patchUser(u => ({ ...u, members: u.members.filter(m => m.id !== id) }));
    showToast("Member removed");
  }

  function importExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const existing = [...(user.members || [])];
        let added = 0, skipped = 0;
        rows.forEach(row => {
          const id = parseInt(row[0]);
          const name = String(row[1] || "").trim();
          if (!id || !name) { skipped++; return; }
          if (existing.find(m => m.id === id || m.name.toLowerCase() === name.toLowerCase())) { skipped++; return; }
          existing.push({ id, name });
          added++;
        });
        existing.sort((a,b) => a.id - b.id);
        patchUser(u => ({ ...u, members: existing }));
        showToast("Imported " + added + (skipped ? ", " + skipped + " skipped" : ""));
      } catch(err) {
        console.error(err);
        showToast("Invalid file", "err");
      }
    };
    reader.readAsBinaryString(file);
  }

  // EVENTS
  function createEvent(name, date) {
    if (!name.trim() || !date) { showToast("Fill name and date", "err"); return false; }
    const ev = { id: Date.now(), name: name.trim(), date, arrivedIds: new Set() };
    patchUser(u => ({ ...u, events: [...(u.events||[]), ev] }));
    showToast("Event created!");
    return true;
  }

  function deleteEvent(id) {
    patchUser(u => ({ ...u, events: u.events.filter(e => e.id !== id) }));
    showToast("Event deleted");
  }

  function saveAttendance(evId, ids) {
    patchUser(u => ({
      ...u,
      events: u.events.map(e => e.id === evId ? { ...e, arrivedIds: new Set(ids) } : e)
    }));
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F7EDD5,#EAD9A2)" }}>
      <div style={{ height:4, background:"linear-gradient(90deg,#B8860B,#D4AF37,#2D6A4F,#D4AF37,#B8860B)" }} />

      {toast && (
        <div style={{
          position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",
          zIndex:9999,padding:"11px 22px",borderRadius:50,
          background:toast.type==="err"?"#C0392B":toast.type==="warn"?"#E67E22":"#2D6A4F",
          color:"#fff",fontSize:13,fontWeight:600,
          boxShadow:"0 4px 24px rgba(0,0,0,0.2)",whiteSpace:"nowrap",
          maxWidth:"88vw",textAlign:"center",
          animation:"tin 0.3s ease"
        }}>{toast.msg}</div>
      )}

      <style>{`
        @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        .pg{animation:fadeUp 0.3s ease}
        .bp{background:linear-gradient(135deg,#B8860B,#D4AF37);color:#3a1f00;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;transition:opacity 0.15s,transform 0.12s;box-shadow:0 3px 12px rgba(184,134,11,0.28)}
        .bp:active{transform:scale(0.96);opacity:0.88}
        .bg{background:linear-gradient(135deg,#2D6A4F,#52B788);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;transition:opacity 0.15s,transform 0.12s;box-shadow:0 3px 12px rgba(45,106,79,0.28)}
        .bg:active{transform:scale(0.96)}
        .bs{background:#fff;color:#5C3317;border:2px solid #D9C49A;border-radius:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;transition:all 0.15s}
        .bs:active{transform:scale(0.96)}
        .bd{background:linear-gradient(135deg,#E74C3C,#C0392B);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif}
        .bd:active{transform:scale(0.96)}
        .inp{background:#fff;border:2px solid #D9C49A;border-radius:12px;padding:13px 16px;font-size:15px;color:#2C1810;font-family:Poppins,sans-serif;width:100%;box-sizing:border-box;-webkit-appearance:none;transition:border 0.2s}
        .inp:focus{outline:none;border-color:#B8860B;box-shadow:0 0 0 3px rgba(184,134,11,0.12)}
        .card{background:#FFFEF7;border-radius:20px;box-shadow:0 4px 16px rgba(107,58,42,0.12);border:1px solid rgba(212,175,55,0.18)}
        .mr{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid rgba(212,175,55,0.13);cursor:pointer;transition:background 0.12s;-webkit-tap-highlight-color:rgba(0,0,0,0)}
        .mr:last-child{border-bottom:none}
        .mr:active{background:rgba(212,175,55,0.1)}
        .chk{width:26px;height:26px;border-radius:8px;border:2.5px solid #D9C49A;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.18s;background:#fff}
        .chk.on{background:#2D6A4F;border-color:#2D6A4F}
        .sb{display:flex;align-items:center;background:#fff;border:2px solid #D9C49A;border-radius:12px;padding:0 14px;gap:8px}
        .sb input{border:none;background:transparent;padding:12px 0;font-size:14px;color:#2C1810;font-family:Poppins,sans-serif;flex:1;min-width:0}
        .sb input:focus{outline:none}
        .tb{padding:9px 12px;border-radius:18px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:Poppins,sans-serif;flex:1}
        input[type=date]{color-scheme:light}
        *{-webkit-tap-highlight-color:transparent}
      `}</style>

      {page==="login"    && <LoginPage    onLogin={doLogin}    toReg={()=>setPage("reg")} />}
      {page==="reg"      && <RegPage      onReg={doRegister}   toLogin={()=>setPage("login")} />}
      {page==="home"     && user && <HomePage     user={user} nav={setPage} logout={doLogout} />}
      {page==="members"  && user && <MembersPage  user={user} nav={setPage} onDelete={deleteMember} onImport={importExcel} />}
      {page==="addMem"   && user && <AddMemPage   user={user} nav={setPage} onAdd={addMember} />}
      {page==="events"   && user && <EventsPage   user={user} nav={setPage} onCreate={createEvent} onDelete={deleteEvent}
                                      onOpen={ev=>{ setActiveEv({...ev, arrivedIds:new Set(ev.arrivedIds)}); setPage("attend"); }} />}
      {page==="attend"   && user && activeEv && (
        <AttendPage user={user} ev={activeEv}
          onSave={(ids)=>{ saveAttendance(activeEv.id,ids); showToast("Saved!"); }}
          onBack={()=>{ setActiveEv(null); setPage("events"); }}
          showToast={showToast} />
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, toReg }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", padding:"20px 18px 40px" }}>
      <Hero />
      <div className="card" style={{ padding:26, marginBottom:18 }}>
        <h2 style={{ textAlign:"center", color:C.brown, margin:"0 0 4px", fontSize:20 }}>Welcome Back</h2>
        <p style={{ textAlign:"center", color:C.textLight, fontSize:13, marginBottom:22 }}>Sign in to your leader account</p>
        <Lbl>Full Name</Lbl>
        <input className="inp" style={{ marginBottom:13 }} placeholder="e.g. Husain Dewaswala"
          value={name} onChange={e=>setName(e.target.value)} />
        <Lbl>Password</Lbl>
        <div style={{ position:"relative", marginBottom:22 }}>
          <input className="inp" type={show?"text":"password"} placeholder="Enter password"
            style={{ paddingRight:48 }} value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onLogin(name,pass)} />
          <button onClick={()=>setShow(v=>!v)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:C.textLight }}>{show?"🙈":"👁"}</button>
        </div>
        <button className="bp" style={{ width:"100%", padding:"15px 0", fontSize:15 }} onClick={()=>onLogin(name,pass)}>
          🕌 Sign In
        </button>
      </div>
      <p style={{ textAlign:"center", fontSize:14, color:C.textLight }}>New leader? <span onClick={toReg} style={{ color:C.gold, fontWeight:700, cursor:"pointer" }}>Create Account</span></p>
      <Footer />
    </div>
  );
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
function RegPage({ onReg, toLogin }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [show, setShow] = useState(false);
  function submit() {
    if (!name.trim()) { alert("Enter your full name"); return; }
    if (pass.length < 4) { alert("Password must be at least 4 characters"); return; }
    if (pass !== conf) { alert("Passwords do not match"); return; }
    onReg(name.trim(), pass);
  }
  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", padding:"20px 18px 40px" }}>
      <Hero />
      <div className="card" style={{ padding:26, marginBottom:18 }}>
        <h2 style={{ textAlign:"center", color:C.brown, margin:"0 0 4px", fontSize:20 }}>Create Account</h2>
        <p style={{ textAlign:"center", color:C.textLight, fontSize:13, marginBottom:22 }}>Register as a Group Leader</p>
        <Lbl>Your Full Name</Lbl>
        <input className="inp" style={{ marginBottom:13 }} placeholder="e.g. Ahmed Ali"
          value={name} onChange={e=>setName(e.target.value)} />
        <Lbl>Password</Lbl>
        <div style={{ position:"relative", marginBottom:13 }}>
          <input className="inp" type={show?"text":"password"} placeholder="Create a password"
            style={{ paddingRight:48 }} value={pass} onChange={e=>setPass(e.target.value)} />
          <button onClick={()=>setShow(v=>!v)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:C.textLight }}>{show?"🙈":"👁"}</button>
        </div>
        <Lbl>Confirm Password</Lbl>
        <input className="inp" type="password" style={{ marginBottom:22 }} placeholder="Re-enter password"
          value={conf} onChange={e=>setConf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
        <button className="bp" style={{ width:"100%", padding:"15px 0", fontSize:15 }} onClick={submit}>
          🕋 Create Account
        </button>
      </div>
      <p style={{ textAlign:"center", fontSize:14, color:C.textLight }}>Already have account? <span onClick={toLogin} style={{ color:C.gold, fontWeight:700, cursor:"pointer" }}>Sign In</span></p>
      <Footer />
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomePage({ user, nav, logout }) {
  const total = user.members.length;
  const evs = user.events || [];
  const last = evs[evs.length-1];
  const lastPct = last && total ? Math.round((([...last.arrivedIds]).length/total)*100) : 0;
  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", paddingBottom:40 }}>
      <div style={{ background:"linear-gradient(135deg,#2D6A4F,#1a4a35)", padding:"28px 20px 26px", borderRadius:"0 0 28px 28px", boxShadow:"0 6px 24px rgba(45,106,79,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:11, letterSpacing:2, textTransform:"uppercase", margin:"0 0 4px" }}>🕌 Hajj Attendance</p>
            <h1 style={{ color:"#fff", fontSize:21, fontWeight:700, margin:0 }}>السلام عليكم</h1>
            <p style={{ color:C.goldLight, fontSize:15, fontWeight:600, margin:"4px 0 0" }}>{user.displayName}</p>
          </div>
          <button onClick={logout} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:12, padding:"8px 14px", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>Sign Out</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:20 }}>
          {[["👥","Members",total],["📋","Events",evs.length],["📊","Last",last?lastPct+"%":"—"]].map(([ic,lb,vl])=>(
            <div key={lb} style={{ background:"rgba(255,255,255,0.15)", borderRadius:14, padding:"12px 8px", textAlign:"center" }}>
              <div style={{ fontSize:20 }}>{ic}</div>
              <div style={{ fontSize:20, fontWeight:700, color:"#fff", lineHeight:1.2 }}>{vl}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", marginTop:2 }}>{lb}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign:"center", padding:"22px 0 6px", fontSize:46 }}>🕋</div>
      <p style={{ textAlign:"center", fontSize:12, color:C.textLight, letterSpacing:2, textTransform:"uppercase", marginBottom:22 }}>لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ</p>

      <div style={{ padding:"0 18px", display:"flex", flexDirection:"column", gap:14 }}>
        <MenuCard icon="👥" title="Manage Members" sub={total+" members in group"} col={C.gold} onClick={()=>nav("members")} />
        <MenuCard icon="📋" title="Events & Attendance" sub={evs.length+" events"} col={C.green} onClick={()=>nav("events")} />
      </div>
      <Footer />
    </div>
  );
}

// ─── MEMBERS ──────────────────────────────────────────────────────────────────
function MembersPage({ user, nav, onDelete, onImport }) {
  const [q, setQ] = useState("");
  const [del, setDel] = useState(null);
  const fileRef = useRef(null);
  const list = (user.members||[]).filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || String(m.id).includes(q));
  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", paddingBottom:40 }}>
      <Bar title="Group Members" back={()=>nav("home")} />
      <div style={{ padding:"14px 18px 0" }}>
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <button className="bp" style={{ flex:1, padding:"12px 0", fontSize:14 }} onClick={()=>nav("addMem")}>+ Add Member</button>
          <button className="bs" style={{ flex:1, padding:"12px 0", fontSize:13 }} onClick={()=>fileRef.current.click()}>📊 Import Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0]){onImport(e.target.files[0]);e.target.value="";} }} />
        </div>
        <div style={{ background:"rgba(184,134,11,0.08)", border:"1px solid rgba(184,134,11,0.22)", borderRadius:10, padding:"8px 13px", marginBottom:12, fontSize:12, color:C.brownLight }}>
          📊 Excel format: Column A = ID number · Column B = Name
        </div>
        <div className="sb" style={{ marginBottom:10 }}>
          <span>🔍</span>
          <input placeholder="Search name or number…" value={q} onChange={e=>setQ(e.target.value)} />
          {q&&<span onClick={()=>setQ("")} style={{ cursor:"pointer", color:C.textLight, fontSize:20 }}>×</span>}
        </div>
        <p style={{ fontSize:12, color:C.textLight, marginBottom:10 }}>{list.length} of {(user.members||[]).length} members</p>
      </div>
      <div className="card" style={{ margin:"0 18px", overflow:"hidden" }}>
        {list.length===0 ? (
          <div style={{ padding:40, textAlign:"center", color:C.textLight }}>
            <div style={{ fontSize:38, marginBottom:8 }}>👥</div>
            <p style={{ fontSize:14 }}>{(user.members||[]).length===0?"No members yet.":"No results."}</p>
          </div>
        ) : list.map(m=>(
          <div key={m.id} className="mr">
            <span style={{ width:36,height:36,borderRadius:10,background:C.goldPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.brown,flexShrink:0 }}>{m.id}</span>
            <span style={{ flex:1, fontSize:14, color:C.text, fontWeight:500 }}>{m.name}</span>
            {del===m.id ? (
              <div style={{ display:"flex", gap:6 }}>
                <button className="bd" style={{ padding:"5px 10px", fontSize:12 }} onClick={()=>{onDelete(m.id);setDel(null);}}>Delete</button>
                <button className="bs" style={{ padding:"5px 10px", fontSize:12 }} onClick={()=>setDel(null)}>Cancel</button>
              </div>
            ) : (
              <button onClick={e=>{e.stopPropagation();setDel(m.id);}} style={{ background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:20,padding:"2px 6px",lineHeight:1 }}>✕</button>
            )}
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}

// ─── ADD MEMBER ───────────────────────────────────────────────────────────────
function AddMemPage({ user, nav, onAdd }) {
  const next = (user.members||[]).length > 0 ? Math.max(...user.members.map(m=>m.id))+1 : 1;
  const [id, setId] = useState(String(next));
  const [name, setName] = useState("");
  function submit() {
    if (onAdd(name, id)) { setName(""); setId(String(parseInt(id||0)+1)); }
  }
  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", paddingBottom:40 }}>
      <Bar title="Add Member" back={()=>nav("members")} />
      <div style={{ padding:"20px 18px" }}>
        <div className="card" style={{ padding:24 }}>
          <div style={{ textAlign:"center", fontSize:38, marginBottom:14 }}>👤</div>
          <Lbl>Member ID Number</Lbl>
          <input className="inp" type="number" style={{ marginBottom:13 }} placeholder="e.g. 1"
            value={id} onChange={e=>setId(e.target.value)} />
          <Lbl>Member Full Name</Lbl>
          <input className="inp" style={{ marginBottom:22 }} placeholder="e.g. Ahmed Ali"
            value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
          <button className="bp" style={{ width:"100%", padding:"15px 0", fontSize:15 }} onClick={submit}>
            + Add Member
          </button>
        </div>
        <div style={{ marginTop:14, background:"rgba(45,106,79,0.07)", border:"1px solid rgba(45,106,79,0.2)", borderRadius:12, padding:14, fontSize:13, color:C.green }}>
          💡 You can also import many members at once using Excel from the Members page.
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function EventsPage({ user, nav, onCreate, onDelete, onOpen }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [form, setForm] = useState(false);
  const [del, setDel] = useState(null);
  const total = (user.members||[]).length;
  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", paddingBottom:40 }}>
      <Bar title="Events" back={()=>nav("home")} />
      <div style={{ padding:"14px 18px 0" }}>
        <button className="bp" style={{ width:"100%", padding:"13px 0", fontSize:15, marginBottom:14 }} onClick={()=>setForm(v=>!v)}>
          {form?"✕ Cancel":"+ Create New Event"}
        </button>
        {form && (
          <div className="card" style={{ padding:20, marginBottom:14, animation:"pop 0.2s ease" }}>
            <Lbl>Event Name</Lbl>
            <input className="inp" style={{ marginBottom:12 }} placeholder="e.g. Arafat Day Majlis"
              value={name} onChange={e=>setName(e.target.value)} />
            <Lbl>Date</Lbl>
            <input className="inp" type="date" style={{ marginBottom:16 }}
              value={date} onChange={e=>setDate(e.target.value)} />
            <button className="bg" style={{ width:"100%", padding:"13px 0", fontSize:15 }}
              onClick={()=>{ if(onCreate(name,date)){setName("");setDate("");setForm(false);} }}>
              ✓ Create Event
            </button>
          </div>
        )}
      </div>
      {(user.events||[]).length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:C.textLight }}>
          <div style={{ fontSize:46, marginBottom:12 }}>📋</div>
          <p>No events yet. Create your first one!</p>
        </div>
      ) : (
        <div style={{ padding:"0 18px", display:"flex", flexDirection:"column", gap:12 }}>
          {[...(user.events||[])].reverse().map(ev => {
            const arr = ev.arrivedIds instanceof Set ? ev.arrivedIds.size : (ev.arrivedIds||[]).length;
            const pct = total ? Math.round((arr/total)*100) : 0;
            return (
              <div key={ev.id} className="card" style={{ overflow:"hidden" }}>
                <div style={{ padding:"16px 16px 12px", cursor:"pointer" }} onClick={()=>onOpen(ev)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{ev.name}</p>
                      <p style={{ margin:"3px 0 0", fontSize:12, color:C.textLight }}>📅 {fmtDate(ev.date)}</p>
                    </div>
                    <span style={{ background:pct===100?C.green:C.goldPale, color:pct===100?"#fff":C.brown, fontSize:13, fontWeight:700, padding:"4px 12px", borderRadius:20 }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:"rgba(0,0,0,0.06)", borderRadius:8, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ height:"100%", width:pct+"%", background:"linear-gradient(90deg,#2D6A4F,#52B788)", borderRadius:8, transition:"width 0.4s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.textLight }}>
                    <span>✅ {arr} arrived</span><span>⏳ {total-arr} remaining</span>
                  </div>
                </div>
                <div style={{ borderTop:"1px solid rgba(212,175,55,0.15)", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <button className="bg" style={{ padding:"9px 20px", fontSize:13 }} onClick={()=>onOpen(ev)}>Mark Attendance →</button>
                  {del===ev.id ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="bd" style={{ padding:"6px 12px", fontSize:12 }} onClick={()=>{onDelete(ev.id);setDel(null);}}>Delete</button>
                      <button className="bs" style={{ padding:"6px 12px", fontSize:12 }} onClick={()=>setDel(null)}>No</button>
                    </div>
                  ) : (
                    <button onClick={()=>setDel(ev.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:20 }}>🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Footer />
    </div>
  );
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
function AttendPage({ user, ev, onSave, onBack, showToast }) {
  const [ids, setIds] = useState(new Set(ev.arrivedIds));
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const members = user.members || [];
  const total = members.length;
  const count = ids.size;
  const pct = total ? Math.round((count/total)*100) : 0;

  function toggle(id) {
    setIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      onSave(n);
      return n;
    });
  }

  function markAll() { const a=new Set(members.map(m=>m.id)); setIds(a); onSave(a); showToast("All marked present!"); }
  function clearAll() { setIds(new Set()); onSave(new Set()); showToast("Cleared","warn"); }

  const shown = members.filter(m => {
    const match = m.name.toLowerCase().includes(q.toLowerCase()) || String(m.id).includes(q);
    if (!match) return false;
    if (tab==="arr") return ids.has(m.id);
    if (tab==="rem") return !ids.has(m.id);
    return true;
  });

  return (
    <div className="pg" style={{ maxWidth:400, margin:"0 auto", paddingBottom:40 }}>
      <div style={{ background:"linear-gradient(135deg,#2D6A4F,#1a4a35)", padding:"18px 18px 22px", borderRadius:"0 0 24px 24px", boxShadow:"0 6px 24px rgba(45,106,79,0.3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.18)", border:"none", borderRadius:10, padding:"9px 15px", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700, flexShrink:0 }}>← Back</button>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.name}</p>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.65)" }}>📅 {fmtDate(ev.date)}</p>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
          {[["👥","Total",total],["✅","Arrived",count],["⏳","Remaining",total-count]].map(([ic,lb,vl])=>(
            <div key={lb} style={{ background:"rgba(255,255,255,0.18)", borderRadius:12, padding:"10px 6px", textAlign:"center" }}>
              <div style={{ fontSize:18 }}>{ic}</div>
              <div style={{ fontSize:19, fontWeight:700, color:"#fff" }}>{vl}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)" }}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{ height:7, background:"rgba(255,255,255,0.2)", borderRadius:10, overflow:"hidden", marginBottom:5 }}>
          <div style={{ height:"100%", width:pct+"%", background:"linear-gradient(90deg,#D4AF37,#FBF0CC)", borderRadius:10, transition:"width 0.35s" }} />
        </div>
        <p style={{ color:"rgba(255,255,255,0.75)", fontSize:11, textAlign:"right", margin:0 }}>{pct}% attendance</p>
      </div>

      <div style={{ padding:"14px 18px 0" }}>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <button className="bg" style={{ flex:1, padding:"10px 0", fontSize:13 }} onClick={markAll}>✓ Mark All</button>
          <button className="bs" style={{ flex:1, padding:"10px 0", fontSize:13 }} onClick={clearAll}>↺ Clear All</button>
        </div>
        <div className="sb" style={{ marginBottom:12 }}>
          <span>🔍</span>
          <input placeholder="Search member…" value={q} onChange={e=>setQ(e.target.value)} />
          {q&&<span onClick={()=>setQ("")} style={{ cursor:"pointer",color:C.textLight,fontSize:20 }}>×</span>}
        </div>
        <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,0.55)", borderRadius:14, padding:4, marginBottom:14 }}>
          {[["all","All"],["arr","✅ Arrived"],["rem","⏳ Remaining"]].map(([v,l])=>(
            <button key={v} className="tb" style={{ background:tab===v?"#fff":"transparent", color:tab===v?C.green:C.textLight, boxShadow:tab===v?"0 2px 8px rgba(107,58,42,0.1)":"none" }}
              onClick={()=>setTab(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ margin:"0 18px", overflow:"hidden" }}>
        {shown.length===0 ? (
          <div style={{ padding:30, textAlign:"center", color:C.textLight, fontSize:14 }}>
            {members.length===0 ? "No members in this group." : "No members match filter."}
          </div>
        ) : shown.map(m => {
          const on = ids.has(m.id);
          return (
            <div key={m.id} className="mr" style={{ background:on?"rgba(45,106,79,0.06)":"transparent" }} onClick={()=>toggle(m.id)}>
              <div className={"chk"+(on?" on":"")}>
                {on && <span style={{ color:"#fff", fontSize:15, fontWeight:700, lineHeight:1 }}>✓</span>}
              </div>
              <span style={{ width:32,height:32,borderRadius:8,background:on?C.green:C.goldPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:on?"#fff":C.brown,flexShrink:0,transition:"all 0.18s" }}>{m.id}</span>
              <span style={{ flex:1, fontSize:14, color:on?C.green:C.text, fontWeight:on?600:400, transition:"color 0.18s", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name}</span>
              {on && <span style={{ fontSize:11, color:C.greenLight, fontWeight:600, flexShrink:0 }}>Present</span>}
            </div>
          );
        })}
      </div>

      {count===total && total>0 && (
        <div style={{ margin:"18px 18px 0", background:"linear-gradient(135deg,#2D6A4F,#1a4a35)", borderRadius:18, padding:20, textAlign:"center", animation:"pop 0.3s ease" }}>
          <div style={{ fontSize:34 }}>🎉</div>
          <p style={{ color:"#fff", fontWeight:700, fontSize:16, margin:"8px 0 4px" }}>Full Attendance!</p>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>All {total} present. الحمد لله</p>
        </div>
      )}
      <Footer />
    </div>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ textAlign:"center", padding:"22px 0 26px" }}>
      <div style={{ fontSize:50, marginBottom:6, filter:"drop-shadow(0 3px 10px rgba(184,134,11,0.25))" }}>🕌</div>
      <h1 style={{ fontSize:24, fontWeight:700, color:C.brown, margin:0, letterSpacing:0.5 }}>Hajj Attendance</h1>
      <p style={{ fontSize:12, color:C.textLight, letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>Group Leader System</p>
      <p style={{ fontSize:13, color:C.gold, marginTop:6, letterSpacing:1 }}>✦ ☽ ✦</p>
    </div>
  );
}

function Bar({ title, back }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px 12px", background:C.cardBg, borderBottom:"1px solid rgba(212,175,55,0.18)", position:"sticky", top:0, zIndex:10, boxShadow:"0 2px 8px rgba(107,58,42,0.08)" }}>
      <button onClick={back} style={{ background:C.goldPale, border:"none", borderRadius:10, padding:"8px 14px", color:C.brown, cursor:"pointer", fontSize:15, fontWeight:700 }}>←</button>
      <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:C.brown }}>{title}</h2>
    </div>
  );
}

function MenuCard({ icon, title, sub, col, onClick }) {
  return (
    <div onClick={onClick}
      onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"}
      onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}
      style={{ background:C.cardBg, borderRadius:18, padding:"18px 16px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 16px rgba(107,58,42,0.1)", border:"1px solid rgba(212,175,55,0.18)", cursor:"pointer", transition:"transform 0.15s" }}>
      <div style={{ width:50,height:50,borderRadius:15,background:col+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{title}</p>
        <p style={{ margin:"2px 0 0", fontSize:12, color:C.textLight }}>{sub}</p>
      </div>
      <span style={{ fontSize:22, color:C.border }}>›</span>
    </div>
  );
}

function Lbl({ children }) {
  return <label style={{ display:"block", fontSize:13, fontWeight:600, color:C.textLight, marginBottom:6, letterSpacing:0.3 }}>{children}</label>;
}

function Footer() {
  return (
    <p style={{ textAlign:"center", fontSize:12, color:C.textLight, marginTop:30, padding:"0 18px" }}>
      ✦ Made by <strong style={{ color:C.brown }}>Husain Dewaswala</strong> ✦
    </p>
  );
}
