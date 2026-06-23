import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Users, Heart, User, Lock, Copy, Check, Zap, MessageCircle,
  Flag, Globe, Sparkles, Clock, Phone, Mail, BadgeCheck, LogOut, ArrowLeft, Share2
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  SaveBack — interactive sample (sign up, sign in, app)             */
/*  In-memory only. No backend. Refresh resets. Demo account included. */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
:root{
  --ink:#10241B; --muted:#6A7A70; --paper:#E9EFE7; --surface:#FFFFFF;
  --surface-2:#F4F7F2; --line:#E3E9E2;
  --save:#0CA86C; --save-press:#0A8C5A; --save-soft:#E3F6EC;
  --boost:#DC8A1F; --boost-soft:#FBEED6; --danger:#C8503A;
  --disp:'Bricolage Grotesque', system-ui, sans-serif;
  --body:'Hanken Grotesk', system-ui, sans-serif;
}
*{box-sizing:border-box;}
.sb-root{font-family:var(--body); color:var(--ink); min-height:100vh; width:100%;
  background:radial-gradient(1200px 600px at 50% -10%, #DCEAD7 0%, rgba(220,234,215,0) 60%), var(--paper);
  display:flex; align-items:flex-start; justify-content:center; padding:28px 16px 40px;}
.sb-root *::-webkit-scrollbar{width:0;height:0;}
.phone{width:100%; max-width:412px; background:var(--surface-2); border-radius:34px; overflow:hidden;
  position:relative; box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 30px 60px -24px rgba(16,36,27,.45),
  0 0 0 9px #11241B, 0 0 0 11px #20342B; height:min(860px, calc(100vh - 60px)); display:flex; flex-direction:column;}
@media(max-width:480px){.sb-root{padding:0;}.phone{border-radius:0; height:100vh; box-shadow:none; max-width:none;}}

.hdr{display:flex; align-items:center; justify-content:space-between; padding:18px 18px 12px;
  background:var(--surface); border-bottom:1px solid var(--line); flex:0 0 auto;}
.brand{display:flex; flex-direction:column; line-height:1;}
.brand b{font-family:var(--disp); font-weight:800; font-size:22px; letter-spacing:-.02em;}
.brand b span{color:var(--save);}
.brand small{color:var(--muted); font-size:11px; margin-top:3px; letter-spacing:.02em;}
.boostpill{display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;
  background:var(--boost-soft); color:#9A5E0E; padding:7px 11px; border-radius:999px; border:1px solid #F0D9AB;}
.boostpill svg{width:14px;height:14px;}

.filters{display:flex; gap:8px; overflow-x:auto; padding:12px 16px; background:var(--surface);
  border-bottom:1px solid var(--line); flex:0 0 auto;}
.chip{flex:0 0 auto; display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600;
  padding:8px 13px; border-radius:999px; border:1px solid var(--line); background:var(--surface-2);
  color:var(--ink); cursor:pointer; transition:.15s; white-space:nowrap;}
.chip svg{width:14px;height:14px; opacity:.7;}
.chip.on{background:var(--ink); color:#fff; border-color:var(--ink);}
.chip.on svg{opacity:1;}

.body{flex:1 1 auto; overflow-y:auto; padding:14px 16px 22px;}
.lead{font-family:var(--disp); font-weight:700; font-size:15px; margin:4px 2px 12px; display:flex; align-items:center; gap:7px;}
.lead .sub{font-family:var(--body); font-weight:500; font-size:12px; color:var(--muted);}

.card{background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:14px;
  margin-bottom:12px; position:relative; animation:rise .4s both;}
.card.boosted{border-color:#EBC781; box-shadow:0 0 0 1px #EBC781, 0 8px 24px -14px rgba(220,138,31,.5);}
@keyframes rise{from{opacity:0; transform:translateY(8px);}to{opacity:1; transform:none;}}
.crow{display:flex; gap:12px; align-items:flex-start;}
.av{flex:0 0 auto; width:48px; height:48px; border-radius:14px; display:grid; place-items:center;
  font-family:var(--disp); font-weight:700; font-size:18px; color:#fff;}
.who{flex:1 1 auto; min-width:0;}
.who h4{font-family:var(--disp); font-weight:700; font-size:16px; margin:0; letter-spacing:-.01em;
  display:flex; align-items:center; gap:6px;}
.tags{display:flex; flex-wrap:wrap; gap:6px; margin-top:5px;}
.tag{font-size:11px; font-weight:600; color:var(--muted); background:var(--surface-2);
  border:1px solid var(--line); padding:3px 8px; border-radius:999px;}
.tag.boost{color:#9A5E0E; background:var(--boost-soft); border-color:#F0D9AB; display:flex; align-items:center; gap:4px;}
.tag.boost svg{width:11px;height:11px;}
.tag.verif{color:var(--save); background:var(--save-soft); border-color:#BFE8CF; display:flex; align-items:center; gap:4px;}
.tag.verif svg{width:11px;height:11px;}
.blurb{font-size:13px; opacity:.82; margin:9px 0 0; line-height:1.45;}
.numrow{margin-top:12px; padding-top:12px; border-top:1px dashed var(--line); display:flex; align-items:center; gap:10px;}
.locked{display:flex; align-items:center; gap:8px; color:var(--muted); font-size:13px; font-weight:500;}
.locked .dots{font-family:var(--disp); letter-spacing:2px; color:#B6C2BA; font-size:15px;}
.locked svg{width:15px;height:15px;}
.num{font-family:var(--disp); font-weight:700; font-size:17px; letter-spacing:.01em;}

.btn{font-family:var(--body); font-weight:700; font-size:14px; border:none; cursor:pointer; border-radius:12px;
  padding:11px 14px; display:flex; align-items:center; justify-content:center; gap:7px; transition:.15s; white-space:nowrap;}
.btn svg{width:16px;height:16px;}
.btn:active{transform:scale(.97);}
.btn:disabled{opacity:.5; cursor:not-allowed;}
.btn-save{background:var(--save); color:#fff; width:100%;}
.btn-save:hover:not(:disabled){background:var(--save-press);}
.btn-wait{background:var(--save-soft); color:var(--save-press); width:100%; cursor:default;}
.btn-ghost{background:var(--surface-2); color:var(--ink); border:1px solid var(--line);}
.btn-wa{background:#1FA855; color:#fff; flex:1;}
.btn-wa:hover{background:#178A45;}
.btn-copy{background:var(--ink); color:#fff; flex:0 0 auto;}
.iconbtn{position:absolute; top:12px; right:12px; width:30px;height:30px; border-radius:9px;
  background:var(--surface-2); border:1px solid var(--line); display:grid; place-items:center; cursor:pointer; color:var(--muted);}
.iconbtn svg{width:14px;height:14px;}
.matched-actions{display:flex; gap:8px; margin-top:12px;}
.reveal .num{animation:unlock .7s both;}
@keyframes unlock{0%{filter:blur(8px); opacity:0; transform:translateY(4px);} 60%{filter:blur(0); opacity:1;} 100%{filter:none; transform:none;}}
.matchflag{display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:var(--save);
  background:var(--save-soft); padding:3px 8px; border-radius:999px;}
.matchflag svg{width:12px;height:12px;}

.nav{flex:0 0 auto; display:flex; background:var(--surface); border-top:1px solid var(--line); padding:8px 6px;}
.navb{flex:1; background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center;
  gap:3px; padding:6px 0; color:var(--muted); font-size:10.5px; font-weight:600; position:relative;}
.navb svg{width:21px;height:21px;}
.navb.on{color:var(--save);}
.navb .badge{position:absolute; top:0; right:50%; transform:translateX(16px); background:var(--danger); color:#fff;
  font-size:9px; font-weight:700; min-width:15px; height:15px; border-radius:999px; display:grid; place-items:center; padding:0 3px;}

.empty{text-align:center; padding:48px 24px; color:var(--muted);}
.empty .ic{width:54px;height:54px; border-radius:16px; background:var(--surface); border:1px solid var(--line);
  display:grid; place-items:center; margin:0 auto 14px;}
.empty .ic svg{width:24px;height:24px; color:#AFBCB3;}
.empty h3{font-family:var(--disp); font-weight:700; color:var(--ink); font-size:16px; margin:0 0 5px;}
.empty p{font-size:13px; margin:0; line-height:1.5;}

.toast{position:absolute; left:16px; right:16px; bottom:84px; z-index:30; background:var(--ink); color:#fff;
  border-radius:14px; padding:13px 15px; font-size:13.5px; font-weight:600; display:flex; align-items:center; gap:9px;
  animation:pop .25s both; box-shadow:0 16px 30px -12px rgba(16,36,27,.6);}
.toast svg{width:17px;height:17px; flex:0 0 auto;}
@keyframes pop{from{opacity:0; transform:translateY(10px);}to{opacity:1;transform:none;}}

/* auth */
.auth{position:absolute; inset:0; z-index:50; background:var(--surface); display:flex; flex-direction:column;
  padding:26px 22px; overflow-y:auto;}
.auth h1{font-family:var(--disp); font-weight:800; font-size:26px; letter-spacing:-.02em; margin:14px 0 4px;}
.auth h1 span{color:var(--save);}
.auth .tg{color:var(--muted); font-size:14px; margin:0 0 20px; line-height:1.5;}
.authtabs{display:flex; gap:6px; background:var(--surface-2); border:1px solid var(--line); border-radius:14px; padding:4px; margin-bottom:20px;}
.authtab{flex:1; text-align:center; font-weight:700; font-size:14px; padding:10px; border-radius:10px; border:none;
  background:none; color:var(--muted); cursor:pointer;}
.authtab.on{background:var(--surface); color:var(--ink); box-shadow:0 1px 4px rgba(16,36,27,.1);}
.fld{margin-bottom:15px;}
.fld label{display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:7px; text-transform:uppercase; letter-spacing:.04em;}
.inp{display:flex; align-items:center; gap:9px; border:1px solid var(--line); border-radius:12px; background:var(--surface-2); padding:0 13px;}
.inp svg{width:16px;height:16px; color:var(--muted); flex:0 0 auto;}
.inp input{flex:1; font-family:var(--body); font-size:15px; padding:13px 0; border:none; background:none; color:var(--ink); outline:none;}
.inp:focus-within{border-color:var(--save); background:#fff;}
.opts{display:flex; flex-wrap:wrap; gap:8px;}
.opt{font-size:13px; font-weight:600; padding:9px 13px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface-2); cursor:pointer; transition:.15s;}
.opt.on{background:var(--save); color:#fff; border-color:var(--save);}
.go{margin-top:auto; padding-top:18px;}
.note{font-size:11.5px; color:var(--muted); text-align:center; margin-top:11px; line-height:1.5;}
.lockmsg{display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--muted); margin-top:6px;}
.lockmsg svg{width:12px;height:12px;}
.demohint{background:var(--save-soft); border:1px solid #BFE8CF; border-radius:12px; padding:11px 13px; font-size:12.5px;
  color:#0A6E48; margin-bottom:18px; line-height:1.5;}
.demohint b{color:#085; }
.linkbtn{background:none; border:none; color:var(--save); font-weight:700; font-size:13px; cursor:pointer; padding:0;}
.codebox{display:flex; gap:8px; justify-content:center; margin:6px 0 4px;}
.codebox input{width:52px; height:58px; text-align:center; font-family:var(--disp); font-weight:800; font-size:24px;
  border:1px solid var(--line); border-radius:12px; background:var(--surface-2); color:var(--ink); outline:none;}
.codebox input:focus{border-color:var(--save); background:#fff;}
.verifrow{display:flex; align-items:center; gap:10px; border:1px solid var(--line); border-radius:12px; padding:12px 13px; margin-top:12px;}
.verifrow .ic{width:34px;height:34px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;color:var(--muted);}
.verifrow .ic svg{width:17px;height:17px;}
.verifrow .t{flex:1;}.verifrow .t b{font-size:13.5px;}.verifrow .t small{display:block;color:var(--muted);font-size:11.5px;}
.verifrow.done{border-color:#BFE8CF; background:var(--save-soft);}
.verifrow.done .ic{background:#fff;color:var(--save);}
.back{display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--muted);font-weight:600;font-size:13px;cursor:pointer;padding:0;}

.mecard{background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:18px; text-align:center; margin-bottom:14px;}
.mecard .av{width:66px;height:66px; border-radius:20px; margin:0 auto 12px; font-size:26px;}
.mecard h2{font-family:var(--disp); font-weight:800; font-size:21px; margin:0;}
.mecard .mtags{justify-content:center; margin-top:8px;}
.idrow{display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;color:var(--muted);margin-top:10px;}
.idrow svg{width:13px;height:13px;color:var(--save);}
.boostbox{background:linear-gradient(135deg,#FBEED6,#F8E0B5); border:1px solid #EBC781; border-radius:18px; padding:18px; text-align:center;}
.boostbox h3{font-family:var(--disp); font-weight:800; font-size:18px; margin:0 0 4px; color:#7A4A0A;}
.boostbox p{font-size:13px; color:#8A5A1A; margin:0 0 14px; line-height:1.5;}
.btn-boost{background:var(--boost); color:#fff; width:100%;}
.btn-boost:hover{background:#C57A12;}
.counter{font-family:var(--disp); font-weight:800; font-size:30px; color:#7A4A0A;}
.free{display:inline-block; font-size:10.5px; font-weight:700; color:var(--save); background:var(--save-soft); padding:3px 9px; border-radius:999px; margin-bottom:10px; border:1px solid #BFE8CF;}
.signout{display:flex;align-items:center;justify-content:center;gap:7px;background:none;border:1px solid var(--line);
  color:var(--danger);font-weight:700;font-size:14px;border-radius:12px;padding:11px;width:100%;cursor:pointer;margin-top:14px;}
.signout svg{width:16px;height:16px;}
@media(prefers-reduced-motion:reduce){*{animation:none !important;}}
button:focus-visible,input:focus-visible{outline:2px solid var(--save); outline-offset:2px;}
`;

const FLAG = { Kenya:"🇰🇪", Uganda:"🇺🇬", Tanzania:"🇹🇿", Nigeria:"🇳🇬", Ghana:"🇬🇭", "South Africa":"🇿🇦" };
const COUNTRIES = ["Kenya","Uganda","Tanzania","Nigeria","Ghana","South Africa"];
const CATS = ["Business","Content creator","Reseller","Networking","Social"];
const AVC = ["#0CA86C","#DC8A1F","#3B7DD8","#B0543C","#7A4FB0","#1A9E8F","#C0397B"];
const avc = (s)=> AVC[[...(s||"x")].reduce((a,c)=>a+c.charCodeAt(0),0) % AVC.length];

const DEMO = { id:"me", name:"Sam", phone:"254712000111", email:"sam@example.com",
  country:"Kenya", cat:"Business", blurb:"Building SaveBack. Save for save 🙏", emailVerified:true };

const SEED = [
  { id:1, name:"Brian Otieno", country:"Kenya", cat:"Business", num:"254712345001", boosted:true, status:"discover", blurb:"M-Pesa agent & airtime, Kasarani. Tusaidiane 🙏" },
  { id:2, name:"Wanjiru Kamau", country:"Kenya", cat:"Reseller", num:"254712345002", boosted:false, status:"incoming", blurb:"Thrift fits & bags, Nairobi CBD." },
  { id:3, name:"Faith Achieng", country:"Kenya", cat:"Content creator", num:"254712345003", boosted:true, status:"discover", blurb:"Status views machine, 12k daily." },
  { id:4, name:"Kevin Mwangi", country:"Kenya", cat:"Networking", num:"254712345004", boosted:false, status:"discover", blurb:"Tech & side hustles. Building my circle." },
  { id:5, name:"Aisha Hassan", country:"Kenya", cat:"Business", num:"254712345005", boosted:false, status:"incoming", blurb:"Mama fua services, Ruaka. Reliable." },
  { id:6, name:"Dennis Kiptoo", country:"Kenya", cat:"Social", num:"254712345006", boosted:false, status:"discover", blurb:"Here to meet new people. Save for save." },
  { id:7, name:"Mercy Njeri", country:"Kenya", cat:"Content creator", num:"254712345007", boosted:false, status:"discover", blurb:"Skincare reviews + giveaways." },
  { id:8, name:"Samuel Barasa", country:"Kenya", cat:"Reseller", num:"254712345008", boosted:false, status:"discover", blurb:"Phones & accessories, town." },
  { id:9, name:"Grace Nyambura", country:"Kenya", cat:"Networking", num:"254712345009", boosted:false, status:"discover", blurb:"Real estate & rentals. Let's connect." },
  { id:10, name:"Tendo Ssali", country:"Uganda", cat:"Business", num:"256772345010", boosted:false, status:"discover", blurb:"Kampala vibes. Cross-border hustle welcome." },
  { id:11, name:"Zawadi Juma", country:"Tanzania", cat:"Content creator", num:"255712345011", boosted:false, status:"discover", blurb:"Bongo creator, tunakua pamoja." },
  { id:12, name:"Chidi Okeke", country:"Nigeria", cat:"Reseller", num:"234812345012", boosted:false, status:"discover", blurb:"Lagos plug, gadgets & gist." },
  { id:13, name:"Esther Wambui", country:"Kenya", cat:"Social", num:"254712345013", boosted:false, status:"discover", blurb:"New in Nairobi, making friends 👋" },
  { id:14, name:"Collins Omondi", country:"Kenya", cat:"Business", num:"254712345014", boosted:false, status:"discover", blurb:"Boda logistics, deliveries CBD." },
];

const fmtNum = (n)=> n.startsWith("254") ? "+254 "+n.slice(3,6)+" "+n.slice(6,9)+" "+n.slice(9) : "+"+n;

export default function App(){
  const [signedIn, setSignedIn] = useState(false);
  const [accounts, setAccounts] = useState([DEMO]);
  const [user, setUser] = useState(null);

  // auth ui
  const [mode, setMode] = useState("signin");   // signin | signup
  const [step, setStep] = useState("form");      // form | verify
  const [form, setForm] = useState({ name:"", phone:"", email:"", country:"Kenya", cat:"Business", blurb:"" });
  const [code, setCode] = useState(["","","",""]);
  const [emailOk, setEmailOk] = useState(false);
  const [authErr, setAuthErr] = useState("");

  // app state
  const [people, setPeople] = useState(SEED);
  const [tab, setTab] = useState("discover");
  const [catFilter, setCatFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [justMatched, setJustMatched] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [boost, setBoost] = useState({ on:false, ends:0 });
  const timers = useRef([]);

  useEffect(()=>{ if(!boost.on) return; const i=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(i); },[boost.on]);
  useEffect(()=>{ if(boost.on && now>=boost.ends) setBoost({on:false,ends:0}); },[now,boost]);
  useEffect(()=>()=> timers.current.forEach(clearTimeout), []);

  const showToast = (msg,icon)=>{ setToast({msg,icon}); const t=setTimeout(()=>setToast(null),2600); timers.current.push(t); };

  const resetAuth = ()=>{ setStep("form"); setCode(["","","",""]); setEmailOk(false); setAuthErr(""); };

  const submitForm = ()=>{
    setAuthErr("");
    if(mode==="signin"){
      const acct = accounts.find(a=> a.phone===form.phone.replace(/[^\d]/g,"") || a.email.toLowerCase()===form.email.toLowerCase());
      if(!acct){ setAuthErr("No account with those details. Try the demo, or sign up."); return; }
      setForm(f=>({...f, _acct:acct.id, phone:acct.phone, email:acct.email }));
    } else {
      if(!form.name || !form.phone || !form.email){ setAuthErr("Name, phone and email are required."); return; }
      if(!/^\S+@\S+\.\S+$/.test(form.email)){ setAuthErr("Enter a valid email."); return; }
    }
    setStep("verify"); setCode(["1","2","3","4"]); setEmailOk(false); // demo: code prefilled
  };

  const finishVerify = ()=>{
    if(code.join("").length<4 || !emailOk){ setAuthErr("Enter the code and verify your email."); return; }
    let acct;
    if(mode==="signin"){
      acct = accounts.find(a=> a.id===form._acct);
    } else {
      acct = { id:"u"+Date.now(), name:form.name, phone:form.phone.replace(/[^\d]/g,""), email:form.email,
        country:form.country, cat:form.cat, blurb:form.blurb||"Save for save 🙏", emailVerified:true };
      setAccounts(a=>[...a, acct]);
    }
    setUser(acct); setSignedIn(true); setTab("discover"); resetAuth();
  };

  const signOut = ()=>{ setSignedIn(false); setUser(null); setMode("signin"); resetAuth();
    setForm({ name:"", phone:"", email:"", country:"Kenya", cat:"Business", blurb:"" });
    setPeople(SEED); setBoost({on:false,ends:0}); setJustMatched([]); };

  // feed ordering
  const rkey = useMemo(()=>{ const m={}; SEED.forEach(p=> m[p.id]=Math.random()); return m; },[]);
  const feed = useMemo(()=>{
    if(!user) return [];
    let list = people.filter(p=> p.status==="discover"||p.status==="sent");
    if(catFilter!=="All") list=list.filter(p=>p.cat===catFilter);
    const grp=(p)=>{ if(p.boosted) return 0; const sc=p.country===user.country, sk=p.cat===user.cat;
      if(sc&&sk)return 1; if(sc)return 2; if(sk)return 3; return 4; };
    return [...list].sort((a,b)=> grp(a)-grp(b) || rkey[a.id]-rkey[b.id]);
  },[people,catFilter,user,rkey]);
  const incoming = people.filter(p=>p.status==="incoming");
  const matches = people.filter(p=>p.status==="matched");
  const set=(id,patch)=> setPeople(ps=>ps.map(p=>p.id===id?{...p,...patch}:p));

  const saveFor=(p)=>{ set(p.id,{status:"sent"});
    const t=setTimeout(()=>{ if(Math.random()<0.82){ set(p.id,{status:"matched"}); setJustMatched(j=>[...j,p.id]);
        showToast(`${p.name.split(" ")[0]} saved you back. Number unlocked.`,"match"); }
      else showToast(`${p.name.split(" ")[0]} hasn't saved back yet.`,"clock"); },1500); timers.current.push(t); };
  const accept=(p)=>{ set(p.id,{status:"matched"}); setJustMatched(j=>[...j,p.id]); showToast(`Matched with ${p.name.split(" ")[0]}. Number unlocked.`,"match"); };
  const copyNum=async(num)=>{ try{await navigator.clipboard.writeText("+"+num);}catch(e){} showToast("Number copied","copy"); };
  const waLink=(p)=>{ const text=encodeURIComponent(`Hey ${p.name.split(" ")[0]}, this is ${user.name}. Save for save 🙏`);
    window.open(`https://wa.me/${p.num}?text=${text}`,"_blank"); };
  const doBoost=()=>{ setBoost({on:true, ends:Date.now()+3600*1000}); showToast("You're favored for 1 hour.","boost"); };
  const counter=()=>{ const s=Math.max(0,Math.floor((boost.ends-now)/1000));
    return [Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(x=>String(x).padStart(2,"0")).join(":"); };

  const TIcon=({k})=>({match:<Check/>,copy:<Check/>,clock:<Clock/>,boost:<Zap/>}[k]||<Check/>);

  /* ---------------- AUTH ---------------- */
  if(!signedIn){
    return (
      <div className="sb-root"><style>{CSS}</style>
        <div className="phone"><div className="auth">
          <div className="brand"><b>Save<span>Back</span></b><small>save for save</small></div>

          {step==="form" && (<>
            <h1>{mode==="signin" ? <>Welcome<br/>back.</> : <>Join<br/><span>SaveBack.</span></>}</h1>
            <p className="tg">{mode==="signin" ? "Sign in with the phone or email on your account." : "Real people only. Your number stays hidden until you both save."}</p>

            <div className="authtabs">
              <button className={"authtab"+(mode==="signin"?" on":"")} onClick={()=>{setMode("signin");resetAuth();}}>Sign in</button>
              <button className={"authtab"+(mode==="signup"?" on":"")} onClick={()=>{setMode("signup");resetAuth();}}>Sign up</button>
            </div>

            {mode==="signin" && (
              <div className="demohint">Try it fast: tap <button className="linkbtn" onClick={()=>{
                setForm(f=>({...f, phone:DEMO.phone, email:DEMO.email})); }}>use the demo account</button>, then continue. <br/><b>Demo phone:</b> 254712000111</div>
            )}

            {mode==="signup" && (
              <div className="fld"><label>Name</label>
                <div className="inp"><User/><input value={form.name} placeholder="e.g. Sam" onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div></div>
            )}
            <div className="fld"><label>WhatsApp number</label>
              <div className="inp"><Phone/><input value={form.phone} inputMode="tel" placeholder="254712000000"
                onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/[^\d]/g,"")}))}/></div>
              {mode==="signup" && <div className="lockmsg"><Lock/> Hidden until you both save. Verified by code.</div>}</div>
            <div className="fld"><label>Email</label>
              <div className="inp"><Mail/><input value={form.email} inputMode="email" placeholder="you@email.com"
                onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              {mode==="signup" && <div className="lockmsg"><Lock/> Private. Used for your account and safety, never shown to others.</div>}</div>

            {mode==="signup" && (<>
              <div className="fld"><label>Country</label><div className="opts">{COUNTRIES.map(c=>
                <button key={c} className={"opt"+(form.country===c?" on":"")} onClick={()=>setForm(f=>({...f,country:c}))}>{FLAG[c]} {c}</button>)}</div></div>
              <div className="fld"><label>Category</label><div className="opts">{CATS.map(c=>
                <button key={c} className={"opt"+(form.cat===c?" on":"")} onClick={()=>setForm(f=>({...f,cat:c}))}>{c}</button>)}</div></div>
              <div className="fld"><label>Short blurb</label>
                <div className="inp"><Sparkles/><input value={form.blurb} placeholder="What you're about" onChange={e=>setForm(f=>({...f,blurb:e.target.value}))}/></div></div>
            </>)}

            {authErr && <p style={{color:"var(--danger)",fontSize:13,fontWeight:600,margin:"4px 2px"}}>{authErr}</p>}
            <div className="go">
              <button className="btn btn-save" onClick={submitForm}>{mode==="signin"?"Continue":"Create account"}</button>
              <p className="note">Demo only. Nothing is sent or stored. Refresh resets everything.</p>
            </div>
          </>)}

          {step==="verify" && (<>
            <button className="back" onClick={()=>{setStep("form");setAuthErr("");}}><ArrowLeft/> Back</button>
            <h1 style={{fontSize:23}}>Verify it's<br/><span>really you.</span></h1>
            <p className="tg">This is what makes bans stick and keeps SaveBack real.</p>

            <label style={{fontSize:12,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".04em"}}>Code sent to {fmtNum(form.phone.replace(/[^\d]/g,""))}</label>
            <div className="codebox">{code.map((d,i)=>
              <input key={i} value={d} maxLength={1} inputMode="numeric" onChange={e=>{
                const v=e.target.value.replace(/[^\d]/g,""); setCode(c=>{const n=[...c];n[i]=v;return n;}); }}/> )}</div>
            <p className="note" style={{marginTop:0}}>Demo: any 4 digits (prefilled for you).</p>

            <div className={"verifrow"+(emailOk?" done":"")} onClick={()=>setEmailOk(true)} style={{cursor:"pointer"}}>
              <div className="ic">{emailOk?<BadgeCheck/>:<Mail/>}</div>
              <div className="t"><b>{emailOk?"Email verified":"Verify your email"}</b>
                <small>{emailOk? form.email : `Tap here to confirm the link sent to ${form.email}`}</small></div>
              {emailOk && <Check style={{width:18,height:18,color:"var(--save)"}}/>}
            </div>

            {authErr && <p style={{color:"var(--danger)",fontSize:13,fontWeight:600,margin:"10px 2px 0"}}>{authErr}</p>}
            <div className="go">
              <button className="btn btn-save" onClick={finishVerify} disabled={code.join("").length<4||!emailOk}>
                <BadgeCheck/> {mode==="signin"?"Sign in":"Finish & enter"}</button>
            </div>
          </>)}
        </div></div>
      </div>
    );
  }

  /* ---------------- APP ---------------- */
  return (
    <div className="sb-root"><style>{CSS}</style>
      <div className="phone">
        <div className="hdr">
          <div className="brand"><b>Save<span>Back</span></b><small>save for save</small></div>
          {boost.on
            ? <div className="boostpill"><Zap/> Favored · {counter()}</div>
            : <div className="boostpill" style={{background:"var(--save-soft)",color:"var(--save-press)",borderColor:"#BFE8CF"}}><Globe/> {FLAG[user.country]} {user.country}</div>}
        </div>

        {tab==="discover" && (
          <div className="filters">{["All",...CATS].map(c=>
            <button key={c} className={"chip"+(catFilter===c?" on":"")} onClick={()=>setCatFilter(c)}>{c==="All"&&<Sparkles/>}{c}</button>)}</div>
        )}

        <div className="body">
          {tab==="discover" && (<>
            <div className="lead">Discover <span className="sub">· {FLAG[user.country]} {user.country} & {user.cat} first</span></div>
            {feed.length===0 && <Empty icon={<Search/>} t="Nobody here yet" p="Try another category, or invite your group to seed the area."/>}
            {feed.map(p=>(
              <div key={p.id} className={"card"+(p.boosted?" boosted":"")}>
                <button className="iconbtn" title="Report" onClick={()=>{ set(p.id,{status:"ignored"}); showToast("Reported and hidden","match"); }}><Flag/></button>
                <div className="crow">
                  <div className="av" style={{background:avc(p.name)}}>{p.name[0]}</div>
                  <div className="who"><h4>{p.name}</h4>
                    <div className="tags"><span className="tag">{FLAG[p.country]} {p.country}</span><span className="tag">{p.cat}</span>
                      <span className="tag verif"><BadgeCheck/> verified</span>
                      {p.boosted && <span className="tag boost"><Zap/> Favored</span>}</div></div>
                </div>
                <p className="blurb">{p.blurb}</p>
                <div className="numrow"><div className="locked"><Lock/> <span className="dots">•••• ••• •••</span></div></div>
                <div style={{marginTop:10}}>
                  {p.status==="sent"
                    ? <button className="btn btn-wait"><Clock/> Saved, waiting for them…</button>
                    : <button className="btn btn-save" onClick={()=>saveFor(p)}><Heart/> Save for save</button>}
                </div>
              </div>
            ))}
          </>)}

          {tab==="requests" && (<>
            <div className="lead">Requests <span className="sub">· they saved you first</span></div>
            {incoming.length===0 && <Empty icon={<Users/>} t="No requests yet" p="When someone saves you first, they appear here. Save back to unlock numbers."/>}
            {incoming.map(p=>(
              <div key={p.id} className="card">
                <div className="crow"><div className="av" style={{background:avc(p.name)}}>{p.name[0]}</div>
                  <div className="who"><h4>{p.name}</h4>
                    <div className="tags"><span className="tag">{FLAG[p.country]} {p.country}</span><span className="tag">{p.cat}</span>
                      <span className="matchflag"><Heart/> saved you</span></div></div></div>
                <p className="blurb">{p.blurb}</p>
                <div className="matched-actions">
                  <button className="btn btn-save" style={{flex:1}} onClick={()=>accept(p)}><Check/> Save back</button>
                  <button className="btn btn-ghost" onClick={()=>set(p.id,{status:"ignored"})}>Skip</button>
                </div>
              </div>
            ))}
          </>)}

          {tab==="matches" && (<>
            <div className="lead">Matches <span className="sub">· numbers unlocked</span></div>
            {matches.length===0 && <Empty icon={<Heart/>} t="No matches yet" p="Save people in Discover. When they save back, the number unlocks here."/>}
            {matches.map(p=>{ const fresh=justMatched.includes(p.id); return (
              <div key={p.id} className={"card"+(fresh?" reveal":"")}>
                <div className="crow"><div className="av" style={{background:avc(p.name)}}>{p.name[0]}</div>
                  <div className="who"><h4>{p.name} <span className="matchflag"><Check/> matched</span></h4>
                    <div className="tags"><span className="tag">{FLAG[p.country]} {p.country}</span><span className="tag">{p.cat}</span></div></div></div>
                <div className="numrow"><div className="num">{fmtNum(p.num)}</div></div>
                <div className="matched-actions">
                  <button className="btn btn-copy" onClick={()=>copyNum(p.num)}><Copy/> Copy</button>
                  <button className="btn btn-wa" onClick={()=>waLink(p)}><MessageCircle/> Save me back on WhatsApp</button>
                </div>
              </div> ); })}
          </>)}

          {tab==="me" && (<>
            <div className="lead">You</div>
            <div className="mecard">
              <div className="av" style={{background:avc(user.name)}}>{user.name[0].toUpperCase()}</div>
              <h2>{user.name}</h2>
              <div className="tags mtags"><span className="tag">{FLAG[user.country]} {user.country}</span><span className="tag">{user.cat}</span>
                {boost.on && <span className="tag boost"><Zap/> Favored</span>}</div>
              <div className="idrow"><BadgeCheck/> {fmtNum(user.phone)} · phone verified</div>
              <div className="idrow"><BadgeCheck/> {user.email} · email verified (private)</div>
              <div className="lockmsg" style={{justifyContent:"center",marginTop:8}}><Lock/> your number is shown only on a mutual save</div>
            </div>

            <div className="boostbox">
              <span className="free">Free during launch</span>
              {boost.on ? (<><h3>You're favored</h3><p>Your profile sits at the top of feeds in your country and category.</p><div className="counter">{counter()}</div></>)
                : (<><h3>Boost your number</h3><p>Get pinned to the top of feeds for 1 hour. More eyes, more saves.</p>
                  <button className="btn btn-boost" onClick={doBoost}><Zap/> Boost for 1 hour</button></>)}
            </div>

            <button className="btn btn-ghost" style={{width:"100%",marginTop:14}} onClick={()=>{
              const link=`saveback.app/u/${user.name.toLowerCase().replace(/\s+/g,"")}`;
              try{navigator.clipboard.writeText(link);}catch(e){} showToast("Invite link copied","copy"); }}>
              <Share2/> Copy my invite link</button>

            <button className="signout" onClick={signOut}><LogOut/> Sign out</button>
            <p className="note" style={{marginTop:14}}>Later: paid boosts and intro packs that queue one-tap WhatsApp invites from your own phone.</p>
          </>)}
        </div>

        {toast && <div className="toast"><TIcon k={toast.icon}/> {toast.msg}</div>}

        <div className="nav">
          {[["discover",<Search/>,"Discover"],["requests",<Users/>,"Requests",incoming.length],["matches",<Heart/>,"Matches"],["me",<User/>,"You"]].map(([k,ic,label,badge])=>(
            <button key={k} className={"navb"+(tab===k?" on":"")} onClick={()=>setTab(k)}>
              {badge>0 && <span className="badge">{badge}</span>}{ic}{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Empty({icon,t,p}){ return (<div className="empty"><div className="ic">{icon}</div><h3>{t}</h3><p>{p}</p></div>); }
