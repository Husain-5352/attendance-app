
import { useState, useRef, useEffect } from "react";

/* ─── persistent storage helpers (use window.storage from artifact env) ─── */
const DB = {
  async get(key) {
    try {
      const r = await window.storage.get(key, true);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
  }
};

const HUSAIN_MEMBERS = [
  { id:1,  name:"M.Husain Dewaswala",        gender:"male"   },
  { id:2,  name:"M.Husain Hakimji",           gender:"male"   },
  { id:3,  name:"M.Murtaza Raswala",          gender:"male"   },
  { id:4,  name:"Akberali Kota wala",         gender:"male"   },
  { id:5,  name:"Firoz lokhandwala",          gender:"male"   },
  { id:6,  name:"Akber Ali Dewaswala",        gender:"male"   },
  { id:7,  name:"M.Ammar Kanchwala",          gender:"male"   },
  { id:8,  name:"Shabbir Husain Lokhandwala", gender:"male"   },
  { id:9,  name:"Shabbir Husain bigodwala",   gender:"male"   },
  { id:10, name:"Baqir bh chalni wala",       gender:"male"   },
  { id:11, name:"Khozema bh Peti wala",       gender:"male"   },
  { id:12, name:"Qaidjohar bh dhamangaon",    gender:"male"   },
  { id:13, name:"Zulfiqar bh Kapasi",         gender:"male"   },
  { id:14, name:"Shabbir Husain thekedar",    gender:"male"   },
  { id:15, name:"Shk. Mustafa burhani",       gender:"male"   },
  { id:16, name:"Abidali runderwala",         gender:"male"   },
  { id:17, name:"Imran bh Dhamman",           gender:"male"   },
  { id:18, name:"Shoeb bh Samrat",            gender:"male"   },
  { id:19, name:"Husain Malak",               gender:"male"   },
  { id:20, name:"Taher shakru",               gender:"male"   },
  { id:21, name:"Hasanji Nala wala",          gender:"male"   },
  { id:22, name:"Shabbir chaati",             gender:"male"   },
  { id:23, name:"Shabbir vadgaam",            gender:"male"   },
  { id:24, name:"Taher nala",                 gender:"male"   },
  { id:25, name:"Husaina bn hakimji",         gender:"female" },
  { id:26, name:"Arwa bn raswala",            gender:"female" },
  { id:27, name:"Tasneem bn dewaswala",       gender:"female" },
  { id:28, name:"Fatema bn kanchwala",        gender:"female" },
  { id:29, name:"Fatema bn lokhandwala",      gender:"female" },
  { id:30, name:"Tasneem bn lokhandwala",     gender:"female" },
  { id:31, name:"Sakina bn kotawala",         gender:"female" },
  { id:32, name:"Zahabiyah bn bigodwala",     gender:"female" },
  { id:33, name:"Fatema bn chalni",           gender:"female" },
  { id:34, name:"Khadija bn petiwala",        gender:"female" },
  { id:35, name:"Shakera bn dhamangaon",      gender:"female" },
  { id:36, name:"Khadija bn runderawala",     gender:"female" },
  { id:37, name:"Mariya bn thekedar",         gender:"female" },
  { id:38, name:"Sabera bn damman",           gender:"female" },
  { id:39, name:"Tahera bn Samrat",           gender:"female" },
  { id:40, name:"Farida bn kapasi",           gender:"female" },
  { id:41, name:"Rashida bn shakruwala",      gender:"female" },
  { id:42, name:"Sakina bn Malak",            gender:"female" },
  { id:43, name:"Fatema bn Chati",            gender:"female" },
  { id:44, name:"Mariya bn nala wala",        gender:"female" },
  { id:45, name:"Mariya bn vadgam",           gender:"female" },
  { id:46, name:"Sakina bn nalawala",         gender:"female" },
];

function hashPw(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = Math.imul(31, h) + pw.charCodeAt(i) | 0; }
  return h.toString(16);
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════════*/
export default function App() {
  const [user, setUser] = useState(null);   // logged-in user object
  const [authScreen, setAuthScreen] = useState("login"); // login | register

  async function handleLogin(username, password) {
    const users = await DB.get("users") || {};
    const key = username.trim().toLowerCase();
    if (!users[key]) return "No account found. Please register.";
    if (users[key].pwHash !== hashPw(password)) return "Wrong password.";
    setUser({ username: key, displayName: users[key].displayName });
    return null;
  }

  async function handleRegister(displayName, username, password) {
    const users = await DB.get("users") || {};
    const key = username.trim().toLowerCase();
    if (users[key]) return "Username already taken.";
    users[key] = { displayName: displayName.trim(), pwHash: hashPw(password), members: [], events: [] };
    // seed Husain's account if not exists
    const husainKey = "husain dewaswala";
    if (!users[husainKey]) {
      users[husainKey] = { displayName:"Husain Dewaswala", pwHash: hashPw("7865253"), members: HUSAIN_MEMBERS, events: [] };
    }
    await DB.set("users", users);
    setUser({ username: key, displayName: displayName.trim() });
    return null;
  }

  // seed Husain on first load
  useEffect(() => {
    (async () => {
      const users = await DB.get("users") || {};
      if (!users["husain dewaswala"]) {
        users["husain dewaswala"] = { displayName:"Husain Dewaswala", pwHash: hashPw("7865253"), members: HUSAIN_MEMBERS, events: [] };
        await DB.set("users", users);
      }
    })();
  }, []);

  if (!user) return (
    <Shell>
      {authScreen === "login"
        ? <LoginScreen onLogin={handleLogin} onSwitch={() => setAuthScreen("register")} />
        : <RegisterScreen onRegister={handleRegister} onSwitch={() => setAuthScreen("login")} />}
    </Shell>
  );
  return <Shell><Dashboard user={user} onLogout={() => setUser(null)} /></Shell>;
}

/* ════════════════════════════════════════════════════════════════════════════
   SHELL / LAYOUT
═══════════════════════════════════════════════════════════════════════════════*/
function Shell({ children }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(145deg,#0b0f1a 0%,#111827 60%,#0d1f1a 100%)", fontFamily:"Georgia,'Times New Roman',serif", color:"#e8dfc8", position:"relative", display:"flex", flexDirection:"column" }}>
      <div style={{ position:"fixed", top:-100, right:-100, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(212,175,55,0.10) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-80, left:-80, width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle,rgba(52,211,153,0.07) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{transform:scale(0.88);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.6}}
        .fade-up{animation:fadeUp 0.45s ease both}
        .pop-in{animation:popIn 0.25s ease both}
        .btn-gold{background:linear-gradient(135deg,#b8860b,#d4af37,#f0c040);color:#0b0f1a;font-weight:700;border:none;border-radius:12px;cursor:pointer;font-family:Georgia,serif;letter-spacing:0.3px;transition:transform 0.12s,opacity 0.12s}
        .btn-gold:active{transform:scale(0.96);opacity:0.85}
        .btn-ghost{background:rgba(212,175,55,0.08);color:#d4af37;border:1.5px solid rgba(212,175,55,0.30);border-radius:12px;cursor:pointer;font-family:Georgia,serif;transition:background 0.15s}
        .btn-ghost:hover{background:rgba(212,175,55,0.15)}
        .btn-danger{background:rgba(239,68,68,0.12);color:#f87171;border:1.5px solid rgba(239,68,68,0.25);border-radius:12px;cursor:pointer;font-family:Georgia,serif;transition:background 0.15s}
        .btn-danger:hover{background:rgba(239,68,68,0.2)}
        .inp{background:rgba(255,255,255,0.05);border:1.5px solid rgba(212,175,55,0.20);border-radius:10px;padding:11px 14px;color:#e8dfc8;font-size:14px;font-family:Georgia,serif;width:100%;box-sizing:border-box;transition:border-color 0.2s}
        .inp:focus{outline:none;border-color:rgba(212,175,55,0.55)}
        .card{background:rgba(255,255,255,0.04);border:1.5px solid rgba(212,175,55,0.12);border-radius:16px}
        .row-hover:hover{background:rgba(212,175,55,0.07)!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(212,175,55,0.25);border-radius:4px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>
      <div style={{ flex:1, position:"relative", zIndex:1 }}>{children}</div>
      <footer style={{ textAlign:"center", padding:"14px 0 18px", fontSize:11, color:"#4a4030", letterSpacing:1.2, textTransform:"uppercase", zIndex:1, position:"relative" }}>
        Made by Husain Dewaswala
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   AUTH — LOGIN
═══════════════════════════════════════════════════════════════════════════════*/
function LoginScreen({ onLogin, onSwitch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit() {
    if (!username.trim() || !password) { setError("Please fill all fields."); return; }
    setLoading(true); setError("");
    const err = await onLogin(username, password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div style={{ maxWidth:380, margin:"0 auto", padding:"48px 20px 24px" }} className="fade-up">
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:44, marginBottom:6 }}>🕌</div>
        <h1 style={{ margin:0, fontSize:26, fontWeight:700, color:"#d4af37", letterSpacing:1.2 }}>Attendance Manager</h1>
        <p style={{ margin:"6px 0 0", fontSize:11, color:"#5a4e38", letterSpacing:2, textTransform:"uppercase" }}>Group Leader Portal</p>
      </div>
      <div className="card" style={{ padding:"24px 20px" }}>
        <p style={{ margin:"0 0 18px", fontSize:13, color:"#d4af37", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Sign In</p>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:"#8a7a5a", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:5 }}>Username</label>
          <input className="inp" placeholder="Your username" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:11, color:"#8a7a5a", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:5 }}>Password</label>
          <div style={{ position:"relative" }}>
            <input className="inp" type={showPw?"text":"password"} placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={{ paddingRight:44 }} />
            <button onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#8a7a5a", fontSize:16 }}>{showPw?"🙈":"👁"}</button>
          </div>
        </div>
        {error && <p style={{ margin:"0 0 12px", fontSize:12, color:"#f87171", background:"rgba(239,68,68,0.08)", padding:"8px 12px", borderRadius:8 }}>⚠ {error}</p>}
        <button className="btn-gold" style={{ width:"100%", padding:"13px 0", fontSize:15 }} onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </div>
      <p style={{ textAlign:"center", marginTop:18, fontSize:13, color:"#5a4e38" }}>
        New group leader?{" "}
        <span style={{ color:"#d4af37", cursor:"pointer", textDecoration:"underline" }} onClick={onSwitch}>Create Account</span>
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   AUTH — REGISTER
═══════════════════════════════════════════════════════════════════════════════*/
function RegisterScreen({ onRegister, onSwitch }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit() {
    if (!displayName.trim() || !username.trim() || !password) { setError("Please fill all fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters."); return; }
    setLoading(true); setError("");
    const err = await onRegister(displayName, username, password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div style={{ maxWidth:380, margin:"0 auto", padding:"36px 20px 24px" }} className="fade-up">
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:40, marginBottom:6 }}>🕌</div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#d4af37", letterSpacing:1 }}>Create Account</h1>
        <p style={{ margin:"5px 0 0", fontSize:11, color:"#5a4e38", letterSpacing:2, textTransform:"uppercase" }}>Group Leader Registration</p>
      </div>
      <div className="card" style={{ padding:"22px 20px" }}>
        {[
          { label:"Full Name", val:displayName, set:setDisplayName, ph:"e.g. Ahmed Ali", type:"text" },
          { label:"Username", val:username, set:setUsername, ph:"Choose a username", type:"text" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:"#8a7a5a", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:5 }}>{f.label}</label>
            <input className="inp" type={f.type} placeholder={f.ph} value={f.val} onChange={e=>f.set(e.target.value)} />
          </div>
        ))}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:"#8a7a5a", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:5 }}>Password</label>
          <div style={{ position:"relative" }}>
            <input className="inp" type={showPw?"text":"password"} placeholder="Min. 4 characters" value={password} onChange={e=>setPassword(e.target.value)} style={{ paddingRight:44 }} />
            <button onClick={()=>setShowPw(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#8a7a5a", fontSize:16 }}>{showPw?"🙈":"👁"}</button>
          </div>
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:11, color:"#8a7a5a", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:5 }}>Confirm Password</label>
          <input className="inp" type="password" placeholder="Re-enter password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
        </div>
        {error && <p style={{ margin:"0 0 12px", fontSize:12, color:"#f87171", background:"rgba(239,68,68,0.08)", padding:"8px 12px", borderRadius:8 }}>⚠ {error}</p>}
        <button className="btn-gold" style={{ width:"100%", padding:"13px 0", fontSize:15 }} onClick={submit} disabled={loading}>
          {loading ? "Creating…" : "Create Account →"}
        </button>
      </div>
      <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#5a4e38" }}>
        Already have an account?{" "}
        <span style={{ color:"#d4af37", cursor:"pointer", textDecoration:"underline" }} onClick={onSwitch}>Sign In</span>
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DASHBOARD (post-login router)
═══════════════════════════════════════════════════════════════════════════════*/
function Dashboard({ user, onLogout }) {
  const [screen, setScreen] = useState("home");
  const [userData, setUserData] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const users = await DB.get("users") || {};
    const u = users[user.username];
    if (u) setUserData({ ...u, members: u.members || [], events: (u.events || []).map(e => ({ ...e, arrivedIds: new Set(e.arrivedIds || []) })) });
    setLoading(false);
  }

  async function saveData(updated) {
    const users = await DB.get("users") || {};
    users[user.username] = {
      ...users[user.username],
      members: updated.members,
      events: updated.events.map(e => ({ ...e, arrivedIds: [...(e.arrivedIds || new Set())] }))
    };
    await DB.set("users", users);
    setUserData(updated);
  }

  useEffect(() => { loadData(); }, []);

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"#d4af37", animation:"shimmer 1.2s infinite" }}>Loading…</div>;

  return (
    <>
      {screen === "home"       && <HomeScreen user={user} userData={userData} onLogout={onLogout} onNav={setScreen} />}
      {screen === "members"    && <MembersScreen userData={userData} onSave={saveData} onBack={()=>setScreen("home")} />}
      {screen === "events"     && <EventsScreen userData={userData} onSave={saveData} onBack={()=>setScreen("home")} onOpenEvent={ev=>{setActiveEvent(ev);setScreen("attendance");}} />}
      {screen === "attendance" && activeEvent && <AttendanceScreen userData={userData} event={activeEvent} onSave={async(updatedEvent)=>{
        const updated = { ...userData, events: userData.events.map(e=>e.id===updatedEvent.id?updatedEvent:e) };
        await saveData(updated); setActiveEvent(updatedEvent);
      }} onBack={()=>setScreen("events")} />}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HOME SCREEN
═══════════════════════════════════════════════════════════════════════════════*/
function HomeScreen({ user, userData, onLogout, onNav }) {
  const members = userData?.members || [];
  const events  = userData?.events  || [];
  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"28px 18px 24px" }} className="fade-up">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <p style={{ margin:0, fontSize:11, color:"#5a4e38", letterSpacing:1.5, textTransform:"uppercase" }}>Welcome back</p>
          <h2 style={{ margin:"3px 0 0", fontSize:20, color:"#d4af37", fontWeight:700 }}>{userData?.displayName || user.username}</h2>
        </div>
        <button className="btn-danger" style={{ padding:"8px 14px", fontSize:12 }} onClick={onLogout}>Sign Out</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
        <MiniStat label="Members" value={members.length} color="#d4af37" icon="👥" />
        <MiniStat label="Events"  value={events.length}  color="#7dd3fc" icon="📅" />
        <MiniStat label="Today"   value={new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"})} color="#34d399" icon="📆" />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <NavCard icon="📋" title="Manage Events" sub="Create events & mark attendance" color="#d4af37" onClick={()=>onNav("events")} />
        <NavCard icon="👥" title="My Members"    sub={`${members.length} members in your group`} color="#7dd3fc" onClick={()=>onNav("members")} />
      </div>
    </div>
  );
}

function NavCard({ icon, title, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 18px", background:"rgba(255,255,255,0.04)", border:`1.5px solid ${color}22`, borderRadius:16, cursor:"pointer", transition:"background 0.15s,transform 0.12s" }}
      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
      onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
      onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"}
      onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
      <div style={{ width:46, height:46, borderRadius:12, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{icon}</div>
      <div>
        <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#e8dfc8" }}>{title}</p>
        <p style={{ margin:"3px 0 0", fontSize:12, color:"#5a4e38" }}>{sub}</p>
      </div>
      <span style={{ marginLeft:"auto", color, fontSize:18 }}>›</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MEMBERS SCREEN
═══════════════════════════════════════════════════════════════════════════════*/
function MembersScreen({ userData, onSave, onBack }) {
  const [members, setMembers] = useState(userData?.members || []);
  const [newName, setNewName] = useState("");
  const [newId, setNewId]     = useState("");
  const [newGender, setNewGender] = useState("male");
  const [error, setError]     = useState("");
  const [toast, setToast]     = useState(null);

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),2000); }

  function addMember() {
    const id = parseInt(newId);
    if (!newName.trim())            { setError("Name is required."); return; }
    if (isNaN(id) || id < 1)        { setError("Enter a valid number."); return; }
    if (members.find(m=>m.id===id)) { setError(`No. ${id} is already assigned.`); return; }
    const updated = [...members, { id, name:newName.trim(), gender:newGender }].sort((a,b)=>a.id-b.id);
    setMembers(updated);
    onSave({ ...userData, members: updated });
    setNewName(""); setNewId(""); setError("");
    showToast(`Member #${id} added!`);
  }

  function deleteMember(id) {
    const updated = members.filter(m=>m.id!==id);
    setMembers(updated);
    onSave({ ...userData, members: updated });
    showToast("Member removed.", "warn");
  }

  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"22px 18px 32px" }} className="fade-up">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button className="btn-ghost" style={{ padding:"8px 14px", fontSize:13 }} onClick={onBack}>← Back</button>
        <h2 style={{ margin:0, fontSize:18, color:"#d4af37" }}>My Members ({members.length})</h2>
      </div>

      {/* Add member */}
      <div className="card" style={{ padding:"16px", marginBottom:20 }}>
        <p style={{ margin:"0 0 12px", fontSize:11, color:"#d4af37", letterSpacing:1.5, textTransform:"uppercase", fontWeight:700 }}>Add New Member</p>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input className="inp" placeholder="Assigned No." type="number" value={newId} onChange={e=>setNewId(e.target.value)} style={{ width:90, flex:"none" }} />
          <input className="inp" placeholder="Member name" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMember()} style={{ flex:1 }} />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:error?10:0 }}>
          {["male","female"].map(g=>(
            <button key={g} onClick={()=>setNewGender(g)} style={{ flex:1, padding:"9px 0", fontSize:13, borderRadius:10, border:`1.5px solid ${newGender===g?"#d4af37":"rgba(212,175,55,0.2)"}`, background:newGender===g?"rgba(212,175,55,0.15)":"transparent", color:newGender===g?"#d4af37":"#5a4e38", cursor:"pointer", fontFamily:"Georgia,serif" }}>
              {g==="male"?"♂ Male":"♀ Female"}
            </button>
          ))}
        </div>
        {error && <p style={{ margin:"8px 0 10px", fontSize:12, color:"#f87171" }}>⚠ {error}</p>}
        <button className="btn-gold" style={{ width:"100%", padding:"11px 0", fontSize:14, marginTop:10 }} onClick={addMember}>+ Add Member</button>
      </div>

      {/* Members list */}
      {members.length === 0
        ? <p style={{ textAlign:"center", color:"#4a4030", fontSize:13 }}>No members yet. Add your first member above.</p>
        : <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {members.map(m=>(
              <div key={m.id} className="row-hover" style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,175,55,0.08)", borderRadius:11, padding:"9px 13px" }}>
                <span style={{ minWidth:30, height:30, borderRadius:8, background:m.gender==="male"?"rgba(96,165,250,0.15)":"rgba(244,114,182,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:m.gender==="male"?"#93c5fd":"#f9a8d4" }}>{m.id}</span>
                <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                <span style={{ fontSize:11, color:m.gender==="male"?"#93c5fd":"#f9a8d4" }}>{m.gender==="male"?"♂":"♀"}</span>
                <button onClick={()=>deleteMember(m.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a4030", fontSize:16, padding:"0 4px" }} title="Remove">✕</button>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EVENTS SCREEN
═══════════════════════════════════════════════════════════════════════════════*/
function EventsScreen({ userData, onSave, onBack, onOpenEvent }) {
  const [events, setEvents] = useState(userData?.events || []);
  const [name, setName]   = useState("");
  const [date, setDate]   = useState("");
  const [toast, setToast] = useState(null);
  const total = userData?.members?.length || 0;

  function showToast(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),2000);}

  function createEvent() {
    if (!name.trim() || !date) { showToast("Fill event name & date.","error"); return; }
    const ev = { id:Date.now(), name:name.trim(), date, arrivedIds:new Set() };
    const updated = [...events, ev];
    setEvents(updated);
    onSave({ ...userData, events: updated });
    setName(""); setDate("");
    showToast("Event created!");
  }

  function deleteEvent(id) {
    const updated = events.filter(e=>e.id!==id);
    setEvents(updated);
    onSave({ ...userData, events: updated });
  }

  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"22px 18px 32px" }} className="fade-up">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button className="btn-ghost" style={{ padding:"8px 14px", fontSize:13 }} onClick={onBack}>← Back</button>
        <h2 style={{ margin:0, fontSize:18, color:"#d4af37" }}>Events</h2>
      </div>

      <div className="card" style={{ padding:"16px", marginBottom:22 }}>
        <p style={{ margin:"0 0 12px", fontSize:11, color:"#d4af37", letterSpacing:1.5, textTransform:"uppercase", fontWeight:700 }}>Create New Event</p>
        <input className="inp" placeholder="Event name (e.g. Majlis 1, Ashura…)" value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:10 }} />
        <input className="inp" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ marginBottom:12 }} />
        <button className="btn-gold" style={{ width:"100%", padding:"12px 0", fontSize:14 }} onClick={createEvent}>+ Create Event</button>
      </div>

      {events.length===0
        ? <p style={{ textAlign:"center", color:"#4a4030", fontSize:13 }}>No events yet.</p>
        : <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {events.map(ev=>{
              const count = ev.arrivedIds?.size ?? 0;
              const pct   = total ? Math.round((count/total)*100) : 0;
              return (
                <div key={ev.id} className="card pop-in" style={{ padding:"14px 16px", cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }} onClick={()=>onOpenEvent(ev)}>
                    <div>
                      <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#e8dfc8" }}>{ev.name}</p>
                      <p style={{ margin:"3px 0 0", fontSize:11, color:"#5a4e38" }}>📅 {formatDate(ev.date)}</p>
                    </div>
                    <span style={{ fontSize:12, color:"#d4af37", background:"rgba(212,175,55,0.1)", padding:"4px 10px", borderRadius:20, fontWeight:600 }}>{pct}%</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:6, overflow:"hidden", marginBottom:8 }} onClick={()=>onOpenEvent(ev)}>
                    <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#c9a227,#e8c84a)", borderRadius:6, transition:"width 0.4s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:12, color:"#5a4e38", display:"flex", gap:14 }} onClick={()=>onOpenEvent(ev)}>
                      <span>✅ {count} arrived</span>
                      <span>⏳ {total-count} remaining</span>
                    </div>
                    <button onClick={()=>deleteEvent(ev.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a4030", fontSize:14 }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ATTENDANCE SCREEN
═══════════════════════════════════════════════════════════════════════════════*/
function AttendanceScreen({ userData, event, onSave, onBack }) {
  const members = userData?.members || [];
  const total   = members.length;
  const [arrivedIds, setArrivedIds] = useState(new Set(event.arrivedIds || []));
  const [inputVal, setInputVal]     = useState("");
  const [dropOpen, setDropOpen]     = useState(false);
  const [search, setSearch]         = useState("");
  const [toast, setToast]           = useState(null);
  const [flashId, setFlashId]       = useState(null);
  const dropRef = useRef(null);

  const filtered = members.filter(m=>{
    const s = search.toLowerCase();
    return m.name.toLowerCase().includes(s) || String(m.id).includes(s);
  });

  function showToast(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),2200);}

  function flash(id){setFlashId(id);setTimeout(()=>setFlashId(null),700);}

  function markArrived(m) {
    if (arrivedIds.has(m.id)) { showToast(`#${m.id} already marked!`,"warn"); flash(m.id); return; }
    const next = new Set([...arrivedIds, m.id]);
    setArrivedIds(next);
    onSave({ ...event, arrivedIds: next });
    showToast(`✓ ${m.name} present`,"success");
    flash(m.id);
  }

  function unmark(id) {
    const next = new Set([...arrivedIds].filter(x=>x!==id));
    setArrivedIds(next);
    onSave({ ...event, arrivedIds: next });
  }

  function submitNumber() {
    const n = parseInt(inputVal.trim());
    if (isNaN(n)) { showToast("Enter a valid number","error"); return; }
    const m = members.find(x=>x.id===n);
    if (!m) { showToast(`No member with no. ${n}`,"error"); return; }
    markArrived(m); setInputVal("");
  }

  useEffect(()=>{
    function h(e){if(dropRef.current&&!dropRef.current.contains(e.target)){setDropOpen(false);setSearch("");}}
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  const arrived   = [...arrivedIds].map(id=>members.find(m=>m.id===id)).filter(Boolean);
  const remaining = members.filter(m=>!arrivedIds.has(m.id));
  const pct       = total ? Math.round((arrivedIds.size/total)*100) : 0;

  return (
    <div style={{ maxWidth:420, margin:"0 auto", padding:"20px 16px 36px" }} className="fade-up">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <button className="btn-ghost" style={{ padding:"8px 12px", fontSize:12 }} onClick={onBack}>← Back</button>
        <div>
          <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#d4af37" }}>{event.name}</p>
          <p style={{ margin:0, fontSize:11, color:"#5a4e38" }}>📅 {formatDate(event.date)}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
        <MiniStat label="Total"     value={total}              color="#d4af37" />
        <MiniStat label="Arrived"   value={arrivedIds.size}    color="#4ade80" />
        <MiniStat label="Remaining" value={total-arrivedIds.size} color="#f87171" />
      </div>

      {/* Progress */}
      <div style={{ marginBottom:20 }}>
        <div style={{ height:8, background:"rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#22c55e,#4ade80)", borderRadius:10, transition:"width 0.5s" }} />
        </div>
        <p style={{ margin:"5px 0 0", fontSize:11, color:"#5a4e38", textAlign:"right" }}>{pct}% attendance</p>
      </div>

      {/* Mark attendance */}
      <div className="card" style={{ padding:"16px", marginBottom:20 }}>
        <p style={{ margin:"0 0 12px", fontSize:11, color:"#d4af37", letterSpacing:1.5, textTransform:"uppercase", fontWeight:700 }}>Mark Attendance</p>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input className="inp" type="number" placeholder={`Enter no. (1–${total||"?"})`} value={inputVal}
            onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitNumber()} style={{ flex:1 }} />
          <button className="btn-gold" style={{ padding:"11px 16px", fontSize:15, borderRadius:10 }} onClick={submitNumber}>✓</button>
        </div>
        <div style={{ position:"relative" }} ref={dropRef}>
          <button className="btn-ghost" style={{ width:"100%", padding:"11px 14px", fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}
            onClick={()=>{setDropOpen(v=>!v);setSearch("");}}>
            <span>Select member from list…</span>
            <span style={{fontSize:11}}>{dropOpen?"▲":"▼"}</span>
          </button>
          {dropOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:200, background:"#111827", border:"1.5px solid rgba(212,175,55,0.22)", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.6)", overflow:"hidden" }} className="pop-in">
              <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                <input autoFocus className="inp" placeholder="Search name or number…" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight:230, overflowY:"auto" }}>
                {filtered.length===0 && <p style={{ textAlign:"center", color:"#4a4030", fontSize:13, padding:14 }}>No results</p>}
                {filtered.map(m=>{
                  const done = arrivedIds.has(m.id);
                  return (
                    <div key={m.id} onClick={()=>!done&&(markArrived(m),setDropOpen(false),setSearch(""))}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:done?"not-allowed":"pointer", background:done?"rgba(34,197,94,0.07)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.03)", opacity:done?0.5:1 }}
                      className={done?"":"row-hover"}>
                      <span style={{ minWidth:26, fontSize:11, fontWeight:700, color:"#d4af37", background:"rgba(212,175,55,0.1)", padding:"2px 6px", borderRadius:6 }}>{m.id}</span>
                      <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                      {done && <span style={{color:"#4ade80",fontSize:13}}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Arrived */}
      {arrived.length>0 && (
        <div style={{ marginBottom:16 }}>
          <p style={{ margin:"0 0 9px", fontSize:11, color:"#4ade80", textTransform:"uppercase", letterSpacing:1.5, fontWeight:700 }}>✅ Arrived ({arrived.length})</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {arrived.map(m=>(
              <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, background:flashId===m.id?"rgba(34,197,94,0.18)":"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:10, padding:"9px 13px", transition:"background 0.3s" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#4ade80", minWidth:22 }}>{m.id}</span>
                <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                <button onClick={()=>unmark(m.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a4030", fontSize:15, padding:0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining */}
      {remaining.length>0 && (
        <div>
          <p style={{ margin:"0 0 9px", fontSize:11, color:"#f87171", textTransform:"uppercase", letterSpacing:1.5, fontWeight:700 }}>⏳ Remaining ({remaining.length})</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {remaining.map(m=>(
              <div key={m.id} onClick={()=>markArrived(m)} className="row-hover"
                style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.10)", borderRadius:10, padding:"9px 13px", cursor:"pointer" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#f87171", minWidth:22 }}>{m.id}</span>
                <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                <span style={{ fontSize:11, color:"#3a3028" }}>Tap →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {arrivedIds.size===total && total>0 && (
        <div style={{ textAlign:"center", padding:"28px 0 8px" }} className="pop-in">
          <div style={{ fontSize:44 }}>🎉</div>
          <p style={{ color:"#4ade80", fontSize:17, fontWeight:700, margin:"8px 0 4px" }}>Full Attendance!</p>
          <p style={{ color:"#5a4e38", fontSize:12, margin:0 }}>All {total} members present.</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SHARED MINI COMPONENTS
═══════════════════════════════════════════════════════════════════════════════*/
function MiniStat({ label, value, color, icon }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${color}22`, borderRadius:13, padding:"12px 8px", textAlign:"center" }}>
      {icon && <div style={{ fontSize:18, marginBottom:3 }}>{icon}</div>}
      <div style={{ fontSize:20, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:"#4a4030", marginTop:3, letterSpacing:0.5 }}>{label}</div>
    </div>
  );
}

function Toast({ msg, type }) {
  const bg = type==="success"?"rgba(34,197,94,0.92)":type==="warn"?"rgba(234,179,8,0.92)":"rgba(220,38,38,0.92)";
  return (
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, padding:"10px 22px", borderRadius:40, background:bg, color:"#fff", fontSize:13, fontWeight:600, boxShadow:"0 4px 24px rgba(0,0,0,0.4)", whiteSpace:"nowrap" }} className="pop-in">
      {msg}
    </div>
  );
}
