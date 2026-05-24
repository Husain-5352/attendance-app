import { useState, useRef, useEffect } from "react";

const MEMBERS = [
  { id: 1,  name: "M.Husain Dewaswala",         gender: "male"   },
  { id: 2,  name: "M.Husain Hakimji",            gender: "male"   },
  { id: 3,  name: "M.Murtaza Raswala",           gender: "male"   },
  { id: 4,  name: "Akberali Kota wala",          gender: "male"   },
  { id: 5,  name: "Firoz lokhandwala",           gender: "male"   },
  { id: 6,  name: "Akber Ali Dewaswala",         gender: "male"   },
  { id: 7,  name: "M.Ammar Kanchwala",           gender: "male"   },
  { id: 8,  name: "Shabbir Husain Lokhandwala",  gender: "male"   },
  { id: 9,  name: "Shabbir Husain bigodwala",    gender: "male"   },
  { id: 10, name: "Baqir bh chalni wala",        gender: "male"   },
  { id: 11, name: "Khozema bh Peti wala",        gender: "male"   },
  { id: 12, name: "Qaidjohar bh dhamangaon",     gender: "male"   },
  { id: 13, name: "Zulfiqar bh Kapasi",          gender: "male"   },
  { id: 14, name: "Shabbir Husain thekedar",     gender: "male"   },
  { id: 15, name: "Shk. Mustafa burhani",        gender: "male"   },
  { id: 16, name: "Abidali runderwala",          gender: "male"   },
  { id: 17, name: "Imran bh Dhamman",            gender: "male"   },
  { id: 18, name: "Shoeb bh Samrat",             gender: "male"   },
  { id: 19, name: "Husain Malak",                gender: "male"   },
  { id: 20, name: "Taher shakru",                gender: "male"   },
  { id: 21, name: "Hasanji Nala wala",           gender: "male"   },
  { id: 22, name: "Shabbir chaati",              gender: "male"   },
  { id: 23, name: "Shabbir vadgaam",             gender: "male"   },
  { id: 24, name: "Taher nala",                  gender: "male"   },
  { id: 25, name: "Husaina bn hakimji",          gender: "female" },
  { id: 26, name: "Arwa bn raswala",             gender: "female" },
  { id: 27, name: "Tasneem bn dewaswala",        gender: "female" },
  { id: 28, name: "Fatema bn kanchwala",         gender: "female" },
  { id: 29, name: "Fatema bn lokhandwala",       gender: "female" },
  { id: 30, name: "Tasneem bn lokhandwala",      gender: "female" },
  { id: 31, name: "Sakina bn kotawala",          gender: "female" },
  { id: 32, name: "Zahabiyah bn bigodwala",      gender: "female" },
  { id: 33, name: "Fatema bn chalni",            gender: "female" },
  { id: 34, name: "Khadija bn petiwala",         gender: "female" },
  { id: 35, name: "Shakera bn dhamangaon",       gender: "female" },
  { id: 36, name: "Khadija bn runderawala",      gender: "female" },
  { id: 37, name: "Mariya bn thekedar",          gender: "female" },
  { id: 38, name: "Sabera bn damman",            gender: "female" },
  { id: 39, name: "Tahera bn Samrat",            gender: "female" },
  { id: 40, name: "Farida bn kapasi",            gender: "female" },
  { id: 41, name: "Rashida bn shakruwala",       gender: "female" },
  { id: 42, name: "Sakina bn Malak",             gender: "female" },
  { id: 43, name: "Fatema bn Chati",             gender: "female" },
  { id: 44, name: "Mariya bn nala wala",         gender: "female" },
  { id: 45, name: "Mariya bn vadgam",            gender: "female" },
  { id: 46, name: "Sakina bn nalawala",          gender: "female" },
];

