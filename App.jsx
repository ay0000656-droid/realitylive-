import{useState,useEffect,useRef,useCallback}from"react";
const FC={apiKey:"AIzaSyDvOfC3ggo204_urbjarcKDnHIMKNqPJxU",authDomain:"realitylive-c9e27.firebaseapp.com",projectId:"realitylive-c9e27",storageBucket:"realitylive-c9e27.firebasestorage.app",messagingSenderId:"476273854407",appId:"1:476273854407:web:49dd27e1d288009497bbe2"};
const FBR=FC.apiKey!=="YOUR";
const AGORA="eb6533f773124b6ab8e7b782bc718c84";
const PSKEY="pk_live_2cdbfd0a3340c67656ca92204f4c78901fed0a19";
const T={bg:"#080810",sur:"#0F0F1A",card:"#161625",bdr:"#252538",acc:"#E8365D",acl:"rgba(232,54,93,0.12)",grn:"#1DB954",txt:"#EEEEFc",mut:"#6B6B8A",wht:"#FFFFFF"};
const SHOWS=[
{id:"s1",title:"Vocal Powerhouse",emoji:"🎤",host:"Amara K.",viewers:3842,color:T.acc,contestants:["Chisom","Bayo","Zainab","Emeka"],votes:[820,610,940,430]},
{id:"s2",title:"Street Comedy Battle",emoji:"😂",host:"Tunde F.",viewers:1920,color:"#F77F00",contestants:["Sola","Kemi","Dami","Rauf"],votes:[510,390,280,620]},
{id:"s3",title:"Dance Explosion",emoji:"💃",host:"Blessing O.",viewers:2611,color:"#9B5DE5",contestants:["Fatima","Chidi","Ngozi","Seun"],votes:[730,540,410,680]},
{id:"s4",title:"Hustle Nation",emoji:"🏙️",host:"Chuks M.",viewers:987,color:"#06D6A0",contestants:["Ada","Jide","Hauwa","Tope"],votes:[310,280,190,350]},
];
const LB=[
{rank:1,name:"Zainab",show:"Vocal Powerhouse",votes:14820,color:T.acc},
{rank:2,name:"Rauf",show:"Street Comedy",votes:11240,color:"#F77F00"},
{rank:3,name:"Chisom",show:"Vocal Powerhouse",votes:9310,color:T.acc},
{rank:4,name:"Seun",show:"Dance Explosion",votes:7650,color:"#9B5DE5"},
{rank:5,name:"Tope",show:"Hustle Nation",votes:6200,color:"#06D6A0"},
];
const CHAT=[
{user:"superfan_ng",text:"Zainab is GOING OFF 🔥"},
{user:"realtvaddict",text:"Vote Rauf!! he carried that set"},
{user:"watchdog99",text:"Better than Big Brother lol"},
{user:"stageking",text:"First time here — this is REAL"},
];
const PACKS=[
{id:"a",label:"Starter",votes:10,amount:50000,display:"₦500"},
{id:"b",label:"Super Fan",votes:50,amount:200000,display:"₦2,000"},
{id:"c",label:"Legend",votes:150,amount:500000,display:"₦5,000"},
];

// ─── REALITYLIVE LOGO SVG ─────────────────────────────────────────────────────
function Logo({size=28}){
  return(
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <circle cx="20" cy="20" r="20" fill="#E8365D"/>
      <circle cx="20" cy="20" r="7" fill="white"/>
      <circle cx="20" cy="20" r="3" fill="#E8365D"/>
      <circle cx="32" cy="10" r="3" fill="white" opacity="0.9"/>
      <line x1="20" y1="20" x2="32" y2="10" stroke="white" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="8" cy="10" r="3" fill="white" opacity="0.9"/>
      <line x1="20" y1="20" x2="8" y2="10" stroke="white" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="8" cy="30" r="3" fill="white" opacity="0.9"/>
      <line x1="20" y1="20" x2="8" y2="30" stroke="white" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="32" cy="30" r="3" fill="white" opacity="0.9"/>
      <line x1="20" y1="20" x2="32" y2="30" stroke="white" strokeWidth="1.5" opacity="0.6"/>
    </svg>
  );
}

