import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// ─── Storage helpers (localStorage as persistent backend) ────────────────────
const DB_KEY = "hajj_attendance_db";

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return initDB();
    const db = JSON.parse(raw);
    // deserialize Set arrays in events
    Object.values(db.users || {}).forEach(u => {
      (u.events || []).forEach(ev => {
        ev.arrivedIds = new Set(ev.arrivedIds || []);
      });
    });
    return db;
  } catch { return initDB(); }
}

function initDB() {
  const db = {
    users: {
      "husain_dewaswala": {
        username: "husain_dewaswala",
        displayName: "Husain Dewaswala",
        password: "7865253",
        members: [
          {id:1,name:"M.Husain Dewaswala"},{id:2,name:"M.Husain Hakimji"},
          {id:3,name:"M.Murtaza Raswala"},{id:4,name:"Akberali Kota wala"},
          {id:5,name:"Firoz lokhandwala"},{id:6,name:"Akber Ali Dewaswala"},
          {id:7,name:"M.Ammar Kanchwala"},{id:8,name:"Shabbir Husain Lokhandwala"},
          {id:9,name:"Shabbir Husain bigodwala"},{id:10,name:"Baqir bh chalni wala"},
          {id:11,name:"Khozema bh Peti wala"},{id:12,name:"Qaidjohar bh dhamangaon"},
          {id:13,name:"Zulfiqar bh Kapasi"},{id:14,name:"Shabbir Husain thekedar"},
          {id:15,name:"Shk. Mustafa burhani"},{id:16,name:"Abidali runderwala"},
          {id:17,name:"Imran bh Dhamman"},{id:18,name:"Shoeb bh Samrat"},
          {id:19,name:"Husain Malak"},{id:20,name:"Taher shakru"},
          {id:21,name:"Hasanji Nala wala"},{id:22,name:"Shabbir chaati"},
          {id:23,name:"Shabbir vadgaam"},{id:24,name:"Taher nala"},
          {id:25,name:"Husaina bn hakimji"},{id:26,name:"Arwa bn raswala"},
          {id:27,name:"Tasneem bn dewaswala"},{id:28,name:"Fatema bn kanchwala"},
          {id:29,name:"Fatema bn lokhandwala"},{id:30,name:"Tasneem bn lokhandwala"},
          {id:31,name:"Sakina bn kotawala"},{id:32,name:"Zahabiyah bn bigodwala"},
          {id:33,name:"Fatema bn chalni"},{id:34,name:"Khadija bn petiwala"},
          {id:35,name:"Shakera bn dhamangaon"},{id:36,name:"Khadija bn runderawala"},
          {id:37,name:"Mariya bn thekedar"},{id:38,name:"Sabera bn damman"},
          {id:39,name:"Tahera bn Samrat"},{id:40,name:"Farida bn kapasi"},
          {id:41,name:"Rashida bn shakruwala"},{id:42,name:"Sakina bn Malak"},
          {id:43,name:"Fatema bn Chati"},{id:44,name:"Mariya bn nala wala"},
          {id:45,name:"Mariya bn vadgam"},{id:46,name:"Sakina bn nalawala"},
        ],
        events: []
      }
    }
  };
  saveDB(db);
  return db;
}

function saveDB(db) {
  try {
    const serializable = { ...db, users: {} };
    Object.entries(db.users).forEach(([k, u]) => {
      serializable.users[k] = {
        ...u,
        events: (u.events || []).map(ev => ({
          ...ev,
          arrivedIds: [...(ev.arrivedIds || [])]
        }))
      };
    });
    localStorage.setItem(DB_KEY, JSON.stringify(serializable));
  } catch(e) { console.error("Save failed", e); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}
function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }
  return [toast, show];
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  mosque: "🕌", star: "✦", crescent: "☽", user: "👤", lock: "🔒",
  plus: "+", check: "✓", back: "←", eye: "👁", upload: "📤",
  event: "📋", logout: "⎋", kaaba: "🕋", pray: "🤲", group: "👥",
  calendar: "📅", delete: "✕", excel: "📊", search: "🔍"
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  gold: "#B8860B",
  goldLight: "#D4AF37",
  goldPale: "#F5E6B3",
  green: "#2D6A4F",
  greenLight: "#52B788",
  cream: "#FDF6E3",
  sand: "#E8D5A3",
  brown: "#6B3A2A",
  brownLight: "#8B5E3C",
  red: "#C0392B",
  white: "#FFFFFF",
  text: "#2C1810",
  textLight: "#6B4C3B",
  border: "#D4B896",
  bg: "#F5EDD6",
  cardBg: "#FFFDF5",
};