const TOTAL = MEMBERS.length;

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AttendanceApp() {
  const [screen, setScreen] = useState("home");
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [arrivedIds, setArrivedIds] = useState(new Set());
  const [inputVal, setInputVal] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const dropRef = useRef(null);

  const filteredMembers = MEMBERS.filter(m => {
    const s = dropdownSearch.toLowerCase();
    return m.name.toLowerCase().includes(s) || String(m.id).includes(s);
  });

  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  }

  function markArrived(member) {
    if (arrivedIds.has(member.id)) {
      showToast(`#${member.id} ${member.name} already marked!`, "warn");
      setFlashId(member.id);
      setTimeout(() => setFlashId(null), 800);
      return;
    }
    setArrivedIds(prev => new Set([...prev, member.id]));
    showToast(`✓ ${member.name} marked present`, "success");
    setFlashId(member.id);
    setTimeout(() => setFlashId(null), 800);
  }

  function handleNumberSubmit() {
    const num = parseInt(inputVal.trim());
    if (isNaN(num) || num < 1 || num > TOTAL) {
      showToast("Invalid member number!", "error");
      return;
    }
    markArrived(MEMBERS.find(m => m.id === num));
    setInputVal("");
  }

  function handleDropdownSelect(member) {
    markArrived(member);
    setDropdownOpen(false);
    setDropdownSearch("");
  }

  function handleCreateEvent() {
    if (!newEventName.trim() || !newEventDate) {
      showToast("Please fill event name & date.", "error");
      return;
    }
    setEvents(prev => [...prev, { id: Date.now(), name: newEventName.trim(), date: newEventDate, arrivedIds: new Set() }]);
    setNewEventName(""); setNewEventDate("");
    showToast("Event created!", "success");
  }

  function openEvent(ev) {
    setActiveEvent(ev);
    setArrivedIds(new Set(ev.arrivedIds));
    setScreen("attendance");
  }

  function saveAndBack() {
    setEvents(prev => prev.map(e => e.id === activeEvent.id ? { ...e, arrivedIds } : e));
    setActiveEvent(null);
    setScreen("event");
  }

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false); setDropdownSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const arrived = [...arrivedIds].map(id => MEMBERS.find(m => m.id === id));
  const remaining = MEMBERS.filter(m => !arrivedIds.has(m.id));

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c1a 0%,#1a1030 50%,#0d1a2a 100%)", fontFamily:"Georgia,'Times New Roman',serif", color:"#e8dfc8", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", top:-80, right:-80, width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(212,175,55,0.13) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:-60, left:-60, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(100,180,255,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />

      {toast && (
        <div style={{ position:"fixed", top:18, left:"50%", transform:"translateX(-50%)", zIndex:9999, padding:"10px 22px", borderRadius:40, background:toast.type==="success"?"rgba(34,197,94,0.92)":toast.type==="warn"?"rgba(234,179,8,0.92)":"rgba(220,38,38,0.92)", color:"#fff", fontSize:13, fontWeight:600, boxShadow:"0 4px 24px rgba(0,0,0,0.4)", letterSpacing:0.3 }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flashGreen{0%,100%{background:transparent}50%{background:rgba(34,197,94,0.25)}}
        .card-hover{transition:box-shadow 0.2s,transform 0.15s}.card-hover:active{transform:scale(0.97)}
        .member-chip:hover{background:rgba(212,175,55,0.18)!important}
        input:focus{outline:none}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(212,175,55,0.3);border-radius:8px}
        .btn-gold{background:linear-gradient(135deg,#c9a227,#e8c84a);color:#1a1030;font-weight:700;border:none;border-radius:14px;cursor:pointer;transition:opacity 0.15s,transform 0.12s;font-family:Georgia,serif}
        .btn-gold:active{transform:scale(0.96);opacity:0.85}
        .btn-ghost{background:rgba(212,175,55,0.1);color:#d4af37;border:1.5px solid rgba(212,175,55,0.35);border-radius:14px;cursor:pointer;transition:background 0.15s;font-family:Georgia,serif}
        .btn-ghost:hover{background:rgba(212,175,55,0.18)}
        .flash-green{animation:flashGreen 0.5s ease}
      `}</style>

      {/* HOME */}
      {screen==="home" && (
        <div style={{ maxWidth:420, margin:"0 auto", padding:"32px 18px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:32, animation:"slideUp 0.5s ease" }}>
            <div style={{ fontSize:38, marginBottom:4 }}>🕌</div>
            <h1 style={{ margin:0, fontSize:24, fontWeight:700, letterSpacing:1.5, color:"#d4af37", textShadow:"0 2px 12px rgba(212,175,55,0.3)" }}>Attendance Manager</h1>
            <p style={{ margin:"6px 0 0", fontSize:12, color:"#8a7a5a", letterSpacing:2, textTransform:"uppercase" }}>Group Leader Dashboard</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:28 }}>
            <StatCard label="Total Members" value={TOTAL} icon="👥" color="#d4af37" />
            <StatCard label="Total Events" value={events.length} icon="📅" color="#7dd3fc" />
          </div>
          <button className="btn-gold" style={{ width:"100%", padding:"15px 0", fontSize:15, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={()=>setScreen("event")}>
            <span style={{fontSize:18}}>📋</span> Manage Events
          </button>
          <button className="btn-ghost" style={{ width:"100%", padding:"13px 0", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={()=>setScreen("members")}>
            <span>👁</span> View All Members
          </button>
        </div>
      )}

      {/* MEMBERS */}
      {screen==="members" && (
        <div style={{ maxWidth:420, margin:"0 auto", padding:"24px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <button className="btn-ghost" style={{ padding:"8px 14px", fontSize:13 }} onClick={()=>setScreen("home")}>← Back</button>
            <h2 style={{ margin:0, fontSize:18, color:"#d4af37" }}>All Members ({TOTAL})</h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {MEMBERS.map(m=>(
              <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 14px", border:"1px solid rgba(212,175,55,0.1)" }}>
                <span style={{ minWidth:28, height:28, borderRadius:8, background:m.gender==="male"?"rgba(96,165,250,0.2)":"rgba(244,114,182,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:m.gender==="male"?"#93c5fd":"#f9a8d4" }}>{m.id}</span>
                <span style={{ fontSize:13.5, color:"#e8dfc8" }}>{m.name}</span>
                <span style={{ marginLeft:"auto", fontSize:11, color:m.gender==="male"?"#93c5fd":"#f9a8d4", background:m.gender==="male"?"rgba(96,165,250,0.1)":"rgba(244,114,182,0.1)", padding:"2px 8px", borderRadius:20 }}>{m.gender==="male"?"♂":"♀"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVENTS */}
      {screen==="event" && (
        <div style={{ maxWidth:420, margin:"0 auto", padding:"24px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
            <button className="btn-ghost" style={{ padding:"8px 14px", fontSize:13 }} onClick={()=>setScreen("home")}>← Back</button>
            <h2 style={{ margin:0, fontSize:18, color:"#d4af37" }}>Events</h2>
          </div>
          <div style={{ background:"rgba(212,175,55,0.07)", border:"1.5px solid rgba(212,175,55,0.2)", borderRadius:18, padding:"18px 16px", marginBottom:24 }}>
            <p style={{ margin:"0 0 12px", fontSize:12, color:"#d4af37", letterSpacing:1.5, textTransform:"uppercase", fontWeight:700 }}>Create New Event</p>
            <input placeholder="Event name (e.g. Majlis 1, Ashura...)" value={newEventName} onChange={e=>setNewEventName(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(212,175,55,0.2)", borderRadius:10, padding:"11px 14px", color:"#e8dfc8", fontSize:14, marginBottom:10, fontFamily:"Georgia,serif" }} />
            <input type="date" value={newEventDate} onChange={e=>setNewEventDate(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(212,175,55,0.2)", borderRadius:10, padding:"11px 14px", color:"#e8dfc8", fontSize:14, marginBottom:14, fontFamily:"Georgia,serif" }} />
            <button className="btn-gold" style={{ width:"100%", padding:"12px 0", fontSize:14 }} onClick={handleCreateEvent}>+ Create Event</button>
          </div>
          {events.length===0 ? (
            <p style={{ textAlign:"center", color:"#5a4e38", fontSize:13, marginTop:30 }}>No events yet. Create one above.</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {events.map(ev=>{
                const pct=Math.round((ev.arrivedIds.size/TOTAL)*100);
                return (
                  <div key={ev.id} className="card-hover" style={{ background:"rgba(255,255,255,0.04)", border:"1.5px solid rgba(212,175,55,0.15)", borderRadius:16, padding:"14px 16px", cursor:"pointer", animation:"popIn 0.25s ease" }} onClick={()=>openEvent(ev)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <p style={{ margin:0, fontSize:15, fontWeight:700, color:"#e8dfc8" }}>{ev.name}</p>
                        <p style={{ margin:"3px 0 0", fontSize:11, color:"#8a7a5a" }}>📅 {formatDate(ev.date)}</p>
                      </div>
                      <span style={{ fontSize:12, color:"#d4af37", background:"rgba(212,175,55,0.12)", padding:"4px 10px", borderRadius:20, fontWeight:600 }}>{pct}%</span>
                    </div>
                    <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:6, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#c9a227,#e8c84a)", borderRadius:6, transition:"width 0.4s ease" }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12, color:"#8a7a5a" }}>
                      <span>✅ {ev.arrivedIds.size} arrived</span>
                      <span>⏳ {TOTAL-ev.arrivedIds.size} remaining</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE */}
      {screen==="attendance" && activeEvent && (
        <div style={{ maxWidth:420, margin:"0 auto", padding:"20px 16px 32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <button className="btn-ghost" style={{ padding:"8px 12px", fontSize:12 }} onClick={saveAndBack}>← Save & Back</button>
            <div>
              <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#d4af37" }}>{activeEvent.name}</p>
              <p style={{ margin:0, fontSize:11, color:"#8a7a5a" }}>📅 {formatDate(activeEvent.date)}</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            <MiniStat label="Total" value={TOTAL} color="#d4af37" />
            <MiniStat label="Arrived" value={arrivedIds.size} color="#4ade80" />
            <MiniStat label="Remaining" value={TOTAL-arrivedIds.size} color="#f87171" />
          </div>
          <div style={{ marginBottom:22 }}>
            <div style={{ height:8, background:"rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.round((arrivedIds.size/TOTAL)*100)}%`, background:"linear-gradient(90deg,#22c55e,#4ade80)", borderRadius:10, transition:"width 0.5s ease" }} />
            </div>
            <p style={{ margin:"5px 0 0", fontSize:11, color:"#8a7a5a", textAlign:"right" }}>{Math.round((arrivedIds.size/TOTAL)*100)}% attendance</p>
          </div>

          <div style={{ background:"rgba(212,175,55,0.06)", border:"1.5px solid rgba(212,175,55,0.18)", borderRadius:18, padding:"16px", marginBottom:20 }}>
            <p style={{ margin:"0 0 12px", fontSize:12, color:"#d4af37", textTransform:"uppercase", letterSpacing:1.5, fontWeight:700 }}>Mark Attendance</p>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input type="number" min={1} max={TOTAL} placeholder={`Enter no. (1–${TOTAL})`} value={inputVal}
                onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleNumberSubmit()}
                style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(212,175,55,0.22)", borderRadius:10, padding:"11px 14px", color:"#e8dfc8", fontSize:15, fontFamily:"Georgia,serif" }} />
              <button className="btn-gold" style={{ padding:"11px 16px", fontSize:14, borderRadius:10 }} onClick={handleNumberSubmit}>✓</button>
            </div>
            <div style={{ position:"relative" }} ref={dropRef}>
              <button className="btn-ghost" style={{ width:"100%", padding:"11px 14px", fontSize:13, textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}
                onClick={()=>{setDropdownOpen(v=>!v);setDropdownSearch("");}}>
                <span>Select member from list…</span>
                <span style={{fontSize:11}}>{dropdownOpen?"▲":"▼"}</span>
              </button>
              {dropdownOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:100, background:"#1a1030", border:"1.5px solid rgba(212,175,55,0.25)", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", overflow:"hidden", animation:"popIn 0.15s ease" }}>
                  <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
                    <input autoFocus placeholder="Search name or number…" value={dropdownSearch} onChange={e=>setDropdownSearch(e.target.value)}
                      style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(212,175,55,0.18)", borderRadius:8, padding:"8px 12px", color:"#e8dfc8", fontSize:13, fontFamily:"Georgia,serif" }} />
                  </div>
                  <div style={{ maxHeight:240, overflowY:"auto" }}>
                    {filteredMembers.length===0 && <p style={{ textAlign:"center", color:"#5a4e38", fontSize:13, padding:14 }}>No results</p>}
                    {filteredMembers.map(m=>{
                      const isArrived=arrivedIds.has(m.id);
                      return (
                        <div key={m.id} onClick={()=>!isArrived&&handleDropdownSelect(m)}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:isArrived?"not-allowed":"pointer", background:isArrived?"rgba(34,197,94,0.08)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.04)", opacity:isArrived?0.5:1, transition:"background 0.12s" }}
                          className={isArrived?"":"member-chip"}>
                          <span style={{ minWidth:26, fontSize:11, fontWeight:700, color:"#d4af37", background:"rgba(212,175,55,0.12)", padding:"2px 6px", borderRadius:6 }}>{m.id}</span>
                          <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                          {isArrived&&<span style={{fontSize:12,color:"#4ade80"}}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {arrivedIds.size>0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:"0 0 10px", fontSize:12, color:"#4ade80", textTransform:"uppercase", letterSpacing:1.5, fontWeight:700 }}>✅ Arrived ({arrivedIds.size})</p>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {arrived.map(m=>(
                  <div key={m.id} className={flashId===m.id?"flash-green":""} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.18)", borderRadius:10, padding:"9px 13px", animation:"slideUp 0.2s ease" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#4ade80", minWidth:22 }}>{m.id}</span>
                    <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                    <button onClick={()=>{setArrivedIds(prev=>{const n=new Set(prev);n.delete(m.id);return n;});}}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:14, padding:0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remaining.length>0 && (
            <div>
              <p style={{ margin:"0 0 10px", fontSize:12, color:"#f87171", textTransform:"uppercase", letterSpacing:1.5, fontWeight:700 }}>⏳ Remaining ({remaining.length})</p>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {remaining.map(m=>(
                  <div key={m.id} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.12)", borderRadius:10, padding:"9px 13px", cursor:"pointer" }}
                    className="member-chip" onClick={()=>markArrived(m)}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#f87171", minWidth:22 }}>{m.id}</span>
                    <span style={{ fontSize:13, color:"#e8dfc8", flex:1 }}>{m.name}</span>
                    <span style={{ fontSize:11, color:"#6b7280" }}>Tap →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {arrivedIds.size===TOTAL && (
            <div style={{ textAlign:"center", padding:"24px 0", animation:"popIn 0.3s ease" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
              <p style={{ color:"#4ade80", fontSize:16, fontWeight:700, margin:0 }}>Full Attendance!</p>
              <p style={{ color:"#8a7a5a", fontSize:12, margin:"4px 0 0" }}>All {TOTAL} members have arrived.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({label,value,icon,color}){
  return(
    <div style={{background:"rgba(255,255,255,0.04)",border:`1.5px solid ${color}30`,borderRadius:16,padding:"16px 14px",textAlign:"center"}}>
      <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:26,fontWeight:700,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:11,color:"#8a7a5a",marginTop:4,letterSpacing:0.5}}>{label}</div>
    </div>
  );
}

function MiniStat({label,value,color}){
  return(
    <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${color}25`,borderRadius:14,padding:"12px 8px",textAlign:"center"}}>
      <div style={{fontSize:22,fontWeight:700,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:10,color:"#8a7a5a",marginTop:3,letterSpacing:0.5}}>{label}</div>
    </div>
  );
}
