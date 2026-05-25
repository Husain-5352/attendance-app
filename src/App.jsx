import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

const DB_KEY = "hajj_v4";
const RADIUS_METERS = 300;

const C = {
  gold:"#B8860B", goldLight:"#D4AF37", goldPale:"#FBF0CC",
  green:"#2D6A4F", greenLight:"#52B788",
  brown:"#5C3317", brownLight:"#8B5E3C",
  red:"#C0392B", white:"#FFFFFF",
  text:"#2C1810", textLight:"#7A5C4A",
  border:"#D9C49A", cardBg:"#FFFEF7",
  blue:"#1a73e8",
};

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

// ── DB ────────────────────────────────────────────────────────────────────────
function defaultDB() {
  return {
    // leaders keyed by username slug
    leaders: {
      "husain_dewaswala": {
        slug: "husain_dewaswala",
        displayName: "Husain Dewaswala",
        password: "7865253",
        hizbNo: 53,           // fixed hizb no
        members: HUSAIN_MEMBERS,
        events: [],
        location: null,
      }
    },
    memberAccounts: {}
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { const d = defaultDB(); saveDB(d); return d; }
    const db = JSON.parse(raw);
    if (!db.leaders) db.leaders = {};
    if (!db.memberAccounts) db.memberAccounts = {};
    // migrate old numeric-keyed leaders to slug keys
    const numericKeys = Object.keys(db.leaders).filter(k => !isNaN(parseInt(k)));
    numericKeys.forEach(k => {
      const l = db.leaders[k];
      const slug = l.slug || l.displayName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
      if (!db.leaders[slug]) {
        db.leaders[slug] = {...l, slug, hizbNo: parseInt(k)};
      }
      delete db.leaders[k];
    });
    // always ensure Husain
    if (!db.leaders["husain_dewaswala"]) {
      db.leaders["husain_dewaswala"] = defaultDB().leaders["husain_dewaswala"];
    } else {
      db.leaders["husain_dewaswala"].password = "7865253";
      db.leaders["husain_dewaswala"].hizbNo = 53;
      db.leaders["husain_dewaswala"].slug = "husain_dewaswala";
      if (!db.leaders["husain_dewaswala"].members?.length)
        db.leaders["husain_dewaswala"].members = HUSAIN_MEMBERS;
    }
    // deserialize events
    Object.values(db.leaders).forEach(l => {
      (l.events||[]).forEach(ev => {
        if (!ev.arrivedIds) ev.arrivedIds = [];
        if (!ev.memberAttendance) ev.memberAttendance = {};
      });
    });
    return db;
  } catch(e) {
    console.error(e);
    const d = defaultDB(); saveDB(d); return d;
  }
}

function saveDB(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  catch(e) { console.error(e); }
}

function fmtDate(s) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
  catch(e) { return s; }
}
function fmtTime(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}); }
  catch(e) { return ""; }
}
function getDistance(lat1,lng1,lat2,lng2) {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [t,setT]=useState(null);
  const show=(msg,type="ok")=>{ setT({msg,type}); setTimeout(()=>setT(null),2800); };
  return [t,show];
}