const shadows = {
  sm: "0 2px 8px rgba(107,58,42,0.1)",
  md: "0 4px 16px rgba(107,58,42,0.15)",
  lg: "0 8px 32px rgba(107,58,42,0.2)",
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(loadDB);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem("hajj_session");
    return saved || null;
  });
  const [screen, setScreen] = useState("login"); // login | register | dashboard | members | addMember | events | attendance
  const [activeEvent, setActiveEvent] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(() => { saveDB(db); }, [db]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem("hajj_session", currentUser);
      setScreen("dashboard");
    } else {
      sessionStorage.removeItem("hajj_session");
      setScreen("login");
    }
  }, [currentUser]);

  const user = currentUser ? db.users[currentUser] : null;

  function updateUser(updater) {
    setDb(prev => {
      const updated = { ...prev, users: { ...prev.users, [currentUser]: updater(prev.users[currentUser]) } };
      return updated;
    });
  }

  // ── Auth ──
  function handleLogin(username, password) {
    const slug = slugify(username);
    const u = db.users[slug];
    if (!u) { showToast("Account not found", "error"); return; }
    if (u.password !== password) { showToast("Wrong password", "error"); return; }
    setCurrentUser(slug);
    showToast(`Welcome back, ${u.displayName}!`);
  }

  function handleRegister(displayName, password) {
    const slug = slugify(displayName);
    if (db.users[slug]) { showToast("Username already taken", "error"); return; }
    const newUser = { username: slug, displayName, password, members: [], events: [] };
    setDb(prev => ({ ...prev, users: { ...prev.users, [slug]: newUser } }));
    setCurrentUser(slug);
    showToast(`Welcome, ${displayName}!`);
  }

  function handleLogout() {
    setCurrentUser(null);
    setActiveEvent(null);
  }

  // ── Members ──
  function addMember(name, id) {
    const members = user.members;
    if (members.find(m => m.id === id)) { showToast(`ID #${id} already exists`, "error"); return false; }
    if (members.find(m => m.name.toLowerCase() === name.toLowerCase())) { showToast("Member name already exists", "error"); return false; }
    updateUser(u => ({ ...u, members: [...u.members, { id, name }].sort((a,b)=>a.id-b.id) }));
    showToast(`${name} added!`);
    return true;
  }

  function deleteMember(id) {
    updateUser(u => ({ ...u, members: u.members.filter(m => m.id !== id) }));
    showToast("Member removed");
  }

  function importFromExcel(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        let added = 0, skipped = 0;
        const newMembers = [...(user.members || [])];
        rows.forEach(row => {
          const id = parseInt(row[0]);
          const name = String(row[1] || "").trim();
          if (!id || !name) { skipped++; return; }
          if (newMembers.find(m => m.id === id || m.name.toLowerCase() === name.toLowerCase())) { skipped++; return; }
          newMembers.push({ id, name });
          added++;
        });
        newMembers.sort((a,b) => a.id - b.id);
        updateUser(u => ({ ...u, members: newMembers }));
        showToast(`Imported ${added} members${skipped ? `, ${skipped} skipped` : ""}!`);
      } catch { showToast("Invalid Excel file", "error"); }
    };
    reader.readAsBinaryString(file);
  }

  // ── Events ──
  function createEvent(name, date) {
    if (!name.trim() || !date) { showToast("Fill event name & date", "error"); return; }
    const ev = { id: Date.now(), name: name.trim(), date, arrivedIds: new Set() };
    updateUser(u => ({ ...u, events: [...(u.events||[]), ev] }));
    showToast("Event created!");
  }

  function deleteEvent(id) {
    updateUser(u => ({ ...u, events: u.events.filter(e => e.id !== id) }));
    showToast("Event deleted");
  }

  function openEvent(ev) {
    setActiveEvent({ ...ev, arrivedIds: new Set(ev.arrivedIds) });
    setScreen("attendance");
  }

  function saveAttendance(eventId, arrivedIds) {
    updateUser(u => ({
      ...u,
      events: u.events.map(e => e.id === eventId ? { ...e, arrivedIds: new Set(arrivedIds) } : e)
    }));
  }

  const screens = { login, register, dashboard, members, addMember, events, attendance };

  return (
    <div style={{ minHeight:"100vh", background: `linear-gradient(160deg, #F5EDD6 0%, #EDE0C4 50%, #E8D5A3 100%)`, position:"relative" }}>
      {/* Decorative top bar */}
      <div style={{ height:4, background:`linear-gradient(90deg, ${C.gold}, ${C.goldLight}, ${C.green}, ${C.goldLight}, ${C.gold})` }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
          zIndex:9999, padding:"12px 24px", borderRadius:50,
          background: toast.type==="error" ? C.red : toast.type==="warn" ? "#E67E22" : C.green,
          color:"#fff", fontSize:13, fontWeight:600, boxShadow:shadows.lg,
          whiteSpace:"nowrap", maxWidth:"90vw", textAlign:"center",
          animation:"toastIn 0.3s ease"
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .screen { animation: fadeUp 0.35s ease; }
        .btn-primary { background:linear-gradient(135deg,${C.gold},${C.goldLight}); color:${C.brown}; border:none; border-radius:14px; font-weight:700; cursor:pointer; font-family:Poppins,sans-serif; transition:all 0.2s; box-shadow:0 3px 12px rgba(184,134,11,0.3); }
        .btn-primary:active { transform:scale(0.97); opacity:0.9; }
        .btn-secondary { background:${C.white}; color:${C.brown}; border:2px solid ${C.border}; border-radius:14px; font-weight:600; cursor:pointer; font-family:Poppins,sans-serif; transition:all 0.2s; }
        .btn-secondary:active { transform:scale(0.97); }
        .btn-danger { background:linear-gradient(135deg,#E74C3C,#C0392B); color:#fff; border:none; border-radius:10px; font-weight:600; cursor:pointer; font-family:Poppins,sans-serif; transition:all 0.2s; }
        .btn-danger:active { transform:scale(0.97); }
        .btn-green { background:linear-gradient(135deg,${C.green},${C.greenLight}); color:#fff; border:none; border-radius:14px; font-weight:700; cursor:pointer; font-family:Poppins,sans-serif; transition:all 0.2s; box-shadow:0 3px 12px rgba(45,106,79,0.3); }
        .btn-green:active { transform:scale(0.97); opacity:0.9; }
        .input-field { background:${C.white}; border:2px solid ${C.border}; border-radius:12px; padding:13px 16px; font-size:15px; color:${C.text}; font-family:Poppins,sans-serif; width:100%; box-sizing:border-box; transition:border 0.2s; -webkit-appearance:none; }
        .input-field:focus { outline:none; border-color:${C.gold}; box-shadow:0 0 0 3px rgba(184,134,11,0.12); }
        .card { background:${C.cardBg}; border-radius:20px; box-shadow:${shadows.md}; border:1px solid rgba(212,175,55,0.2); }
        .checkbox-custom { width:24px; height:24px; border-radius:8px; border:2.5px solid ${C.border}; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; flex-shrink:0; background:${C.white}; }
        .checkbox-custom.checked { background:${C.green}; border-color:${C.green}; }
        input[type=checkbox] { display:none; }
        .member-row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid rgba(212,175,55,0.15); transition:background 0.15s; cursor:pointer; }
        .member-row:last-child { border-bottom:none; }
        .member-row:active { background:rgba(212,175,55,0.1); }
        input[type=date] { color-scheme: light; }
        .tab-btn { padding:8px 16px; border-radius:20px; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:Poppins,sans-serif; }
        .search-bar { display:flex; align-items:center; background:${C.white}; border:2px solid ${C.border}; border-radius:12px; padding:0 14px; gap:8px; }
        .search-bar input { border:none; background:transparent; padding:12px 0; font-size:14px; color:${C.text}; font-family:Poppins,sans-serif; flex:1; }
        .search-bar input:focus { outline:none; }
      `}</style>

      {/* Screens */}
      {screen === "login" && <LoginScreen onLogin={handleLogin} onGoRegister={()=>setScreen("register")} />}
      {screen === "register" && <RegisterScreen onRegister={handleRegister} onGoLogin={()=>setScreen("login")} />}
      {screen === "dashboard" && user && <DashboardScreen user={user} onNav={setScreen} onLogout={handleLogout} />}
      {screen === "members" && user && <MembersScreen user={user} onNav={setScreen} onDelete={deleteMember} onImport={importFromExcel} showToast={showToast} />}
      {screen === "addMember" && user && <AddMemberScreen user={user} onAdd={addMember} onNav={setScreen} />}
      {screen === "events" && user && <EventsScreen user={user} onNav={setScreen} onCreate={createEvent} onOpen={openEvent} onDelete={deleteEvent} />}
      {screen === "attendance" && user && activeEvent && (
        <AttendanceScreen
          user={user} event={activeEvent}
          onSave={(ids) => { saveAttendance(activeEvent.id, ids); showToast("Attendance saved!"); }}
          onBack={() => { setActiveEvent(null); setScreen("events"); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGoRegister }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"24px 20px 40px" }}>
      <HajjHeader subtitle="Group Attendance System" />

      <div className="card" style={{ padding:28, marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:C.brown, marginBottom:6, textAlign:"center" }}>Welcome Back</h2>
        <p style={{ fontSize:13, color:C.textLight, textAlign:"center", marginBottom:24 }}>Sign in to your leader account</p>

        <label style={labelStyle}>Full Name</label>
        <input className="input-field" style={{ marginBottom:14 }} placeholder="e.g. Husain Dewaswala"
          value={name} onChange={e=>setName(e.target.value)} />

        <label style={labelStyle}>Password</label>
        <div style={{ position:"relative", marginBottom:24 }}>
          <input className="input-field" type={showPass?"text":"password"} placeholder="Enter password"
            value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onLogin(name,pass)}
            style={{ paddingRight:48 }} />
          <button onClick={()=>setShowPass(v=>!v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textLight }}>{showPass?"🙈":"👁"}</button>
        </div>

        <button className="btn-primary" style={{ width:"100%", padding:"15px 0", fontSize:16 }} onClick={()=>onLogin(name,pass)}>
          {Icon.mosque} Sign In
        </button>
      </div>

      <p style={{ textAlign:"center", fontSize:14, color:C.textLight }}>
        New leader?{" "}
        <span onClick={onGoRegister} style={{ color:C.gold, fontWeight:700, cursor:"pointer" }}>Create Account</span>
      </p>

      <Footer />
    </div>
  );
}

// ─── Register Screen ──────────────────────────────────────────────────────────
function RegisterScreen({ onRegister, onGoLogin }) {
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);

  function handleSubmit() {
    if (!name.trim()) { alert("Enter your full name"); return; }
    if (pass.length < 4) { alert("Password must be at least 4 characters"); return; }
    if (pass !== confirm) { alert("Passwords don't match"); return; }
    onRegister(name.trim(), pass);
  }

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"24px 20px 40px" }}>
      <HajjHeader subtitle="Group Attendance System" />

      <div className="card" style={{ padding:28, marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:C.brown, marginBottom:6, textAlign:"center" }}>Create Account</h2>
        <p style={{ fontSize:13, color:C.textLight, textAlign:"center", marginBottom:24 }}>Register as a Group Leader</p>

        <label style={labelStyle}>Your Full Name</label>
        <input className="input-field" style={{ marginBottom:14 }} placeholder="e.g. Ahmed Ali"
          value={name} onChange={e=>setName(e.target.value)} />

        <label style={labelStyle}>Password</label>
        <div style={{ position:"relative", marginBottom:14 }}>
          <input className="input-field" type={showPass?"text":"password"} placeholder="Create a password"
            value={pass} onChange={e=>setPass(e.target.value)} style={{ paddingRight:48 }} />
          <button onClick={()=>setShowPass(v=>!v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textLight }}>{showPass?"🙈":"👁"}</button>
        </div>

        <label style={labelStyle}>Confirm Password</label>
        <input className="input-field" type="password" style={{ marginBottom:24 }} placeholder="Re-enter password"
          value={confirm} onChange={e=>setConfirm(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />

        <button className="btn-primary" style={{ width:"100%", padding:"15px 0", fontSize:16 }} onClick={handleSubmit}>
          {Icon.kaaba} Create Account
        </button>
      </div>

      <p style={{ textAlign:"center", fontSize:14, color:C.textLight }}>
        Already have an account?{" "}
        <span onClick={onGoLogin} style={{ color:C.gold, fontWeight:700, cursor:"pointer" }}>Sign In</span>
      </p>

      <Footer />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardScreen({ user, onNav, onLogout }) {
  const totalMembers = user.members.length;
  const totalEvents = user.events.length;
  const lastEvent = user.events[user.events.length - 1];
  const lastPct = lastEvent ? Math.round(([...lastEvent.arrivedIds].length / totalMembers) * 100) || 0 : 0;

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${C.green} 0%, #1a4a35 100%)`, padding:"28px 20px 24px", borderRadius:"0 0 28px 28px", boxShadow:shadows.lg }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:12, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{Icon.mosque} Hajj Attendance</p>
            <h1 style={{ color:"#fff", fontSize:22, fontWeight:700, margin:0 }}>As-Salāmu ʿAlaykum</h1>
            <p style={{ color:C.goldLight, fontSize:15, fontWeight:600, marginTop:4 }}>{user.displayName}</p>
          </div>
          <button onClick={onLogout} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:12, padding:"8px 12px", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            Sign Out
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:20 }}>
          <StatPill label="Members" value={totalMembers} icon="👥" />
          <StatPill label="Events" value={totalEvents} icon="📋" />
          <StatPill label="Last Event" value={lastEvent ? `${lastPct}%` : "—"} icon="📊" />
        </div>
      </div>

      {/* Kaaba illustration */}
      <div style={{ textAlign:"center", padding:"20px 0 8px", fontSize:48 }}>🕋</div>
      <p style={{ textAlign:"center", fontSize:12, color:C.textLight, letterSpacing:1.5, textTransform:"uppercase", marginBottom:20 }}>لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ</p>

      {/* Menu Cards */}
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:14 }}>
        <MenuCard icon="👥" title="Manage Members" desc={`${totalMembers} members in your group`} color={C.gold} onClick={()=>onNav("members")} />
        <MenuCard icon="📋" title="Events & Attendance" desc={`${totalEvents} events created`} color={C.green} onClick={()=>onNav("events")} />
      </div>

      <Footer />
    </div>
  );
}