const fmt=n=>n>=1000?(n/1000).toFixed(1)+"K":n;
let _db=null,_auth=null,_fbl=false;
async function loadFB(){
  if(_fbl)return{db:_db,auth:_auth};
  if(!FBR)return{db:null,auth:null};
  try{
    const[a,f,au]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"),
    ]);
    const app=a.initializeApp(FC);
    _db={fs:f.getFirestore(app),doc:f.doc,setDoc:f.setDoc,getDoc:f.getDoc,updateDoc:f.updateDoc,inc:f.increment};
    _auth={a:au.getAuth(app),create:au.createUserWithEmailAndPassword,sign:au.signInWithEmailAndPassword,out:au.signOut,GP:au.GoogleAuthProvider,popup:au.signInWithPopup};
    _fbl=true;return{db:_db,auth:_auth};
  }catch(e){return{db:null,auth:null};}
}
async function fbUp(email,pw,name,role){
  const{auth,db}=await loadFB();if(!auth)return null;
  try{const c=await auth.create(auth.a,email,pw);const uid=c.user.uid;const p={name,email,role,voteCredits:3,createdAt:Date.now()};if(db)await db.setDoc(db.doc(db.fs,"users",uid),p);return{uid,...p};}catch(e){return{error:e.message};}
}
async function fbIn(email,pw){
  const{auth,db}=await loadFB();if(!auth)return null;
  try{const c=await auth.sign(auth.a,email,pw);const uid=c.user.uid;if(db){const s=await db.getDoc(db.doc(db.fs,"users",uid));if(s.exists())return{uid,...s.data()};}return{uid,name:email.split("@")[0],email,role:"viewer",voteCredits:3};}catch(e){return{error:e.message};}
}
async function fbGoogle(){
  const{auth,db}=await loadFB();if(!auth)return{error:"No Firebase"};
  try{const p=new auth.GP();const c=await auth.popup(auth.a,p);const uid=c.user.uid;const name=c.user.displayName||c.user.email.split("@")[0];const email=c.user.email;if(db){const s=await db.getDoc(db.doc(db.fs,"users",uid));if(s.exists())return{uid,...s.data()};const pr={name,email,role:"viewer",voteCredits:3,createdAt:Date.now()};await db.setDoc(db.doc(db.fs,"users",uid),pr);return{uid,...pr};}return{uid,name,email,role:"viewer",voteCredits:3};}catch(e){return{error:e.message};}
}
async function fbVote(uid,showId,idx){
  const{db}=await loadFB();if(!db||!uid)return;
  await db.setDoc(db.doc(db.fs,"votes",`${uid}_${showId}`),{uid,showId,idx,ts:Date.now()});
  await db.updateDoc(db.doc(db.fs,"users",uid),{voteCredits:db.inc(-1)});
}
async function fbAddV(uid,credits){
  const{db}=await loadFB();if(!db||!uid)return;
  await db.updateDoc(db.doc(db.fs,"users",uid),{voteCredits:db.inc(credits)});
}
async function fbReport(uid,showId,reason){
  const{db}=await loadFB();if(!db)return;
  await db.setDoc(db.doc(db.fs,"reports",`${uid}_${showId}_${Date.now()}`),{uid,showId,reason,ts:Date.now(),reviewed:false});
}
function usePS(){
  const[ready,setReady]=useState(false);
  useEffect(()=>{if(window.PaystackPop){setReady(true);return;}const s=document.createElement("script");s.src="https://js.paystack.co/v1/inline.js";s.onload=()=>setReady(true);document.head.appendChild(s);},[]);
  const pay=useCallback(({email,amount,onSuccess,onClose,meta={}})=>{if(!window.PaystackPop)return;const h=window.PaystackPop.setup({key:PSKEY,email,amount,currency:"NGN",ref:"RL_"+Date.now(),metadata:{custom_fields:[{display_name:"Platform",value:"RealityLive",...meta}]},callback:onSuccess,onClose});h.openIframe();},[]);
  return{ready,pay};
}
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Syne:wght@700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg};color:${T.txt};font-family:'Space Grotesk',sans-serif;min-height:100vh}
.sy{font-family:'Syne',sans-serif}
@keyframes tick{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}
.tk{display:inline-block;animation:tick 28s linear infinite;white-space:nowrap}
@keyframes lp{0%,100%{box-shadow:0 0 0 0 rgba(232,54,93,.7)}70%{box-shadow:0 0 0 8px rgba(232,54,93,0)}}
.ld{width:8px;height:8px;border-radius:50%;background:${T.acc};display:inline-block;animation:lp 1.6s ease-in-out infinite}
.bp{background:${T.acc};color:#000;border:none;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:700;cursor:pointer;transition:all .15s}
.bp:hover{filter:brightness(1.1);transform:translateY(-1px)}
.bg{background:transparent;color:${T.mut};border:1px solid ${T.bdr};border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:500;cursor:pointer;transition:all .15s}
.bg:hover{color:${T.txt};border-color:${T.mut}}
.cd{background:${T.card};border:1px solid ${T.bdr};border-radius:14px}
.cd:hover{border-color:#3A3A58}
input,textarea,select{background:${T.sur};border:1px solid ${T.bdr};border-radius:8px;color:${T.txt};font-family:'Space Grotesk',sans-serif;font-size:14px;padding:10px 14px;outline:none;transition:border-color .15s;width:100%}
input:focus,textarea:focus,select:focus{border-color:${T.acc}}
input::placeholder{color:${T.mut}}
.mb{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
@keyframes fi{from{opacity:0}to{opacity:1}}
.mb{animation:fi .2s ease}
@keyframes su{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.bu{background:${T.sur};border-radius:10px;padding:8px 12px;font-size:13px;line-height:1.5;animation:su .25s ease}
.vb{background:${T.bdr};border-radius:99px;height:5px;overflow:hidden}
.vf{height:100%;border-radius:99px;transition:width .7s cubic-bezier(.4,0,.2,1)}
.ts{position:fixed;bottom:24px;right:24px;z-index:300;background:${T.card};border:1px solid ${T.bdr};border-left:3px solid ${T.acc};border-radius:10px;padding:14px 18px;font-size:14px;max-width:300px;animation:su .3s ease}
.nt{background:transparent;border:none;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:${T.mut};padding:9px 15px;border-radius:8px;transition:all .15s}
.nt:hover{color:${T.txt};background:${T.card}}
.nt.on{color:${T.txt};background:${T.card};border-bottom:2px solid ${T.acc}}
.sb{background:linear-gradient(135deg,#08081A,#14102A);border-radius:12px;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:${T.sur}}
::-webkit-scrollbar-thumb{background:${T.bdr};border-radius:2px}
@media(max-width:680px){.hs{display:none!important}}
`;
function Toast({msg,onDone}){useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[]);return <div className="ts">✅ {msg}</div>;}
function Auth({onAuth}){
  const[mode,setMode]=useState("login");
  const[form,setForm]=useState({name:"",email:"",password:"",role:"viewer"});
  const[loading,setL]=useState(false);
  const[error,setE]=useState("");
  const[age,setAge]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  async function submit(){
    if(!form.email||!form.password){setE("Email and password required.");return;}
    if(mode==="signup"&&!age){setE("Please confirm you are 18 or older.");return;}
    setL(true);setE("");
    if(FBR){const r=mode==="signup"?await fbUp(form.email,form.password,form.name||form.email.split("@")[0],form.role):await fbIn(form.email,form.password);if(r?.error){setE(r.error);setL(false);return;}if(r){onAuth(r);return;}setE("Something went wrong.");setL(false);}
    else{onAuth({name:form.name||form.email.split("@")[0],email:form.email,role:form.role,voteCredits:3});}
  }
  async function gLogin(){
    if(mode==="signup"&&!age){setE("Please confirm your age first.");return;}
    setL(true);setE("");
    const r=await fbGoogle();
    if(r?.error){setE("Google sign-in failed.");setL(false);return;}
    if(r){onAuth(r);return;}
    setL(false);
  }
  return(
    <div className="mb">
      <div className="cd" style={{width:370,padding:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <Logo size={34}/>
          <div className="sy" style={{fontSize:28,color:T.wht}}>REALITY<span style={{color:T.acc}}>LIVE</span></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:16}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:FBR?T.grn:T.mut}}/>
          <span style={{fontSize:11,color:FBR?T.grn:T.mut,fontWeight:600}}>{FBR?"Live — accounts save permanently":"Demo mode"}</span>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[["login","Sign In"],["signup","Sign Up"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setE("");}} style={{flex:1,padding:"9px",borderRadius:8,border:`1px solid ${mode===m?T.acc:T.bdr}`,background:mode===m?T.acl:"transparent",color:mode===m?T.wht:T.mut,cursor:"pointer",fontFamily:"Space Grotesk",fontWeight:600,fontSize:13}}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button onClick={gLogin} disabled={loading} style={{width:"100%",padding:"11px",borderRadius:8,border:`1px solid ${T.bdr}`,background:T.sur,color:T.txt,cursor:"pointer",fontFamily:"Space Grotesk",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?0.7:1}}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:1,background:T.bdr}}/><span style={{fontSize:12,color:T.mut}}>or</span><div style={{flex:1,height:1,background:T.bdr}}/></div>
          {mode==="signup"&&<input placeholder="Your name" value={form.name} onChange={set("name")}/>}
          <input placeholder="Email" type="email" value={form.email} onChange={set("email")}/>
          <input placeholder="Password (min 6 chars)" type="password" value={form.password} onChange={set("password")}/>
          {mode==="signup"&&<select value={form.role} onChange={set("role")}><option value="viewer">👀 Viewer</option><option value="creator">🎬 Creator</option></select>}
          {mode==="signup"&&(
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"10px 12px",background:T.sur,borderRadius:8,border:`1px solid ${age?T.acc:T.bdr}`}}>
              <input type="checkbox" checked={age} onChange={e=>setAge(e.target.checked)} style={{width:16,height:16,marginTop:2,accentColor:T.acc,flexShrink:0}}/>
              <span style={{fontSize:12,color:T.mut,lineHeight:1.5}}>I confirm I am <strong style={{color:T.txt}}>18 or older</strong> and agree to the <span style={{color:T.acc}}>Terms of Service</span> and <span style={{color:T.acc}}>Privacy Policy</span></span>
            </label>
          )}
          {error&&<div style={{fontSize:12,color:"#ff6b6b",background:"rgba(255,107,107,0.1)",borderRadius:8,padding:"8px 12px"}}>⚠️ {error}</div>}
          <button className="bp" onClick={submit} disabled={loading} style={{padding:"13px",fontSize:15,borderRadius:8,opacity:loading?0.7:1}}>
            {loading?"Please wait...":mode==="login"?"Sign In →":"Create Account →"}
          </button>
        </div>
        <p style={{color:T.mut,fontSize:11,textAlign:"center",marginTop:16}}>Free to join · Talent from anywhere · Voted by everyone</p>
      </div>
    </div>
  );
}
function BuyVotes({user,onClose,onSuccess}){
  const{ready,pay}=usePS();
  const[sel,setSel]=useState(PACKS[0]);
  function go(){pay({email:user.email,amount:sel.amount,onSuccess:r=>{onSuccess(sel.votes,sel.label);onClose();},onClose});}
  return(
    <div className="mb">
      <div className="cd" style={{width:380,padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div className="sy" style={{fontSize:22,color:T.wht}}>BUY <span style={{color:T.acc}}>VOTES</span></div>
          <button className="bg" onClick={onClose} style={{padding:"5px 11px",fontSize:13}}>✕</button>
        </div>
        <p style={{color:T.mut,fontSize:13,marginBottom:20}}>Votes decide who wins. Back your favourite.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {PACKS.map(p=>(
            <div key={p.id} onClick={()=>setSel(p)} className="cd" style={{padding:"14px 16px",cursor:"pointer",borderColor:sel.id===p.id?T.acc:T.bdr,background:sel.id===p.id?T.acl:T.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:700,color:T.wht}}>{p.label}</div><div style={{fontSize:12,color:T.mut}}>{p.votes} votes</div></div>
              <div style={{fontWeight:700,color:T.acc,fontSize:18}}>{p.display}</div>
            </div>
          ))}
        </div>
        <div style={{background:T.sur,borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:T.mut}}>💳 Powered by <strong style={{color:T.txt}}>Paystack</strong> — card, bank transfer, USSD</div>
        <button className="bp" onClick={go} disabled={!ready} style={{width:"100%",padding:"13px",fontSize:15,borderRadius:8}}>{ready?`Pay ${sel.display} → Get ${sel.votes} Votes`:"Loading..."}</button>
      </div>
    </div>
  );
}
function ShowCard({show,onClick}){
  const max=show.contestants[show.votes.indexOf(Math.max(...show.votes))];
  return(
    <div className="cd" onClick={onClick} style={{cursor:"pointer",overflow:"hidden",transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{height:100,background:`linear-gradient(135deg,${show.color}22,${show.color}06)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,position:"relative"}}>
        {show.emoji}
        <div style={{position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:5,background:"rgba(0,0,0,.65)",padding:"3px 9px",borderRadius:99}}>
          <span className="ld"/><span style={{fontSize:11,color:"#fff",fontWeight:700}}>LIVE</span>
        </div>
        <div style={{position:"absolute",top:10,right:10,fontSize:12,color:T.mut}}>👁 {fmt(show.viewers)}</div>
      </div>
      <div style={{padding:"12px 14px"}}>
        <div className="sy" style={{fontSize:15,color:T.wht,lineHeight:1.2,marginBottom:3}}>{show.title}</div>
        <p style={{fontSize:12,color:T.mut,marginBottom:8}}>by {show.host}</p>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:T.mut}}>{show.contestants.length} competing</span>
          <span style={{fontSize:11,color:show.color,fontWeight:600}}>👑 {max} leads</span>
        </div>
      </div>
    </div>
  );
}
function ShowModal({show,user,onClose,onToast,onBuyVotes}){
  const[votes,setVotes]=useState([...show.votes]);
  const[voted,setVoted]=useState(null);
  const[chat,setChat]=useState([...CHAT]);
  const[msg,setMsg]=useState("");
  const[rep,setRep]=useState(false);
  const[repR,setRepR]=useState("");
  const[repDone,setRepDone]=useState(false);
  const total=votes.reduce((a,b)=>a+b,0);
  function vote(i){
    if(voted!==null)return;
    if((user.voteCredits||0)<1){onBuyVotes();return;}
    const nv=[...votes];nv[i]+=1;setVotes(nv);setVoted(i);
    user.voteCredits-=1;
    onToast(`Voted for ${show.contestants[i]}!`);
    if(user.uid)fbVote(user.uid,show.id,i).catch(console.error);
  }
  function send(){if(!msg.trim())return;setChat(p=>[{user:user.name,text:msg.trim()},...p]);setMsg("");}
  async function submitRep(){if(!repR)return;await fbReport(user.uid||"anon",show.id,repR).catch(console.error);setRepDone(true);setRep(false);onToast("Report submitted. Reviewed within 24hrs.");}
  return(
    <div className="mb">
      <div className="cd" style={{width:"min(740px,96vw)",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{show.emoji}</span>
            <div>
              <div className="sy" style={{fontSize:17,color:T.wht}}>{show.title}</div>
              <div style={{fontSize:12,color:T.mut}}>by {show.host} · 👁 {fmt(show.viewers)}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {!repDone&&<button onClick={()=>setRep(p=>!p)} style={{padding:"5px 10px",fontSize:11,borderRadius:7,background:"rgba(232,54,93,0.1)",border:"1px solid rgba(232,54,93,0.3)",color:T.acc,cursor:"pointer",fontFamily:"Space Grotesk",fontWeight:600}}>⚑ Report</button>}
            <button className="bg" onClick={onClose} style={{padding:"5px 11px",fontSize:13}}>✕</button>
          </div>
        </div>
        {rep&&(
          <div style={{padding:"12px 18px",background:"rgba(232,54,93,0.06)",borderBottom:`1px solid ${T.bdr}`,flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:600,color:T.txt,marginBottom:8}}>Why are you reporting?</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {["Nudity","Violence","Hate speech","Spam","Underage content","Other"].map(r=>(
                <button key={r} onClick={()=>setRepR(r)} style={{padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:600,border:`1px solid ${repR===r?T.acc:T.bdr}`,background:repR===r?T.acl:"transparent",color:repR===r?T.acc:T.mut,cursor:"pointer",fontFamily:"Space Grotesk"}}>{r}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={submitRep} disabled={!repR} style={{padding:"7px 14px",borderRadius:7,fontSize:12,fontWeight:700,background:T.acc,color:"#fff",border:"none",cursor:repR?"pointer":"default",opacity:repR?1:0.5,fontFamily:"Space Grotesk"}}>Submit</button>
              <button onClick={()=>setRep(false)} className="bg" style={{padding:"7px 12px",fontSize:12}}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{display:"flex",overflow:"hidden",flex:1}}>
          <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:14}}>
            <div className="sb" style={{height:160}}>
              <div style={{fontSize:34}}>{show.emoji}</div>
              <div style={{color:show.color,fontWeight:700,fontSize:13}}>LIVE STREAM · Agora WebRTC</div>
              <div style={{display:"flex",gap:6,alignItems:"center",background:"rgba(0,0,0,.6)",padding:"4px 10px",borderRadius:99,zIndex:1}}>
                <span className="ld"/><span style={{fontSize:12,color:"#fff"}}>{fmt(show.viewers)} watching</span>
              </div>
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:12,color:T.mut,fontWeight:600,letterSpacing:"0.07em"}}>🗳️ VOTE · {fmt(total)} total</div>
                <button onClick={onBuyVotes} style={{fontSize:11,color:T.acc,fontWeight:700,background:T.acl,border:`1px solid ${T.acc}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"Space Grotesk"}}>+ Buy Votes ({user.voteCredits||0} left)</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {show.contestants.map((name,i)=>{
                  const pct=Math.round((votes[i]/total)*100);
                  const lead=votes[i]===Math.max(...votes);
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                      <div className="av" style={{width:30,height:30,background:show.color+"33",color:show.color,fontSize:11}}>{name[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontSize:12,fontWeight:600,color:lead?T.wht:T.txt}}>{name} {lead&&"👑"}</span>
                          <span style={{fontSize:12,color:show.color,fontWeight:700}}>{pct}%</span>
                        </div>
                        <div className="vb"><div className="vf" style={{width:`${pct}%`,background:show.color}}/></div>
                      </div>
                      <button onClick={()=>vote(i)} disabled={voted!==null} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${voted===i?show.color:T.bdr}`,background:voted===i?show.color+"33":"transparent",color:voted===i?show.color:T.mut,cursor:voted===null?"pointer":"default",fontSize:11,fontWeight:700,fontFamily:"Space Grotesk",minWidth:48,transition:"all .15s"}}>{voted===i?"✓":"Vote"}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="hs" style={{width:200,borderLeft:`1px solid ${T.bdr}`,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"10px 12px",fontSize:11,color:T.mut,fontWeight:700,borderBottom:`1px solid ${T.bdr}`,letterSpacing:"0.08em"}}>💬 LIVE CHAT</div>
            <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:6}}>
              {chat.map((c,i)=><div key={i} className="bu"><span style={{color:show.color,fontWeight:700,fontSize:11}}>{c.user} </span><span style={{color:T.txt}}>{c.text}</span></div>)}
            </div>
            <div style={{padding:8,borderTop:`1px solid ${T.bdr}`,display:"flex",gap:6}}>
              <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Chat..." style={{fontSize:12,padding:"6px 9px"}}/>
              <button className="bp" onClick={send} style={{padding:"6px 9px",fontSize:12,borderRadius:6}}>↑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Leaderboard(){
  return(
    <div>
      <div className="sy" style={{fontSize:26,color:T.wht,marginBottom:4}}>THIS WEEK'S <span style={{color:"#FFD700"}}>TOP TALENTS</span></div>
      <p style={{color:T.mut,fontSize:13,marginBottom:20}}>Rankings reset every Sunday. The crowd decides everything.</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {LB.map(p=>(
          <div key={p.rank} className="cd" style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,borderColor:p.rank===1?"#FFD70066":T.bdr}}>
            <div style={{width:28,fontFamily:"Syne",fontWeight:800,fontSize:20,textAlign:"center",color:p.rank===1?"#FFD700":p.rank===2?"#C0C0C0":p.rank===3?"#CD7F32":T.mut}}>{p.rank}</div>
            <div className="av" style={{width:38,height:38,background:p.color+"33",color:p.color}}>{p.name[0]}</div>
            <div style={{flex:1}}><div style={{fontWeight:700,color:T.wht}}>{p.name}</div><div style={{fontSize:12,color:T.mut}}>{p.show}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:p.color,fontSize:16}}>{fmt(p.votes)}</div><div style={{fontSize:11,color:T.mut}}>votes</div></div>
            {p.rank===1&&<div style={{fontSize:18}}>🏆</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
function Legal(){
  const[t,setT]=useState("p");
  const P=[
    {h:"What we collect",b:"Name, email, role, vote history, and payment references. We never store card numbers — Paystack handles all card data."},
    {h:"How we use it",b:"To create your account, process votes, and send security emails. We never sell your data."},
    {h:"Who we share with",b:"Firebase (database), Agora (video), Paystack (payments), Vercel (hosting) — each under their own privacy policy."},
    {h:"Your rights",b:"Email support@realitylive.app to access, correct, or delete your data. We respond within 30 days."},
    {h:"Security",b:"Passwords are encrypted by Firebase. Firestore rules ensure only you access your account."},
    {h:"Age requirement",b:"RealityLive is strictly 18+. We delete accounts belonging to minors immediately on notification."},
    {h:"Compliance",b:"NDPR 2019 (Nigeria), GDPR (EU), CCPA (California) where applicable."},
    {h:"Contact",b:"privacy@realitylive.app"},
  ];
  const TR=[
    {h:"Eligibility",b:"You must be 18+ to use RealityLive. By signing up you confirm this."},
    {h:"Prohibited content",b:"Nudity · Violence · Hate speech · Harassment · Content involving minors · Illegal activities · Copyrighted content without permission."},
    {h:"Votes & payments",b:"Vote credits have no cash value. Refunds on unused credits within 24hrs of purchase only."},
    {h:"Our rights",b:"We may remove content, suspend accounts, or end streams that violate these Terms at any time."},
    {h:"Governing law",b:"Federal Republic of Nigeria. Disputes subject to Nigerian courts."},
    {h:"Contact",b:"support@realitylive.app"},
  ];
  const items=t==="p"?P:TR;
  return(
    <div>
      <div className="sy" style={{fontSize:26,color:T.wht,marginBottom:4}}>LEGAL <span style={{color:T.acc}}>DOCUMENTS</span></div>
      <p style={{color:T.mut,fontSize:14,marginBottom:20}}>Required before going public.</p>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[["p","🔒 Privacy Policy"],["t","📋 Terms of Service"]].map(([k,l])=>(
          <button key={k} onClick={()=>setT(k)} style={{padding:"9px 16px",borderRadius:8,fontFamily:"Space Grotesk",fontWeight:600,fontSize:13,border:`1px solid ${t===k?T.acc:T.bdr}`,background:t===k?T.acl:"transparent",color:t===k?T.wht:T.mut,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {items.map((item,i)=>(
          <div key={i} className="cd" style={{padding:"14px 16px"}}>
            <div style={{fontWeight:700,color:T.wht,marginBottom:5,fontSize:13}}>{item.h}</div>
            <div style={{fontSize:13,color:T.mut,lineHeight:1.7}}>{item.b}</div>
          </div>
        ))}
      </div>
      <div className="cd" style={{padding:16,marginTop:14,borderColor:T.acc+"44"}}>
        <div style={{fontWeight:700,color:T.wht,marginBottom:8}}>📧 Contact</div>
        <div style={{fontSize:13,color:T.mut,lineHeight:2}}>General: <strong style={{color:T.txt}}>support@realitylive.app</strong><br/>Privacy: <strong style={{color:T.txt}}>privacy@realitylive.app</strong></div>
      </div>
    </div>
  );
}
function Profile({user,onLogout,onBuyVotes}){
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:22}}>
        <div className="av" style={{width:64,height:64,background:T.acc+"33",color:T.acc,fontSize:24}}>{user.name[0].toUpperCase()}</div>
        <div>
          <div className="sy" style={{fontSize:24,color:T.wht}}>{user.name}</div>
          <div style={{fontSize:13,color:T.mut}}>{user.email} · {user.role==="creator"?"🎬 Creator":"👀 Viewer"}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        {[["Shows Watched","7"],["Votes Cast","23"],["Vote Credits",user.voteCredits||0]].map(([l,v])=>(
          <div key={l} className="cd" style={{padding:14,textAlign:"center"}}>
            <div className="sy" style={{fontSize:28,color:T.wht}}>{v}</div>
            <div style={{fontSize:11,color:T.mut}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="cd" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:600,color:T.mut,fontSize:12,marginBottom:10,letterSpacing:"0.07em"}}>VOTE CREDITS</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,color:T.wht,fontSize:18}}>{user.voteCredits||0} votes remaining</div>
            <div style={{fontSize:12,color:T.mut,marginTop:2}}>Used to vote for contestants in live shows</div>
          </div>
          <button className="bp" onClick={onBuyVotes} style={{padding:"9px 16px",fontSize:13,borderRadius:8}}>Buy More</button>
        </div>
      </div>
      <button className="bg" onClick={onLogout} style={{padding:"9px 16px",fontSize:13}}>Sign Out</button>
    </div>
  );
}
export default function App(){
  const[user,setUser]=useState(null);
  const[tab,setTab]=useState("shows");
  const[activeShow,setActiveShow]=useState(null);
  const[buyVotes,setBuyVotes]=useState(false);
  const[toast,setToast]=useState(null);
  const[search,setSearch]=useState("");
  const notify=msg=>setToast(msg);
  const filtered=SHOWS.filter(s=>s.title.toLowerCase().includes(search.toLowerCase()));
  function handleVotePurchase(credits,label){
    if(!user)return;
    setUser(p=>({...p,voteCredits:(p.voteCredits||0)+credits}));
    notify(`${label} unlocked! +${credits} votes added.`);
    if(user.uid)fbAddV(user.uid,credits).catch(console.error);
  }
  return(
    <>
      <style>{CSS}</style>
      {!user&&<Auth onAuth={u=>setUser({...u,voteCredits:u.voteCredits??3})}/>}
      {buyVotes&&user&&<BuyVotes user={user} onClose={()=>setBuyVotes(false)} onSuccess={handleVotePurchase}/>}
      {activeShow&&user&&<ShowModal show={activeShow} user={user} onClose={()=>setActiveShow(null)} onToast={notify} onBuyVotes={()=>{setActiveShow(null);setBuyVotes(true);}}/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        <div style={{background:T.acc,padding:"5px 0",overflow:"hidden"}}>
          <div className="tk" style={{fontSize:12,fontWeight:700,color:"#000",letterSpacing:"0.06em"}}>
            🔴 LIVE NOW: Vocal Powerhouse · Street Comedy · Dance Explosion · Hustle Nation &nbsp;&nbsp;&nbsp; 🔴 LIVE NOW: Vocal Powerhouse · Street Comedy · Dance Explosion · Hustle Nation &nbsp;&nbsp;&nbsp;
          </div>
        </div>
        <nav style={{background:T.sur,borderBottom:`1px solid ${T.bdr}`,padding:"0 20px",display:"flex",alignItems:"center",gap:10,height:54,position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:6}}>
            <Logo size={26}/>
            <div className="sy" style={{fontSize:18,color:T.wht}}>REALITY<span style={{color:T.acc}}>LIVE</span></div>
          </div>
          <div style={{display:"flex",gap:2}}>
            {[["shows","📺 Shows"],["leaderboard","🏆 Leaders"],["legal","📄 Legal"],["profile","👤 Profile"]].map(([k,l])=>(
              <button key={k} className={`nt ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
          <div style={{flex:1}}/>
          <input placeholder="Search..." value={search} onChange={e=>{setSearch(e.target.value);setTab("shows");}} style={{width:150,padding:"6px 10px",fontSize:13}} className="hs"/>
          <button className="bp" onClick={()=>setBuyVotes(true)} style={{padding:"7px 14px",fontSize:12,borderRadius:7,display:"flex",alignItems:"center",gap:5}}>
            🗳️ {user?.voteCredits||0} votes
          </button>
          {user?.role==="creator"&&(
            <button style={{padding:"7px 14px",fontSize:12,borderRadius:7,background:"rgba(232,54,93,0.15)",border:`1px solid ${T.acc}`,color:T.acc,cursor:"pointer",fontFamily:"Space Grotesk",fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
              <span className="ld" style={{width:6,height:6}}/> Go Live
            </button>
          )}
          {user&&<div className="av" style={{width:30,height:30,background:T.acc+"33",color:T.acc,cursor:"pointer",fontSize:12}} onClick={()=>setTab("profile")}>{user.name[0].toUpperCase()}</div>}
        </nav>
        {tab==="shows"&&(
          <div style={{background:`linear-gradient(135deg,${T.sur},${T.bg})`,borderBottom:`1px solid ${T.bdr}`,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div className="sy" style={{fontSize:28,color:T.wht,lineHeight:1}}>{fmt(SHOWS.reduce((a,s)=>a+s.viewers,0))} <span style={{color:T.acc}}>LIVE VIEWERS</span></div>
              <p style={{color:T.mut,fontSize:13,marginTop:4}}>{SHOWS.length} talent shows live now · Fan voting open</p>
            </div>
            <div style={{display:"flex",gap:18}} className="hs">
              {[["🎤","Talent","Shows"],["🗳️","24K+","Votes Today"],["🏆","5","Weekly Winners"]].map(([e,v,l])=>(
                <div key={l} style={{textAlign:"center"}}><div style={{fontSize:16}}>{e}</div><div className="sy" style={{fontSize:18,color:T.wht}}>{v}</div><div style={{fontSize:10,color:T.mut}}>{l}</div></div>
              ))}
            </div>
          </div>
        )}
        <main style={{flex:1,padding:20,maxWidth:1040,width:"100%",margin:"0 auto"}}>
          {tab==="shows"&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div className="sy" style={{fontSize:18,color:T.wht}}>{search?`"${search}"`:""} LIVE NOW</div>
                <button onClick={()=>setBuyVotes(true)} style={{fontSize:12,color:T.acc,background:T.acl,border:`1px solid ${T.acc}44`,borderRadius:7,padding:"7px 12px",cursor:"pointer",fontFamily:"Space Grotesk",fontWeight:700}}>🗳️ Buy Votes</button>
              </div>
              {filtered.length===0?<div style={{textAlign:"center",padding:"60px 0",color:T.mut}}><div style={{fontSize:36,marginBottom:12}}>📭</div><p>No shows match "{search}"</p></div>
              :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
                {filtered.map(s=><ShowCard key={s.id} show={s} onClick={()=>setActiveShow(s)}/>)}
              </div>}
            </>
          )}
          {tab==="leaderboard"&&<Leaderboard/>}
          {tab==="legal"&&<Legal/>}
          {tab==="profile"&&user&&<Profile user={user} onLogout={()=>{setUser(null);setTab("shows");}} onBuyVotes={()=>setBuyVotes(true)}/>}
        </main>
        <footer style={{borderTop:`1px solid ${T.bdr}`,padding:"12px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Logo size={18}/>
            <div className="sy" style={{fontSize:13,color:T.mut}}>REALITY<span style={{color:T.acc}}>LIVE</span></div>
          </div>
          <p style={{fontSize:11,color:T.mut}}>Agora · Paystack · Firebase · Vercel</p>
        </footer>
      </div>
    </>
  );
}