const GS = `
  @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
  .pg{animation:fadeUp 0.32s ease}
  .bp{background:linear-gradient(135deg,#B8860B,#D4AF37);color:#3a1f00;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;transition:all 0.15s;box-shadow:0 3px 12px rgba(184,134,11,0.28)}
  .bp:active{transform:scale(0.96)}
  .bg{background:linear-gradient(135deg,#2D6A4F,#52B788);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;transition:all 0.15s;box-shadow:0 3px 12px rgba(45,106,79,0.28)}
  .bg:active{transform:scale(0.96)}
  .bb{background:linear-gradient(135deg,#1a73e8,#4285f4);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;transition:all 0.15s;box-shadow:0 3px 12px rgba(26,115,232,0.28)}
  .bb:active{transform:scale(0.96)}
  .bs{background:#fff;color:#5C3317;border:2px solid #D9C49A;border-radius:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;transition:all 0.15s}
  .bs:active{transform:scale(0.96)}
  .bd{background:linear-gradient(135deg,#E74C3C,#C0392B);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif}
  .bd:active{transform:scale(0.96)}
  .inp{background:#fff;border:2px solid #D9C49A;border-radius:12px;padding:13px 16px;font-size:15px;color:#2C1810;font-family:Poppins,sans-serif;width:100%;box-sizing:border-box;-webkit-appearance:none;transition:border 0.2s}
  .inp:focus{outline:none;border-color:#B8860B;box-shadow:0 0 0 3px rgba(184,134,11,0.12)}
  .card{background:#FFFEF7;border-radius:20px;box-shadow:0 4px 16px rgba(107,58,42,0.12);border:1px solid rgba(212,175,55,0.18)}
  .mr{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid rgba(212,175,55,0.13);transition:background 0.12s}
  .mr:last-child{border-bottom:none}
  .mr:active{background:rgba(212,175,55,0.08)}
  .chk{width:26px;height:26px;border-radius:8px;border:2.5px solid #D9C49A;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.18s;background:#fff}
  .chk.on{background:#2D6A4F;border-color:#2D6A4F}
  .sb{display:flex;align-items:center;background:#fff;border:2px solid #D9C49A;border-radius:12px;padding:0 14px;gap:8px}
  .sb input{border:none;background:transparent;padding:12px 0;font-size:14px;color:#2C1810;font-family:Poppins,sans-serif;flex:1;min-width:0}
  .sb input:focus{outline:none}
  .tb{padding:9px 10px;border-radius:18px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:Poppins,sans-serif;flex:1}
  input[type=date]{color-scheme:light}
  select.inp option{color:#2C1810;background:#fff}
  *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
  @keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
  .gps-banner{animation:slideDown 0.4s ease;position:relative;overflow:hidden}
  .gps-banner::before{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);animation:shimmer 2s infinite}
  @keyframes shimmer{from{left:-100%}to{left:150%}}
`;

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(loadDB);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("hajj_s4")||"null"); } catch(e){return null;}
  });
  const [page, setPage] = useState(()=>
    session ? (session.role==="leader"?"lHome":"mHome") : "entry"
  );
  const [activeEv, setActiveEv] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(()=>{ saveDB(db); },[db]);
  useEffect(()=>{
    try { sessionStorage.setItem("hajj_s4",JSON.stringify(session)); } catch(e){}
    if (!session) setPage("entry");
    else setPage(session.role==="leader"?"lHome":"mHome");
  },[session]);

  function patchLeader(slug,fn) {
    setDb(prev=>{
      const u={...prev,leaders:{...prev.leaders,[slug]:fn(prev.leaders[slug])}};
      saveDB(u); return u;
    });
  }
  function patchMemberAcc(key,fn) {
    setDb(prev=>{
      const u={...prev,memberAccounts:{...prev.memberAccounts,[key]:fn(prev.memberAccounts[key])}};
      saveDB(u); return u;
    });
  }

  const leader = session?.role==="leader" ? db.leaders[session.slug] : null;
  const memberAcc = session?.role==="member" ? db.memberAccounts[session.key] : null;

  // ── LEADER AUTH ──
  function leaderRegister(name,password,hizbNo) {
    const no=parseInt(hizbNo);
    if (!name.trim()||!password||!no){showToast("Fill all fields","err");return;}
    if (password.length<4){showToast("Password min 4 chars","err");return;}
    const slug=name.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    if (db.leaders[slug]){showToast("Account already exists for this name","err");return;}
    // check hizbNo not already taken by another leader
    const hizbTaken=Object.values(db.leaders).find(l=>l.hizbNo===no);
    if (hizbTaken){showToast("Hizb #"+no+" already assigned to "+hizbTaken.displayName,"err");return;}
    const nl={slug,displayName:name.trim(),password,hizbNo:no,members:[],events:[],location:null};
    setDb(prev=>{const u={...prev,leaders:{...prev.leaders,[slug]:nl}};saveDB(u);return u;});
    setSession({role:"leader",slug});
    showToast("Welcome, "+name.trim()+"!");
  }

  function leaderLogin(name,password,hizbNo) {
    const no=parseInt(hizbNo);
    if (!name.trim()||!password||!no){showToast("Fill all fields","err");return;}
    const slug=name.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    const l=db.leaders[slug];
    if (!l){showToast("Account not found. Please register first.","err");return;}
    if (l.password!==password){showToast("Wrong password","err");return;}
    // If leader has no hizbNo yet, assign it now (first time adding hizbNo)
    if (!l.hizbNo) {
      // check not taken
      const taken=Object.values(db.leaders).find(x=>x.hizbNo===no && x.slug!==slug);
      if (taken){showToast("Hizb #"+no+" already taken by "+taken.displayName,"err");return;}
      patchLeader(slug, x=>({...x, hizbNo:no}));
      setSession({role:"leader",slug});
      showToast("Welcome! Hizb #"+no+" linked to your account.");
    } else {
      // hizbNo is fixed - must match
      if (l.hizbNo!==no){showToast("Wrong Hizb No. Your Hizb is #"+l.hizbNo,"err");return;}
      setSession({role:"leader",slug});
      showToast("Welcome back, "+l.displayName+"!");
    }
  }

  // ── MEMBER AUTH ──
  // Members register: hizbNo + memberName (selected from dropdown) + password
  function memberRegister(hizbNo,memberName,password) {
    const no=parseInt(hizbNo);
    // find leader by hizbNo
    const leaderEntry=Object.values(db.leaders).find(l=>l.hizbNo===no);
    if (!leaderEntry){showToast("Hizb #"+no+" not found","err");return;}
    if (!memberName){showToast("Select your name","err");return;}
    if (!password||password.length<4){showToast("Password min 4 chars","err");return;}
    const key=no+"_"+memberName.toLowerCase().replace(/\s+/g,"_");
    if (db.memberAccounts[key]){showToast("Account already exists for this name","err");return;}
    const m=leaderEntry.members.find(m=>m.name.toLowerCase()===memberName.toLowerCase());
    const nm={key,hizbNo:no,memberName,leaderSlug:leaderEntry.slug,leaderName:leaderEntry.displayName,memberId:m?m.id:null,password};
    setDb(prev=>{const u={...prev,memberAccounts:{...prev.memberAccounts,[key]:nm}};saveDB(u);return u;});
    setSession({role:"member",key,hizbNo:no});
    showToast("Welcome, "+memberName+"!");
  }

  function memberLogin(hizbNo,memberName,password) {
    const no=parseInt(hizbNo);
    const leaderEntry=Object.values(db.leaders).find(l=>l.hizbNo===no);
    if (!leaderEntry){showToast("Hizb #"+no+" not found","err");return;}
    if (!memberName){showToast("Select your name","err");return;}
    const key=no+"_"+memberName.toLowerCase().replace(/\s+/g,"_");
    const acc=db.memberAccounts[key];
    if (!acc){showToast("No account found. Please register.","err");return;}
    if (acc.password!==password){showToast("Wrong password","err");return;}
    setSession({role:"member",key,hizbNo:no});
    showToast("Welcome, "+memberName+"!");
  }

  function logout(){
    setSession(null); setActiveEv(null);
  }

  // ── LEADER OPS ──
  function leaderShareLocation(lat,lng){
    patchLeader(session.slug,l=>({...l,location:{lat,lng,updatedAt:Date.now()}}));
  }
  function addMember(name,id){
    const num=parseInt(id);
    if (!name.trim()||!num){showToast("Fill name and ID","err");return false;}
    const ms=leader.members||[];
    if (ms.find(m=>m.id===num)){showToast("ID #"+num+" exists","err");return false;}
    if (ms.find(m=>m.name.toLowerCase()===name.toLowerCase())){showToast("Name exists","err");return false;}
    patchLeader(session.slug,l=>({...l,members:[...(l.members||[]),{id:num,name:name.trim()}].sort((a,b)=>a.id-b.id)}));
    showToast(name+" added!"); return true;
  }
  function deleteMember(id){
    patchLeader(session.slug,l=>({...l,members:l.members.filter(m=>m.id!==id)}));
    showToast("Member removed");
  }
  function importExcel(file){
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const wb=XLSX.read(e.target.result,{type:"binary"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1});
        const existing=[...(leader.members||[])];
        let added=0,skipped=0;
        rows.forEach(row=>{
          const id=parseInt(row[0]),name=String(row[1]||"").trim();
          if (!id||!name){skipped++;return;}
          if (existing.find(m=>m.id===id||m.name.toLowerCase()===name.toLowerCase())){skipped++;return;}
          existing.push({id,name}); added++;
        });
        existing.sort((a,b)=>a.id-b.id);
        patchLeader(session.slug,l=>({...l,members:existing}));
        showToast("Imported "+added+(skipped?", "+skipped+" skipped":""));
      } catch(err){showToast("Invalid file","err");}
    };
    reader.readAsBinaryString(file);
  }
  function createEvent(name,date,loc){
    if (!name.trim()||!date){showToast("Fill name and date","err");return false;}
    const ev={id:Date.now(),name:name.trim(),date,eventLocation:loc||null,arrivedIds:[],memberAttendance:{},createdAt:Date.now()};
    patchLeader(session.slug,l=>({...l,events:[...(l.events||[]),ev]}));
    showToast("Event created!"); return true;
  }
  function deleteEvent(id){
    patchLeader(session.slug,l=>({...l,events:l.events.filter(e=>e.id!==id)}));
    showToast("Event deleted");
  }
  function leaderToggle(evId,memberId){
    patchLeader(session.slug,l=>({
      ...l,events:l.events.map(ev=>{
        if (ev.id!==evId) return ev;
        const arr=[...(ev.arrivedIds||[])];
        const idx=arr.indexOf(memberId);
        if (idx>=0) arr.splice(idx,1); else arr.push(memberId);
        return {...ev,arrivedIds:arr};
      })
    }));
  }

  // ── MEMBER OPS ──
  function memberMarkAttendance(evId){
    const acc=memberAcc;
    patchLeader(acc.leaderSlug,l=>({
      ...l,events:l.events.map(ev=>{
        if (ev.id!==evId) return ev;
        const key=acc.key;
        const ma={...(ev.memberAttendance||{}),[key]:{status:"self_marked",name:acc.memberName,memberId:acc.memberId,markedAt:Date.now()}};
        const arr=[...(ev.arrivedIds||[])];
        if (acc.memberId && !arr.includes(acc.memberId)) arr.push(acc.memberId);
        return {...ev,arrivedIds:arr,memberAttendance:ma};
      })
    }));
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#F7EDD5,#EAD9A2)",fontFamily:"Poppins,sans-serif"}}>
      <div style={{height:4,background:"linear-gradient(90deg,#B8860B,#D4AF37,#2D6A4F,#D4AF37,#B8860B)"}}/>
      {toast&&(
        <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,
          padding:"11px 22px",borderRadius:50,whiteSpace:"nowrap",maxWidth:"88vw",textAlign:"center",
          background:toast.type==="err"?"#C0392B":toast.type==="warn"?"#E67E22":"#2D6A4F",
          color:"#fff",fontSize:13,fontWeight:600,boxShadow:"0 4px 24px rgba(0,0,0,0.2)",animation:"tin 0.3s ease"}}>
          {toast.msg}
        </div>
      )}
      <style>{GS}</style>

      {page==="entry"  && <EntryPage setPage={setPage}/>}
      {page==="lLogin" && <LeaderLogin  onLogin={leaderLogin}  onReg={()=>setPage("lReg")}   onBack={()=>setPage("entry")}/>}
      {page==="lReg"   && <LeaderReg    onReg={leaderRegister} onLogin={()=>setPage("lLogin")} onBack={()=>setPage("entry")}/>}
      {page==="mLogin" && <MemberLogin  db={db} onLogin={memberLogin}  onReg={()=>setPage("mReg")}   onBack={()=>setPage("entry")}/>}
      {page==="mReg"   && <MemberReg    db={db} onReg={memberRegister} onLogin={()=>setPage("mLogin")} onBack={()=>setPage("entry")}/>}

      {page==="lHome"    && leader && <LeaderHome leader={leader} nav={setPage} logout={logout} onShareLoc={leaderShareLocation} showToast={showToast}/>}
      {page==="lMembers" && leader && <MembersPage leader={leader} nav={setPage} onDelete={deleteMember} onImport={importExcel}/>}
      {page==="lAddMem"  && leader && <AddMemPage  leader={leader} nav={setPage} onAdd={addMember}/>}
      {page==="lEvents"  && leader && (
        <LeaderEventsPage leader={leader} nav={setPage} onCreate={createEvent} onDelete={deleteEvent}
          onOpen={ev=>{setActiveEv(ev);setPage("lAttend");}} showToast={showToast}/>
      )}
      {page==="lAttend" && leader && activeEv && (
        <LeaderAttendPage
          leader={leader}
          ev={leader.events.find(e=>e.id===activeEv.id)||activeEv}
          onToggle={(mid)=>leaderToggle(activeEv.id,mid)}
          onBack={()=>{setActiveEv(null);setPage("lEvents");}}
          showToast={showToast}/>
      )}
      {page==="mHome" && memberAcc && (
        <MemberHome
          acc={memberAcc}
          db={db}
          logout={logout}
          showToast={showToast}
          onMark={memberMarkAttendance}/>
      )}
    </div>
  );
}