// ─── Members Screen ───────────────────────────────────────────────────────────
function MembersScreen({ user, onNav, onDelete, onImport, showToast }) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const filtered = user.members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || String(m.id).includes(search)
  );

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
      <TopBar title="Group Members" onBack={()=>onNav("dashboard")} />

      <div style={{ padding:"16px 20px 0" }}>
        {/* Actions */}
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <button className="btn-primary" style={{ flex:1, padding:"12px 0", fontSize:14 }} onClick={()=>onNav("addMember")}>
            + Add Member
          </button>
          <button className="btn-secondary" style={{ flex:1, padding:"12px 0", fontSize:13 }} onClick={()=>fileRef.current.click()}>
            📊 Import Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0]) { onImport(e.target.files[0]); e.target.value=""; } }} />
        </div>

        {/* Excel format hint */}
        <div style={{ background:"rgba(184,134,11,0.08)", border:`1px solid rgba(184,134,11,0.25)`, borderRadius:10, padding:"8px 14px", marginBottom:14, fontSize:12, color:C.brownLight }}>
          📊 Excel format: Column A = ID number, Column B = Member name
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom:14 }}>
          <span style={{ fontSize:16 }}>🔍</span>
          <input placeholder="Search by name or number…" value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <span onClick={()=>setSearch("")} style={{ cursor:"pointer", color:C.textLight, fontSize:18 }}>×</span>}
        </div>

        <p style={{ fontSize:12, color:C.textLight, marginBottom:10 }}>{filtered.length} of {user.members.length} members</p>
      </div>

      {/* List */}
      <div className="card" style={{ margin:"0 20px", overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:C.textLight }}>
            <div style={{ fontSize:40, marginBottom:8 }}>👥</div>
            <p>{user.members.length === 0 ? "No members yet. Add or import members." : "No results found."}</p>
          </div>
        ) : filtered.map(m => (
          <div key={m.id} className="member-row">
            <span style={{ width:36, height:36, borderRadius:10, background:C.goldPale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.brown, flexShrink:0 }}>{m.id}</span>
            <span style={{ flex:1, fontSize:14, color:C.text, fontWeight:500 }}>{m.name}</span>
            {confirmDelete === m.id ? (
              <div style={{ display:"flex", gap:6 }}>
                <button className="btn-danger" style={{ padding:"5px 10px", fontSize:12 }} onClick={()=>{ onDelete(m.id); setConfirmDelete(null); }}>Delete</button>
                <button className="btn-secondary" style={{ padding:"5px 10px", fontSize:12 }} onClick={()=>setConfirmDelete(null)}>Cancel</button>
              </div>
            ) : (
              <button onClick={()=>setConfirmDelete(m.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize:18, padding:"4px 8px" }}>✕</button>
            )}
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}

// ─── Add Member Screen ────────────────────────────────────────────────────────
function AddMemberScreen({ user, onAdd, onNav }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");

  const nextId = user.members.length > 0 ? Math.max(...user.members.map(m=>m.id)) + 1 : 1;

  function handleAdd() {
    const numId = parseInt(id);
    if (!name.trim()) { alert("Enter member name"); return; }
    if (!numId || numId < 1) { alert("Enter a valid ID number"); return; }
    const success = onAdd(name.trim(), numId);
    if (success) { setName(""); setId(String(nextId + 1)); }
  }

  useEffect(() => { setId(String(nextId)); }, []);

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
      <TopBar title="Add Member" onBack={()=>onNav("members")} />

      <div style={{ padding:"20px" }}>
        <div className="card" style={{ padding:24 }}>
          <div style={{ textAlign:"center", fontSize:40, marginBottom:12 }}>👤</div>
          <label style={labelStyle}>Member ID Number</label>
          <input className="input-field" type="number" style={{ marginBottom:14 }} placeholder="e.g. 1"
            value={id} onChange={e=>setId(e.target.value)} />

          <label style={labelStyle}>Member Full Name</label>
          <input className="input-field" style={{ marginBottom:24 }} placeholder="e.g. Ahmed Ali"
            value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleAdd()} />

          <button className="btn-primary" style={{ width:"100%", padding:"15px 0", fontSize:16 }} onClick={handleAdd}>
            + Add Member
          </button>
        </div>

        <div style={{ marginTop:16, background:"rgba(45,106,79,0.08)", border:`1px solid rgba(45,106,79,0.2)`, borderRadius:12, padding:14, fontSize:13, color:C.green }}>
          💡 Tip: You can also import multiple members at once using an Excel sheet from the Members page.
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── Events Screen ────────────────────────────────────────────────────────────
function EventsScreen({ user, onNav, onCreate, onOpen, onDelete }) {
  const [evName, setEvName] = useState("");
  const [evDate, setEvDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
      <TopBar title="Events" onBack={()=>onNav("dashboard")} />

      <div style={{ padding:"16px 20px 0" }}>
        <button className="btn-primary" style={{ width:"100%", padding:"13px 0", fontSize:15, marginBottom:16 }} onClick={()=>setShowForm(v=>!v)}>
          {showForm ? "✕ Cancel" : "+ Create New Event"}
        </button>

        {showForm && (
          <div className="card" style={{ padding:20, marginBottom:16, animation:"popIn 0.2s ease" }}>
            <label style={labelStyle}>Event Name</label>
            <input className="input-field" style={{ marginBottom:12 }} placeholder="e.g. Arafat Day Majlis"
              value={evName} onChange={e=>setEvName(e.target.value)} />
            <label style={labelStyle}>Date</label>
            <input className="input-field" type="date" style={{ marginBottom:16 }}
              value={evDate} onChange={e=>setEvDate(e.target.value)} />
            <button className="btn-green" style={{ width:"100%", padding:"13px 0", fontSize:15 }}
              onClick={()=>{ onCreate(evName,evDate); setEvName(""); setEvDate(""); setShowForm(false); }}>
              ✓ Create Event
            </button>
          </div>
        )}
      </div>

      {user.events.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:C.textLight }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <p>No events yet. Create your first event!</p>
        </div>
      ) : (
        <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {[...user.events].reverse().map(ev => {
            const total = user.members.length;
            const arrived = ev.arrivedIds.size;
            const pct = total ? Math.round((arrived/total)*100) : 0;
            return (
              <div key={ev.id} className="card" style={{ padding:0, overflow:"hidden" }}>
                <div style={{ padding:"16px 16px 12px", cursor:"pointer" }} onClick={()=>onOpen(ev)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{ev.name}</p>
                      <p style={{ margin:"3px 0 0", fontSize:12, color:C.textLight }}>📅 {formatDate(ev.date)}</p>
                    </div>
                    <span style={{ background: pct===100?C.green:C.goldPale, color:pct===100?"#fff":C.brown, fontSize:13, fontWeight:700, padding:"4px 12px", borderRadius:20 }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:"rgba(0,0,0,0.06)", borderRadius:8, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.green},${C.greenLight})`, borderRadius:8, transition:"width 0.4s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:C.textLight }}>
                    <span>✅ {arrived} arrived</span>
                    <span>⏳ {total-arrived} remaining</span>
                  </div>
                </div>
                <div style={{ borderTop:`1px solid rgba(212,175,55,0.15)`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <button className="btn-green" style={{ padding:"8px 20px", fontSize:13 }} onClick={()=>onOpen(ev)}>
                    Mark Attendance →
                  </button>
                  {confirmDelete===ev.id ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn-danger" style={{ padding:"6px 12px", fontSize:12 }} onClick={()=>{ onDelete(ev.id); setConfirmDelete(null); }}>Delete</button>
                      <button className="btn-secondary" style={{ padding:"6px 12px", fontSize:12 }} onClick={()=>setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirmDelete(ev.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize:18 }}>🗑</button>
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

// ─── Attendance Screen ────────────────────────────────────────────────────────
function AttendanceScreen({ user, event, onSave, onBack, showToast }) {
  const [arrivedIds, setArrivedIds] = useState(new Set(event.arrivedIds));
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | arrived | remaining
  const [lastChanged, setLastChanged] = useState(null);

  const members = user.members;
  const total = members.length;
  const arrivedCount = arrivedIds.size;
  const pct = total ? Math.round((arrivedCount/total)*100) : 0;

  function toggle(id) {
    setArrivedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); }
      else { n.add(id); }
      return n;
    });
    setLastChanged(id);
    // auto-save
    const updated = new Set(arrivedIds);
    if (updated.has(id)) updated.delete(id); else updated.add(id);
    onSave(updated);
  }

  function markAll() {
    const all = new Set(members.map(m=>m.id));
    setArrivedIds(all);
    onSave(all);
    showToast("All members marked present!");
  }

  function clearAll() {
    setArrivedIds(new Set());
    onSave(new Set());
    showToast("Attendance cleared", "warn");
  }

  const displayMembers = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || String(m.id).includes(search);
    if (!matchSearch) return false;
    if (tab === "arrived") return arrivedIds.has(m.id);
    if (tab === "remaining") return !arrivedIds.has(m.id);
    return true;
  });

  return (
    <div className="screen" style={{ maxWidth:420, margin:"0 auto", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${C.green} 0%, #1a4a35 100%)`, padding:"20px 20px 24px", borderRadius:"0 0 24px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:600 }}>← Back</button>
          <div>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#fff" }}>{event.name}</p>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.7)" }}>📅 {formatDate(event.date)}</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
          <StatPill label="Total" value={total} icon="👥" />
          <StatPill label="Arrived" value={arrivedCount} icon="✅" highlight />
          <StatPill label="Remaining" value={total-arrivedCount} icon="⏳" />
        </div>

        {/* Progress */}
        <div style={{ height:8, background:"rgba(255,255,255,0.2)", borderRadius:10, overflow:"hidden", marginBottom:6 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.goldLight},${C.goldPale})`, borderRadius:10, transition:"width 0.4s" }} />
        </div>
        <p style={{ color:"rgba(255,255,255,0.8)", fontSize:12, textAlign:"right", margin:0 }}>{pct}% attendance</p>
      </div>

      <div style={{ padding:"16px 20px 0" }}>
        {/* Quick actions */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <button className="btn-green" style={{ flex:1, padding:"10px 0", fontSize:13 }} onClick={markAll}>✓ Mark All</button>
          <button className="btn-secondary" style={{ flex:1, padding:"10px 0", fontSize:13 }} onClick={clearAll}>↺ Clear All</button>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom:12 }}>
          <span>🔍</span>
          <input placeholder="Search member…" value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <span onClick={()=>setSearch("")} style={{ cursor:"pointer", color:C.textLight, fontSize:18 }}>×</span>}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:14, background:"rgba(255,255,255,0.6)", borderRadius:14, padding:4 }}>
          {[["all","All"],["arrived","✅ Arrived"],["remaining","⏳ Remaining"]].map(([val,label])=>(
            <button key={val} className="tab-btn" style={{ flex:1, background:tab===val?C.white:"transparent", color:tab===val?C.green:C.textLight, boxShadow:tab===val?shadows.sm:"none" }}
              onClick={()=>setTab(val)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Member list with checkboxes */}
      <div className="card" style={{ margin:"0 20px", overflow:"hidden" }}>
        {displayMembers.length === 0 ? (
          <div style={{ padding:30, textAlign:"center", color:C.textLight, fontSize:14 }}>
            {members.length===0 ? "No members in this group yet." : "No members match your filter."}
          </div>
        ) : displayMembers.map(m => {
          const isArrived = arrivedIds.has(m.id);
          return (
            <div key={m.id} className="member-row" style={{ background: isArrived ? "rgba(45,106,79,0.06)" : "transparent" }}
              onClick={()=>toggle(m.id)}>
              {/* Checkbox */}
              <div className={`checkbox-custom ${isArrived?"checked":""}`}>
                {isArrived && <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>✓</span>}
              </div>
              {/* ID badge */}
              <span style={{ width:32, height:32, borderRadius:8, background:isArrived?C.green:C.goldPale, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:isArrived?"#fff":C.brown, flexShrink:0, transition:"all 0.2s" }}>{m.id}</span>
              {/* Name */}
              <span style={{ flex:1, fontSize:14, color:isArrived?C.green:C.text, fontWeight:isArrived?600:400, transition:"all 0.2s" }}>{m.name}</span>
              {/* Status */}
              {isArrived && <span style={{ fontSize:11, color:C.greenLight, fontWeight:600 }}>Present</span>}
            </div>
          );
        })}
      </div>

      {arrivedCount === total && total > 0 && (
        <div style={{ margin:"20px 20px 0", background:`linear-gradient(135deg,${C.green},#1a4a35)`, borderRadius:16, padding:"20px", textAlign:"center", animation:"popIn 0.3s ease" }}>
          <div style={{ fontSize:36 }}>🎉</div>
          <p style={{ color:"#fff", fontWeight:700, fontSize:16, margin:"8px 0 4px" }}>Full Attendance!</p>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>All {total} members are present. الحمد لله</p>
        </div>
      )}

      <Footer />
    </div>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────────────
function HajjHeader({ subtitle }) {
  return (
    <div style={{ textAlign:"center", padding:"24px 0 28px" }}>
      <div style={{ fontSize:52, marginBottom:8, filter:"drop-shadow(0 4px 12px rgba(184,134,11,0.3))" }}>🕌</div>
      <h1 style={{ fontSize:26, fontWeight:700, color:C.brown, margin:0, fontFamily:"Amiri, Georgia, serif", letterSpacing:1 }}>Hajj Attendance</h1>
      <p style={{ fontSize:12, color:C.textLight, letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>{subtitle}</p>
      <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:10, color:C.gold, fontSize:12 }}>
        {"✦ ☽ ✦".split(" ").map((s,i)=><span key={i}>{s}</span>)}
      </div>
    </div>
  );
}

function TopBar({ title, onBack }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px 12px", background:C.cardBg, borderBottom:`1px solid rgba(212,175,55,0.2)`, position:"sticky", top:0, zIndex:10, boxShadow:shadows.sm }}>
      <button onClick={onBack} style={{ background:C.goldPale, border:"none", borderRadius:10, padding:"8px 14px", color:C.brown, cursor:"pointer", fontSize:14, fontWeight:700 }}>←</button>
      <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.brown }}>{title}</h2>
    </div>
  );
}

function StatPill({ label, value, icon, highlight }) {
  return (
    <div style={{ background:highlight?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
      <div style={{ fontSize:18 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:700, color:"#fff", lineHeight:1.2 }}>{value}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.75)", marginTop:2, letterSpacing:0.5 }}>{label}</div>
    </div>
  );
}

function MenuCard({ icon, title, desc, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background:C.cardBg, borderRadius:18, padding:"20px", display:"flex", alignItems:"center", gap:16, boxShadow:shadows.md, border:`1px solid rgba(212,175,55,0.2)`, cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s", active:{transform:"scale(0.98)"} }}
      onTouchStart={e=>e.currentTarget.style.transform="scale(0.98)"}
      onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
      <div style={{ width:52, height:52, borderRadius:16, background:`linear-gradient(135deg,${color}22,${color}44)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <p style={{ margin:0, fontSize:16, fontWeight:700, color:C.text }}>{title}</p>
        <p style={{ margin:"3px 0 0", fontSize:12, color:C.textLight }}>{desc}</p>
      </div>
      <span style={{ fontSize:20, color:C.border }}>›</span>
    </div>
  );
}

function Footer() {
  return (
    <p style={{ textAlign:"center", fontSize:12, color:C.textLight, marginTop:32, padding:"0 20px", lineHeight:1.8 }}>
      <span style={{ color:C.gold }}>✦</span> Made by <strong style={{ color:C.brown }}>Husain Dewaswala</strong> <span style={{ color:C.gold }}>✦</span>
    </p>
  );
}

const labelStyle = { display:"block", fontSize:13, fontWeight:600, color:C.textLight, marginBottom:6, letterSpacing:0.3 };