// ─── ENTRY ────────────────────────────────────────────────────────────────────
function EntryPage({setPage}) {
  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",padding:"30px 18px 40px"}}>
      <div style={{textAlign:"center",paddingBottom:32}}>
        <div style={{fontSize:56,marginBottom:8,filter:"drop-shadow(0 4px 12px rgba(184,134,11,0.3))"}}>🕌</div>
        <h1 style={{fontSize:26,fontWeight:700,color:C.brown,margin:0}}>Hajj Attendance</h1>
        <p style={{fontSize:12,color:C.textLight,letterSpacing:2,textTransform:"uppercase",marginTop:4}}>Group Leader System</p>
        <p style={{fontSize:14,color:C.gold,marginTop:8}}>✦ ☽ ✦</p>
      </div>
      <p style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.textLight,letterSpacing:1.5,textTransform:"uppercase",marginBottom:18}}>I am a…</p>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {[
          {icon:"👑",title:"Group Leader",sub:"Manage your Hizb group & events",col:"#2D6A4F",colEnd:"#1a4a35",pg:"lLogin"},
          {icon:"🤲",title:"Group Member",sub:"Mark attendance & find your group",col:"#B8860B",colEnd:"#8B6914",pg:"mLogin"},
        ].map(item=>(
          <div key={item.pg} onClick={()=>setPage(item.pg)}
            onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"}
            onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}
            style={{background:`linear-gradient(135deg,${item.col},${item.colEnd})`,borderRadius:22,padding:"24px 22px",cursor:"pointer",
              boxShadow:`0 6px 24px ${item.col}55`,display:"flex",alignItems:"center",gap:18,transition:"transform 0.15s"}}>
            <div style={{fontSize:40}}>{item.icon}</div>
            <div>
              <p style={{margin:0,fontSize:18,fontWeight:700,color:"#fff"}}>{item.title}</p>
              <p style={{margin:"4px 0 0",fontSize:12,color:"rgba(255,255,255,0.72)"}}>{item.sub}</p>
            </div>
            <span style={{marginLeft:"auto",fontSize:24,color:"rgba(255,255,255,0.45)"}}>›</span>
          </div>
        ))}
      </div>
      <Footer/>
    </div>
  );
}

// ─── LEADER LOGIN ─────────────────────────────────────────────────────────────
function LeaderLogin({onLogin,onReg,onBack}) {
  const [no,setNo]=useState("");
  const [name,setName]=useState("");
  const [pass,setPass]=useState("");
  const [show,setShow]=useState(false);
  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",padding:"0 0 40px"}}>
      <Bar title="Leader Sign In" back={onBack}/>
      <div style={{padding:"24px 18px 0"}}>
        <div style={{textAlign:"center",fontSize:44,marginBottom:18}}>👑</div>
        <div className="card" style={{padding:24,marginBottom:18}}>
          <Lbl>Username (Full Name)</Lbl>
          <input className="inp" style={{marginBottom:14}} placeholder="e.g. Husain Dewaswala"
            value={name} onChange={e=>setName(e.target.value)}/>
          <Lbl>Hizb Number</Lbl>
          <input className="inp" type="number" style={{marginBottom:14}} placeholder="e.g. 53"
            value={no} onChange={e=>setNo(e.target.value)}/>
          <Lbl>Password</Lbl>
          <div style={{position:"relative",marginBottom:24}}>
            <input className="inp" type={show?"text":"password"} style={{paddingRight:48}} placeholder="Your password"
              value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onLogin(no,name,pass)}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:C.textLight}}>{show?"🙈":"👁"}</button>
          </div>
          <button className="bg" style={{width:"100%",padding:"15px 0",fontSize:15}} onClick={()=>onLogin(name,pass,no)}>Sign In as Leader</button>
        </div>
        <p style={{textAlign:"center",fontSize:14,color:C.textLight}}>New leader? <span onClick={onReg} style={{color:C.gold,fontWeight:700,cursor:"pointer"}}>Register</span></p>
      </div>
      <Footer/>
    </div>
  );
}

// ─── LEADER REGISTER ──────────────────────────────────────────────────────────
function LeaderReg({onReg,onLogin,onBack}) {
  const [no,setNo]=useState("");const [name,setName]=useState("");
  const [pass,setPass]=useState("");const [conf,setConf]=useState("");const [show,setShow]=useState(false);
  function submit(){
    if (!no||!name.trim()||!pass){alert("Fill all fields");return;}
    if (pass.length<4){alert("Password min 4 characters");return;}
    if (pass!==conf){alert("Passwords do not match");return;}
    onReg(name.trim(),pass,no);
  }
  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",padding:"0 0 40px"}}>
      <Bar title="Leader Registration" back={onBack}/>
      <div style={{padding:"24px 18px 0"}}>
        <div style={{textAlign:"center",fontSize:44,marginBottom:18}}>👑</div>
        <div className="card" style={{padding:24,marginBottom:18}}>
          <Lbl>Hizb Number</Lbl>
          <input className="inp" type="number" style={{marginBottom:14}} placeholder="Your assigned Hizb number" value={no} onChange={e=>setNo(e.target.value)}/>
          <Lbl>Your Full Name</Lbl>
          <input className="inp" style={{marginBottom:14}} placeholder="e.g. Ahmed Ali" value={name} onChange={e=>setName(e.target.value)}/>
          <Lbl>Password</Lbl>
          <div style={{position:"relative",marginBottom:14}}>
            <input className="inp" type={show?"text":"password"} style={{paddingRight:48}} placeholder="Min 4 characters"
              value={pass} onChange={e=>setPass(e.target.value)}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:C.textLight}}>{show?"🙈":"👁"}</button>
          </div>
          <Lbl>Confirm Password</Lbl>
          <input className="inp" type="password" style={{marginBottom:24}} placeholder="Re-enter password"
            value={conf} onChange={e=>setConf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <button className="bg" style={{width:"100%",padding:"15px 0",fontSize:15}} onClick={submit}>Create Leader Account</button>
        </div>
        <p style={{textAlign:"center",fontSize:14,color:C.textLight}}>Already registered? <span onClick={onLogin} style={{color:C.gold,fontWeight:700,cursor:"pointer"}}>Sign In</span></p>
      </div>
      <Footer/>
    </div>
  );
}

// ─── MEMBER LOGIN ─────────────────────────────────────────────────────────────
function MemberLogin({db,onLogin,onReg,onBack}) {
  const [no,setNo]=useState("");
  const [selName,setSelName]=useState("");
  const [pass,setPass]=useState("");
  const [show,setShow]=useState(false);

  const leader=no?Object.values(db.leaders).find(l=>l.hizbNo===parseInt(no)):null;
  const memberList=leader?(leader.members||[]):[];

  // reset name when hizb changes
  useEffect(()=>setSelName(""),[no]);

  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",padding:"0 0 40px"}}>
      <Bar title="Member Sign In" back={onBack}/>
      <div style={{padding:"24px 18px 0"}}>
        <div style={{textAlign:"center",fontSize:44,marginBottom:18}}>🤲</div>
        <div className="card" style={{padding:24,marginBottom:18}}>
          <Lbl>Hizb Number</Lbl>
          <input className="inp" type="number" style={{marginBottom:14}} placeholder="Your leader's Hizb number"
            value={no} onChange={e=>setNo(e.target.value)}/>

          {no&&!leader&&(
            <div style={{background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.red}}>
              ❌ Hizb #{no} not found. Check the number with your leader.
            </div>
          )}

          {leader&&(
            <>
              <div style={{background:"rgba(45,106,79,0.08)",border:"1px solid rgba(45,106,79,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.green}}>
                ✅ Hizb #{no} — {leader.displayName}
              </div>
              <Lbl>Select Your Name</Lbl>
              <select className="inp" style={{marginBottom:14}} value={selName} onChange={e=>setSelName(e.target.value)}>
                <option value="">— Select your name —</option>
                {memberList.map(m=>(
                  <option key={m.id} value={m.name}>#{m.id} · {m.name}</option>
                ))}
              </select>
            </>
          )}

          <Lbl>Password</Lbl>
          <div style={{position:"relative",marginBottom:24}}>
            <input className="inp" type={show?"text":"password"} style={{paddingRight:48}} placeholder="Your password"
              value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onLogin(no,selName,pass)}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:C.textLight}}>{show?"🙈":"👁"}</button>
          </div>
          <button className="bp" style={{width:"100%",padding:"15px 0",fontSize:15}} onClick={()=>onLogin(no,selName,pass)}>
            Sign In as Member
          </button>
        </div>
        <p style={{textAlign:"center",fontSize:14,color:C.textLight}}>New member? <span onClick={onReg} style={{color:C.gold,fontWeight:700,cursor:"pointer"}}>Register</span></p>
      </div>
      <Footer/>
    </div>
  );
}

// ─── MEMBER REGISTER ──────────────────────────────────────────────────────────
function MemberReg({db,onReg,onLogin,onBack}) {
  const [no,setNo]=useState("");
  const [selName,setSelName]=useState("");
  const [pass,setPass]=useState("");
  const [conf,setConf]=useState("");
  const [show,setShow]=useState(false);

  const leader=no?Object.values(db.leaders).find(l=>l.hizbNo===parseInt(no)):null;
  const memberList=leader?(leader.members||[]):[];

  useEffect(()=>setSelName(""),[no]);

  function submit(){
    if (!no||!selName||!pass){alert("Fill all fields and select your name");return;}
    if (pass.length<4){alert("Password min 4 characters");return;}
    if (pass!==conf){alert("Passwords do not match");return;}
    onReg(no,selName,pass);
  }

  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",padding:"0 0 40px"}}>
      <Bar title="Member Registration" back={onBack}/>
      <div style={{padding:"24px 18px 0"}}>
        <div style={{textAlign:"center",fontSize:44,marginBottom:18}}>🤲</div>
        <div className="card" style={{padding:24,marginBottom:18}}>

          <Lbl>Hizb Number (given by your leader)</Lbl>
          <input className="inp" type="number" style={{marginBottom:14}} placeholder="e.g. 53"
            value={no} onChange={e=>setNo(e.target.value)}/>

          {no&&!leader&&(
            <div style={{background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.red}}>
              ❌ Hizb #{no} not found. Ask your leader for the correct number.
            </div>
          )}

          {leader&&(
            <>
              <div style={{background:"rgba(45,106,79,0.08)",border:"1px solid rgba(45,106,79,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.green}}>
                ✅ Hizb #{no} — Leader: {leader.displayName}
              </div>
              <Lbl>Select Your Name</Lbl>
              {memberList.length===0?(
                <div style={{background:"rgba(230,126,22,0.08)",border:"1px solid rgba(230,126,22,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#E67E22"}}>
                  ⚠️ No members added yet. Ask your leader to add members first.
                </div>
              ):(
                <select className="inp" style={{marginBottom:14}} value={selName} onChange={e=>setSelName(e.target.value)}>
                  <option value="">— Select your name —</option>
                  {memberList.map(m=>(
                    <option key={m.id} value={m.name}>#{m.id} · {m.name}</option>
                  ))}
                </select>
              )}
            </>
          )}

          <Lbl>Create Password</Lbl>
          <div style={{position:"relative",marginBottom:14}}>
            <input className="inp" type={show?"text":"password"} style={{paddingRight:48}} placeholder="Min 4 characters"
              value={pass} onChange={e=>setPass(e.target.value)}/>
            <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:17,color:C.textLight}}>{show?"🙈":"👁"}</button>
          </div>
          <Lbl>Confirm Password</Lbl>
          <input className="inp" type="password" style={{marginBottom:24}} placeholder="Re-enter password"
            value={conf} onChange={e=>setConf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>

          <button className="bp" style={{width:"100%",padding:"15px 0",fontSize:15}} onClick={submit}>
            Create Member Account
          </button>
        </div>
        <p style={{textAlign:"center",fontSize:14,color:C.textLight}}>Already registered? <span onClick={onLogin} style={{color:C.gold,fontWeight:700,cursor:"pointer"}}>Sign In</span></p>
      </div>
      <Footer/>
    </div>
  );
}

// ─── LEADER HOME ──────────────────────────────────────────────────────────────
function LeaderHome({leader,nav,logout,onShareLoc,showToast}) {
  const [sharing,setSharing]=useState(false);
  const [locMsg,setLocMsg]=useState("");
  const evs=leader.events||[];
  const total=leader.members.length;
  const lastEv=evs[evs.length-1];
  const lastPct=lastEv&&total?Math.round(((lastEv.arrivedIds||[]).length/total)*100):0;
  const totalPending=evs.reduce((s,ev)=>s+Object.values(ev.memberAttendance||{}).filter(m=>m.status==="self_marked").length,0);

  function shareLocation(){
    if (!navigator.geolocation){showToast("GPS not supported","err");return;}
    setSharing(true);
    setLocMsg("📡 Acquiring precise location… (takes up to 15s)");
    let bestReading=null;
    let watchId=null;
    let settled=false;
    const ACCURACY_TARGET=10; // aim for 10 metres
    const TIMEOUT_MS=15000;   // max 15 seconds

    function finish(reading){
      if (settled) return;
      settled=true;
      if (watchId!==null) navigator.geolocation.clearWatch(watchId);
      onShareLoc(reading.latitude, reading.longitude);
      const acc=Math.round(reading.accuracy);
      setLocMsg("✅ Location shared! Accuracy: ±"+acc+"m");
      setSharing(false);
      showToast("📍 Shared — ±"+acc+"m accuracy!");
    }

    function onPos(pos){
      const c=pos.coords;
      if (!bestReading || c.accuracy < bestReading.accuracy){
        bestReading=c;
        setLocMsg("📡 Improving accuracy… ±"+Math.round(c.accuracy)+"m");
      }
      if (c.accuracy <= ACCURACY_TARGET) finish(c);
    }

    function onErr(){
      if (settled) return;
      if (bestReading){ finish(bestReading); }
      else { settled=true; setLocMsg("❌ GPS denied. Enable location access."); setSharing(false); showToast("GPS denied","err"); }
    }

    watchId=navigator.geolocation.watchPosition(onPos, onErr,
      {enableHighAccuracy:true, timeout:TIMEOUT_MS, maximumAge:0});

    // Hard timeout — use best reading we have
    setTimeout(()=>{
      if (!settled && bestReading) finish(bestReading);
      else if (!settled){
        settled=true;
        if (watchId!==null) navigator.geolocation.clearWatch(watchId);
        setLocMsg("❌ Could not get location. Try outdoors.");
        setSharing(false);
        showToast("Location timeout","err");
      }
    }, TIMEOUT_MS);
  }

  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",paddingBottom:40}}>
      <div style={{background:"linear-gradient(135deg,#2D6A4F,#1a4a35)",padding:"28px 20px 26px",borderRadius:"0 0 28px 28px",boxShadow:"0 6px 24px rgba(45,106,79,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:"rgba(255,255,255,0.65)",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 4px"}}>👑 Group Leader · Hizb #{leader.hizbNo}</p>
            <h1 style={{color:"#fff",fontSize:20,fontWeight:700,margin:0}}>{leader.displayName}</h1>
          </div>
          <button onClick={logout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:12,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>Sign Out</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:18}}>
          {[["👥","Members",total],["📋","Events",evs.length],["📊","Last",lastEv?lastPct+"%":"—"]].map(([ic,lb,vl])=>(
            <div key={lb} style={{background:"rgba(255,255,255,0.15)",borderRadius:14,padding:"12px 6px",textAlign:"center"}}>
              <div style={{fontSize:20}}>{ic}</div>
              <div style={{fontSize:20,fontWeight:700,color:"#fff"}}>{vl}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:2}}>{lb}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"18px 18px 0",display:"flex",flexDirection:"column",gap:14}}>
        {/* GPS Notice */}
        <GpsNotice role="leader"/>
        {/* Location share */}
        <div className="card" style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{fontSize:28}}>📍</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>Share My Location</p>
              <p style={{margin:"2px 0 0",fontSize:12,color:C.textLight}}>Members navigate to you using Google Maps</p>
            </div>
          </div>
          {leader.location&&(
            <div style={{background:"rgba(45,106,79,0.08)",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:12,color:C.green}}>
              ✅ Last shared at {fmtTime(leader.location.updatedAt)}
            </div>
          )}
          {locMsg&&<p style={{fontSize:12,color:C.brownLight,marginBottom:10}}>{locMsg}</p>}
          <button className="bg" style={{width:"100%",padding:"12px 0",fontSize:14}} onClick={shareLocation} disabled={sharing}>
            {sharing?"⏳ Getting location…":"📍 Update My Location Now"}
          </button>
        </div>
        {totalPending>0&&(
          <div style={{background:"rgba(230,126,22,0.1)",border:"1.5px solid rgba(230,126,22,0.35)",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:28}}>🔔</div>
            <div>
              <p style={{margin:0,fontSize:14,fontWeight:700,color:"#E67E22"}}>Pending Self Check-ins</p>
              <p style={{margin:"3px 0 0",fontSize:12,color:C.textLight}}>{totalPending} member(s) marked attendance. Check Events.</p>
            </div>
          </div>
        )}
        <div style={{textAlign:"center",fontSize:42}}>🕋</div>
        <p style={{textAlign:"center",fontSize:12,color:C.textLight,letterSpacing:2,textTransform:"uppercase",margin:"-8px 0 0"}}>لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ</p>
        <MenuCard icon="👥" title="Manage Members" sub={total+" members in Hizb #"+leader.hizbNo} col={C.gold} onClick={()=>nav("lMembers")}/>
        <MenuCard icon="📋" title="Events & Attendance" sub={evs.length+" events"+(totalPending?" · "+totalPending+" pending":"")} col={C.green} onClick={()=>nav("lEvents")}/>
      </div>
      <Footer/>
    </div>
  );
}

// ─── LEADER EVENTS ────────────────────────────────────────────────────────────
function LeaderEventsPage({leader,nav,onCreate,onDelete,onOpen,showToast}) {
  const [name,setName]=useState("");const [date,setDate]=useState("");
  const [form,setForm]=useState(false);const [del,setDel]=useState(null);
  const [evLoc,setEvLoc]=useState(null);const [gettingLoc,setGettingLoc]=useState(false);
  const total=(leader.members||[]).length;

  function pinLocation(){
    if (!navigator.geolocation){showToast("GPS not supported","err");return;}
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos=>{setEvLoc({lat:pos.coords.latitude,lng:pos.coords.longitude});setGettingLoc(false);showToast("Location pinned!");},
      ()=>{setGettingLoc(false);showToast("GPS denied","err");},{enableHighAccuracy:true,timeout:10000}
    );
  }

  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",paddingBottom:40}}>
      <Bar title="Events" back={()=>nav("lHome")}/>
      <div style={{padding:"14px 18px 0"}}>
        <button className="bp" style={{width:"100%",padding:"13px 0",fontSize:15,marginBottom:14}} onClick={()=>setForm(v=>!v)}>
          {form?"✕ Cancel":"+ Create New Event"}
        </button>
        {form&&(
          <div className="card" style={{padding:20,marginBottom:14,animation:"pop 0.2s ease"}}>
            <Lbl>Event Name</Lbl>
            <input className="inp" style={{marginBottom:12}} placeholder="e.g. Arafat Day Majlis" value={name} onChange={e=>setName(e.target.value)}/>
            <Lbl>Date</Lbl>
            <input className="inp" type="date" style={{marginBottom:14}} value={date} onChange={e=>setDate(e.target.value)}/>
            <Lbl>Pin Event Location (optional)</Lbl>
            <button className="bb" style={{width:"100%",padding:"11px 0",fontSize:13,marginBottom:evLoc?8:16}} onClick={pinLocation} disabled={gettingLoc}>
              {gettingLoc?"⏳ Getting…":evLoc?"📍 Location Pinned ✓ — Re-pin":"📍 Pin My Current Location"}
            </button>
            {evLoc&&<p style={{fontSize:11,color:C.green,textAlign:"center",marginBottom:14}}>✅ {evLoc.lat.toFixed(5)}, {evLoc.lng.toFixed(5)}</p>}
            <button className="bg" style={{width:"100%",padding:"13px 0",fontSize:15}}
              onClick={()=>{if(onCreate(name,date,evLoc)){setName("");setDate("");setEvLoc(null);setForm(false);}}}>
              ✓ Create Event
            </button>
          </div>
        )}
      </div>
      {(leader.events||[]).length===0?(
        <div style={{textAlign:"center",padding:"60px 20px",color:C.textLight}}>
          <div style={{fontSize:46,marginBottom:12}}>📋</div>
          <p>No events yet.</p>
        </div>
      ):(
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:12}}>
          {[...(leader.events||[])].reverse().map(ev=>{
            const arr=(ev.arrivedIds||[]).length;
            const pct=total?Math.round((arr/total)*100):0;
            const selfMarked=Object.values(ev.memberAttendance||{}).filter(m=>m.status==="self_marked").length;
            return (
              <div key={ev.id} className="card" style={{overflow:"hidden"}}>
                <div style={{padding:"16px 16px 12px",cursor:"pointer"}} onClick={()=>onOpen(ev)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>{ev.name}</p>
                      <p style={{margin:"3px 0 0",fontSize:12,color:C.textLight}}>📅 {fmtDate(ev.date)}</p>
                      {ev.eventLocation&&<p style={{margin:"2px 0 0",fontSize:11,color:C.blue}}>📍 Location pinned</p>}
                    </div>
                    <span style={{background:pct===100?C.green:C.goldPale,color:pct===100?"#fff":C.brown,fontSize:13,fontWeight:700,padding:"4px 12px",borderRadius:20,flexShrink:0,marginLeft:8}}>{pct}%</span>
                  </div>
                  <div style={{height:6,background:"rgba(0,0,0,0.06)",borderRadius:8,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#2D6A4F,#52B788)",borderRadius:8,transition:"width 0.4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textLight}}>
                    <span>✅ {arr} arrived</span><span>⏳ {total-arr} remaining</span>
                  </div>
                  {selfMarked>0&&(
                    <div style={{marginTop:8,background:"rgba(230,126,22,0.1)",borderRadius:8,padding:"6px 10px",fontSize:12,color:"#E67E22",fontWeight:600}}>
                      🔔 {selfMarked} member self check-in{selfMarked>1?"s":""}
                    </div>
                  )}
                </div>
                <div style={{borderTop:"1px solid rgba(212,175,55,0.15)",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <button className="bg" style={{padding:"9px 20px",fontSize:13}} onClick={()=>onOpen(ev)}>Mark Attendance →</button>
                  {del===ev.id?(
                    <div style={{display:"flex",gap:8}}>
                      <button className="bd" style={{padding:"6px 12px",fontSize:12}} onClick={()=>{onDelete(ev.id);setDel(null);}}>Delete</button>
                      <button className="bs" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setDel(null)}>No</button>
                    </div>
                  ):(
                    <button onClick={()=>setDel(ev.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:20}}>🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Footer/>
    </div>
  );
}

// ─── LEADER ATTEND ────────────────────────────────────────────────────────────
function LeaderAttendPage({leader,ev,onToggle,onBack,showToast}) {
  const [q,setQ]=useState("");const [tab,setTab]=useState("all");
  const members=leader.members||[];
  const arrivedIds=new Set(ev.arrivedIds||[]);
  const total=members.length, count=arrivedIds.size;
  const pct=total?Math.round((count/total)*100):0;

  function markAll(){members.forEach(m=>{if(!arrivedIds.has(m.id))onToggle(m.id);});showToast("All marked!");}
  function clearAll(){members.forEach(m=>{if(arrivedIds.has(m.id))onToggle(m.id);});showToast("Cleared","warn");}

  const shown=members.filter(m=>{
    const match=m.name.toLowerCase().includes(q.toLowerCase())||String(m.id).includes(q);
    if (!match) return false;
    if (tab==="arr") return arrivedIds.has(m.id);
    if (tab==="rem") return !arrivedIds.has(m.id);
    return true;
  });
  const selfMarks=ev.memberAttendance||{};

  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",paddingBottom:40}}>
      <div style={{background:"linear-gradient(135deg,#2D6A4F,#1a4a35)",padding:"18px 18px 22px",borderRadius:"0 0 24px 24px",boxShadow:"0 6px 24px rgba(45,106,79,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:10,padding:"9px 15px",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,flexShrink:0}}>← Back</button>
          <div style={{minWidth:0}}>
            <p style={{margin:0,fontSize:15,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.name}</p>
            <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.65)"}}>📅 {fmtDate(ev.date)}</p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[["👥","Total",total],["✅","Arrived",count],["⏳","Remaining",total-count]].map(([ic,lb,vl])=>(
            <div key={lb} style={{background:"rgba(255,255,255,0.18)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:18}}>{ic}</div><div style={{fontSize:19,fontWeight:700,color:"#fff"}}>{vl}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{lb}</div>
            </div>
          ))}
        </div>
        <div style={{height:7,background:"rgba(255,255,255,0.2)",borderRadius:10,overflow:"hidden",marginBottom:5}}>
          <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#D4AF37,#FBF0CC)",borderRadius:10,transition:"width 0.35s"}}/>
        </div>
        <p style={{color:"rgba(255,255,255,0.75)",fontSize:11,textAlign:"right",margin:0}}>{pct}% attendance</p>
      </div>
      <div style={{padding:"14px 18px 0"}}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button className="bg" style={{flex:1,padding:"10px 0",fontSize:13}} onClick={markAll}>✓ Mark All</button>
          <button className="bs" style={{flex:1,padding:"10px 0",fontSize:13}} onClick={clearAll}>↺ Clear All</button>
        </div>
        <div className="sb" style={{marginBottom:12}}>
          <span>🔍</span>
          <input placeholder="Search member…" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<span onClick={()=>setQ("")} style={{cursor:"pointer",color:C.textLight,fontSize:20}}>×</span>}
        </div>
        <div style={{display:"flex",gap:6,background:"rgba(255,255,255,0.55)",borderRadius:14,padding:4,marginBottom:14}}>
          {[["all","All"],["arr","✅ Arrived"],["rem","⏳ Remaining"]].map(([v,l])=>(
            <button key={v} className="tb" style={{background:tab===v?"#fff":"transparent",color:tab===v?C.green:C.textLight,boxShadow:tab===v?"0 2px 8px rgba(107,58,42,0.1)":"none"}} onClick={()=>setTab(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{margin:"0 18px",overflow:"hidden"}}>
        {shown.length===0?(
          <div style={{padding:30,textAlign:"center",color:C.textLight,fontSize:14}}>No members match filter.</div>
        ):shown.map(m=>{
          const on=arrivedIds.has(m.id);
          const selfKey=Object.keys(selfMarks).find(k=>selfMarks[k].memberId===m.id);
          const selfMark=selfKey?selfMarks[selfKey]:null;
          return (
            <div key={m.id} className="mr" style={{background:on?"rgba(45,106,79,0.06)":"transparent",cursor:"pointer"}} onClick={()=>onToggle(m.id)}>
              <div className={"chk"+(on?" on":"")}>
                {on&&<span style={{color:"#fff",fontSize:15,fontWeight:700,lineHeight:1}}>✓</span>}
              </div>
              <span style={{width:32,height:32,borderRadius:8,background:on?C.green:C.goldPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:on?"#fff":C.brown,flexShrink:0,transition:"all 0.18s"}}>{m.id}</span>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:14,color:on?C.green:C.text,fontWeight:on?600:400,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                {selfMark&&<span style={{fontSize:10,color:"#E67E22"}}>🔔 Self check-in {fmtTime(selfMark.markedAt)}</span>}
              </div>
              {on&&<span style={{fontSize:11,color:C.greenLight,fontWeight:600,flexShrink:0}}>Present</span>}
            </div>
          );
        })}
      </div>
      {count===total&&total>0&&(
        <div style={{margin:"18px 18px 0",background:"linear-gradient(135deg,#2D6A4F,#1a4a35)",borderRadius:18,padding:20,textAlign:"center",animation:"pop 0.3s ease"}}>
          <div style={{fontSize:34}}>🎉</div>
          <p style={{color:"#fff",fontWeight:700,fontSize:16,margin:"8px 0 4px"}}>Full Attendance!</p>
          <p style={{color:"rgba(255,255,255,0.7)",fontSize:13}}>All {total} present. الحمد لله</p>
        </div>
      )}
      <Footer/>
    </div>
  );
}

// ─── MEMBER HOME ──────────────────────────────────────────────────────────────
function MemberHome({acc,db,logout,showToast,onMark}) {
  const [locMsg,setLocMsg]=useState("");
  const [dist,setDist]=useState(null);
  const [marking,setMarking]=useState(null);
  const leader=db.leaders[acc.leaderSlug];
  const events=leader?(leader.events||[]):[];

  function openLeaderMap(){
    if (!leader?.location){showToast("Leader hasn't shared location yet","warn");return;}
    const {lat,lng}=leader.location;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,"_blank");
  }

  function tryMark(ev){
    setMarking(ev.id);
    if (!leader?.location){showToast("Leader location not shared","err");setMarking(null);return;}
    if (!navigator.geolocation){showToast("GPS not supported","err");setMarking(null);return;}
    setLocMsg("📡 Getting precise location… (up to 15s)");
    setDist(null);

    let best=null;
    let watchId=null;
    let settled=false;
    const ACCURACY_TARGET=15;
    const TIMEOUT_MS=15000;

    function finish(coords){
      if (settled) return;
      settled=true;
      if (watchId!==null) navigator.geolocation.clearWatch(watchId);
      const d=getDistance(coords.latitude,coords.longitude,leader.location.lat,leader.location.lng);
      setDist(Math.round(d));
      const acc=Math.round(coords.accuracy);
      if (d<=RADIUS_METERS){
        onMark(ev.id);
        setLocMsg("✅ Attendance marked! Distance: "+Math.round(d)+"m · Accuracy: ±"+acc+"m");
        showToast("✅ Attendance marked!");
      } else {
        setLocMsg("❌ "+Math.round(d)+"m from leader. Must be within "+RADIUS_METERS+"m. Accuracy: ±"+acc+"m");
        showToast("Too far — "+Math.round(d)+"m away","err");
      }
      setMarking(null);
    }

    function onPos(pos){
      const c=pos.coords;
      if (!best||c.accuracy<best.accuracy){
        best=c;
        setLocMsg("📡 Improving accuracy… ±"+Math.round(c.accuracy)+"m");
      }
      if (c.accuracy<=ACCURACY_TARGET) finish(c);
    }

    function onErr(){
      if (settled) return;
      if (best){ finish(best); }
      else { settled=true; if(watchId!==null)navigator.geolocation.clearWatch(watchId); setLocMsg("❌ GPS denied. Enable location access."); setMarking(null); showToast("GPS denied","err"); }
    }

    watchId=navigator.geolocation.watchPosition(onPos,onErr,
      {enableHighAccuracy:true,timeout:TIMEOUT_MS,maximumAge:0});

    setTimeout(()=>{
      if (!settled&&best) finish(best);
      else if (!settled){
        settled=true;
        if(watchId!==null)navigator.geolocation.clearWatch(watchId);
        setLocMsg("❌ Could not get location. Go outside for better GPS.");
        setMarking(null);
        showToast("Location timeout","err");
      }
    },TIMEOUT_MS);
  }

  function alreadyMarked(evId){
    const ev=events.find(e=>e.id===evId);
    if (!ev) return false;
    return !!(ev.memberAttendance||{})[acc.key];
  }

  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",paddingBottom:40}}>
      <div style={{background:"linear-gradient(135deg,#B8860B,#8B6914)",padding:"28px 20px 26px",borderRadius:"0 0 28px 28px",boxShadow:"0 6px 24px rgba(184,134,11,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:"rgba(255,255,255,0.65)",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 4px"}}>🤲 Group Member · Hizb #{acc.hizbNo}</p>
            <h1 style={{color:"#fff",fontSize:20,fontWeight:700,margin:0}}>{acc.memberName}</h1>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:13,margin:"3px 0 0"}}>Leader: {leader?.displayName}</p>
          </div>
          <button onClick={logout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:12,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,flexShrink:0}}>Sign Out</button>
        </div>
      </div>

      <div style={{padding:"18px 18px 0",display:"flex",flexDirection:"column",gap:14}}>
        {/* GPS Notice */}
        <GpsNotice role="member"/>
        {/* Find Leader */}
        <div className="card" style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{fontSize:30}}>🗺️</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>Find My Leader</p>
              <p style={{margin:"2px 0 0",fontSize:12,color:C.textLight}}>Navigate to {leader?.displayName}</p>
            </div>
          </div>
          {leader?.location?(
            <div style={{background:"rgba(45,106,79,0.08)",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:12,color:C.green}}>
              📍 Leader location available · {fmtTime(leader.location.updatedAt)}
            </div>
          ):(
            <div style={{background:"rgba(192,57,43,0.07)",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:12,color:C.red}}>
              ⏳ Leader hasn't shared location yet
            </div>
          )}
          <button className="bb" style={{width:"100%",padding:"13px 0",fontSize:14}} onClick={openLeaderMap}>
            🗺️ Open Google Maps → Navigate to Leader
          </button>
        </div>

        {dist!==null&&(
          <div style={{background:dist<=RADIUS_METERS?"rgba(45,106,79,0.1)":"rgba(192,57,43,0.08)",border:`1.5px solid ${dist<=RADIUS_METERS?"rgba(45,106,79,0.3)":"rgba(192,57,43,0.25)"}`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:26}}>{dist<=RADIUS_METERS?"✅":"❌"}</div>
            <div>
              <p style={{margin:0,fontSize:14,fontWeight:700,color:dist<=RADIUS_METERS?C.green:C.red}}>{dist<=RADIUS_METERS?"Within Range":"Out of Range"}</p>
              <p style={{margin:"2px 0 0",fontSize:12,color:C.textLight}}>{dist}m from leader · Limit {RADIUS_METERS}m</p>
            </div>
          </div>
        )}
        {locMsg&&<p style={{fontSize:13,color:C.brownLight,textAlign:"center",margin:0}}>{locMsg}</p>}

        {/* Events */}
        <p style={{fontSize:12,fontWeight:700,color:C.textLight,letterSpacing:1.5,textTransform:"uppercase",margin:"4px 0 0"}}>📋 Events</p>
        {events.length===0?(
          <div className="card" style={{padding:30,textAlign:"center",color:C.textLight}}>
            <div style={{fontSize:36,marginBottom:8}}>📋</div>
            <p style={{fontSize:14}}>No events from your leader yet.</p>
          </div>
        ):[...events].reverse().map(ev=>{
          const marked=alreadyMarked(ev.id);
          return (
            <div key={ev.id} className="card" style={{overflow:"hidden"}}>
              <div style={{padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <p style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>{ev.name}</p>
                    <p style={{margin:"3px 0 0",fontSize:12,color:C.textLight}}>📅 {fmtDate(ev.date)}</p>
                  </div>
                  {marked&&<span style={{background:C.green,color:"#fff",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,flexShrink:0}}>✅ Marked</span>}
                </div>
                {ev.eventLocation&&(
                  <button className="bb" style={{width:"100%",padding:"10px 0",fontSize:13,marginBottom:10}}
                    onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${ev.eventLocation.lat},${ev.eventLocation.lng}&travelmode=walking`,"_blank")}>
                    📍 Navigate to Event Location
                  </button>
                )}
                {marked?(
                  <div style={{background:"rgba(45,106,79,0.08)",borderRadius:10,padding:"10px 14px",fontSize:13,color:C.green,textAlign:"center",fontWeight:600}}>
                    ✅ Attendance marked for this event
                  </div>
                ):(
                  <button className="bg" style={{width:"100%",padding:"13px 0",fontSize:14}} onClick={()=>tryMark(ev)} disabled={marking===ev.id}>
                    {marking===ev.id?"📡 Checking your location…":"✅ Mark My Attendance"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Footer/>
    </div>
  );
}

// ─── MEMBERS PAGE ─────────────────────────────────────────────────────────────
function MembersPage({leader,nav,onDelete,onImport}) {
  const [q,setQ]=useState("");const [del,setDel]=useState(null);
  const fileRef=useRef(null);
  const list=(leader.members||[]).filter(m=>m.name.toLowerCase().includes(q.toLowerCase())||String(m.id).includes(q));
  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",paddingBottom:40}}>
      <Bar title="Group Members" back={()=>nav("lHome")}/>
      <div style={{padding:"14px 18px 0"}}>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <button className="bp" style={{flex:1,padding:"12px 0",fontSize:14}} onClick={()=>nav("lAddMem")}>+ Add Member</button>
          <button className="bs" style={{flex:1,padding:"12px 0",fontSize:13}} onClick={()=>fileRef.current.click()}>📊 Import Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){onImport(e.target.files[0]);e.target.value="";}}}/>
        </div>
        <div style={{background:"rgba(184,134,11,0.08)",border:"1px solid rgba(184,134,11,0.22)",borderRadius:10,padding:"8px 13px",marginBottom:12,fontSize:12,color:C.brownLight}}>
          📊 Excel: Column A = ID · Column B = Name
        </div>
        <div className="sb" style={{marginBottom:10}}>
          <span>🔍</span>
          <input placeholder="Search name or number…" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<span onClick={()=>setQ("")} style={{cursor:"pointer",color:C.textLight,fontSize:20}}>×</span>}
        </div>
        <p style={{fontSize:12,color:C.textLight,marginBottom:10}}>{list.length} of {(leader.members||[]).length} members</p>
      </div>
      <div className="card" style={{margin:"0 18px",overflow:"hidden"}}>
        {list.length===0?(
          <div style={{padding:40,textAlign:"center",color:C.textLight}}>
            <div style={{fontSize:38,marginBottom:8}}>👥</div>
            <p style={{fontSize:14}}>{(leader.members||[]).length===0?"No members yet.":"No results."}</p>
          </div>
        ):list.map(m=>(
          <div key={m.id} className="mr">
            <span style={{width:36,height:36,borderRadius:10,background:C.goldPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.brown,flexShrink:0}}>{m.id}</span>
            <span style={{flex:1,fontSize:14,color:C.text,fontWeight:500}}>{m.name}</span>
            {del===m.id?(
              <div style={{display:"flex",gap:6}}>
                <button className="bd" style={{padding:"5px 10px",fontSize:12}} onClick={()=>{onDelete(m.id);setDel(null);}}>Delete</button>
                <button className="bs" style={{padding:"5px 10px",fontSize:12}} onClick={()=>setDel(null)}>Cancel</button>
              </div>
            ):(
              <button onClick={e=>{e.stopPropagation();setDel(m.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:20,padding:"2px 6px"}}>✕</button>
            )}
          </div>
        ))}
      </div>
      <Footer/>
    </div>
  );
}

// ─── ADD MEMBER ───────────────────────────────────────────────────────────────
function AddMemPage({leader,nav,onAdd}) {
  const next=(leader.members||[]).length>0?Math.max(...leader.members.map(m=>m.id))+1:1;
  const [id,setId]=useState(String(next));const [name,setName]=useState("");
  function submit(){if(onAdd(name,id)){setName("");setId(String(parseInt(id||0)+1));}}
  return (
    <div className="pg" style={{maxWidth:400,margin:"0 auto",paddingBottom:40}}>
      <Bar title="Add Member" back={()=>nav("lMembers")}/>
      <div style={{padding:"20px 18px"}}>
        <div className="card" style={{padding:24}}>
          <div style={{textAlign:"center",fontSize:38,marginBottom:14}}>👤</div>
          <Lbl>Member ID Number</Lbl>
          <input className="inp" type="number" style={{marginBottom:13}} placeholder="e.g. 1" value={id} onChange={e=>setId(e.target.value)}/>
          <Lbl>Member Full Name</Lbl>
          <input className="inp" style={{marginBottom:22}} placeholder="e.g. Ahmed Ali" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <button className="bp" style={{width:"100%",padding:"15px 0",fontSize:15}} onClick={submit}>+ Add Member</button>
        </div>
        <div style={{marginTop:14,background:"rgba(45,106,79,0.07)",border:"1px solid rgba(45,106,79,0.2)",borderRadius:12,padding:14,fontSize:13,color:C.green}}>
          💡 Use Excel import for adding many members at once.
        </div>
      </div>
      <Footer/>
    </div>
  );
}


// ─── GPS NOTICE COMPONENT ─────────────────────────────────────────────────────
function GpsNotice({role="leader"}) {
  const [dismissed, setDismissed] = useState(false);
  const [gpsState, setGpsState] = useState("unknown"); // unknown | granted | denied | prompt

  useEffect(()=>{
    // Check permission state if API available
    if (navigator.permissions) {
      navigator.permissions.query({name:"geolocation"}).then(result=>{
        setGpsState(result.state);
        result.onchange = () => setGpsState(result.state);
      }).catch(()=>{});
    }
  },[]);

  if (dismissed || gpsState === "granted") return null;

  const isLeader = role === "leader";

  return (
    <div className="gps-banner" style={{
      margin:"0 18px 14px",
      background: isLeader
        ? "linear-gradient(135deg,#1a4a35,#2D6A4F)"
        : "linear-gradient(135deg,#7B5900,#B8860B)",
      borderRadius:18,
      padding:"16px 16px 14px",
      boxShadow:"0 4px 20px rgba(0,0,0,0.18)",
      border:`1px solid ${isLeader?"rgba(82,183,136,0.3)":"rgba(212,175,55,0.3)"}`,
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:26}}>📡</div>
          <div>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:"#fff"}}>
              {gpsState==="denied" ? "⚠️ GPS Access Blocked!" : "Enable Location Services"}
            </p>
            <p style={{margin:"2px 0 0",fontSize:11,color:"rgba(255,255,255,0.7)"}}>
              Required for {isLeader ? "sharing your location with members" : "verifying you are near your leader"}
            </p>
          </div>
        </div>
        <button onClick={()=>setDismissed(true)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"4px 8px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:13,flexShrink:0}}>✕</button>
      </div>

      {/* Steps */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {[
          {icon:"📍", text:"GPS / Location — Must be ON", sub:"Settings → Location → Turn ON"},
          {icon:"🌐", text:"Browser Location Permission", sub:'When prompted tap "Allow" — never "Block"'},
          {icon:"📶", text:"Stay outdoors or near a window", sub:"GPS works best with clear sky view"},
        ].map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"10px 12px"}}>
            <span style={{fontSize:18,flexShrink:0}}>{s.icon}</span>
            <div>
              <p style={{margin:0,fontSize:13,fontWeight:600,color:"#fff"}}>{s.text}</p>
              <p style={{margin:"2px 0 0",fontSize:11,color:"rgba(255,255,255,0.65)"}}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {gpsState==="denied" && (
        <div style={{background:"rgba(192,57,43,0.3)",border:"1px solid rgba(192,57,43,0.5)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
          <p style={{margin:0,fontSize:12,color:"#ffb3b3",fontWeight:600}}>🔒 Location is blocked in your browser.</p>
          <p style={{margin:"4px 0 0",fontSize:11,color:"rgba(255,255,255,0.7)"}}>
            Go to your browser Settings → Site Settings → Location → Allow this site
          </p>
        </div>
      )}

      {/* Platform-specific instructions */}
      <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"10px 14px"}}>
        <p style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.9)"}}>📱 How to enable on your phone:</p>
        <p style={{margin:"0 0 4px",fontSize:11,color:"rgba(255,255,255,0.75)"}}>
          <strong style={{color:"#fff"}}>iPhone:</strong> Settings → Privacy → Location Services → Safari → "While Using"
        </p>
        <p style={{margin:0,fontSize:11,color:"rgba(255,255,255,0.75)"}}>
          <strong style={{color:"#fff"}}>Android:</strong> Settings → Apps → Browser → Permissions → Location → Allow
        </p>
      </div>
    </div>
  );
}

// ─── SHARED SMALL COMPONENTS ──────────────────────────────────────────────────
function Bar({title,back}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px 12px",background:C.cardBg,borderBottom:"1px solid rgba(212,175,55,0.18)",position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 8px rgba(107,58,42,0.08)"}}>
      <button onClick={back} style={{background:C.goldPale,border:"none",borderRadius:10,padding:"8px 14px",color:C.brown,cursor:"pointer",fontSize:15,fontWeight:700}}>←</button>
      <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.brown}}>{title}</h2>
    </div>
  );
}
function MenuCard({icon,title,sub,col,onClick}) {
  return (
    <div onClick={onClick}
      onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"}
      onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}
      style={{background:C.cardBg,borderRadius:18,padding:"18px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 4px 16px rgba(107,58,42,0.1)",border:"1px solid rgba(212,175,55,0.18)",cursor:"pointer",transition:"transform 0.15s"}}>
      <div style={{width:50,height:50,borderRadius:15,background:col+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}>
        <p style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>{title}</p>
        <p style={{margin:"2px 0 0",fontSize:12,color:C.textLight}}>{sub}</p>
      </div>
      <span style={{fontSize:22,color:C.border}}>›</span>
    </div>
  );
}
function Lbl({children}) {
  return <label style={{display:"block",fontSize:13,fontWeight:600,color:C.textLight,marginBottom:6,letterSpacing:0.3}}>{children}</label>;
}
function Footer() {
  return <p style={{textAlign:"center",fontSize:12,color:C.textLight,marginTop:30,padding:"0 18px"}}>✦ Made by <strong style={{color:C.brown}}>Husain Dewaswala</strong> ✦</p>;
}
