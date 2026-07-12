import{useState,useEffect,useRef,useCallback}from"react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG={apiKey:"AIzaSyDvOfC3ggo204_urbjarcKDnHIMKNqPJxU",authDomain:"realitylive-c9e27.firebaseapp.com",projectId:"realitylive-c9e27",storageBucket:"realitylive-c9e27.firebasestorage.app",messagingSenderId:"476273854407",appId:"1:476273854407:web:49dd27e1d288009497bbe2"};
const AGORA_APP_ID="eb6533f773124b6ab8e7b782bc718c84";
const PAYSTACK_PK="pk_live_2cdbfd0a3340c67656ca92204f4c78901fed0a19";
const FB_READY=FIREBASE_CONFIG.apiKey!=="YOUR";

// ─── DESIGN TOKENS — Ash / Dark grey system ───────────────────────────────────
const C={
  bg:"#141414",         // deepest dark ash
  sur:"#1C1C1C",        // surface
  card:"#222222",       // card
  cardHov:"#2A2A2A",    // card hover
  bdr:"#333333",        // border
  bdrLight:"#444444",   // light border
  acc:"#E0E0E0",        // light ash — primary accent
  accActive:"#FFFFFF",  // pure white — active/pressed
  accLo:"rgba(255,255,255,0.06)",
  accMd:"rgba(255,255,255,0.12)",
  live:"#FF3B3B",       // red only for LIVE indicator
  txt:"#D4D4D4",        // primary text
  txtSub:"#8A8A8A",     // secondary text
  mut:"#555555",        // muted
  wht:"#FFFFFF",
  grn:"#4CAF50",
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const CATS=[
  {id:"all",label:"All",icon:"◈"},
  {id:"talent",label:"Talent",icon:"🎤"},
  {id:"education",label:"Education",icon:"📚"},
  {id:"business",label:"Business",icon:"💼"},
  {id:"debate",label:"Debate",icon:"⚖️"},
  {id:"music",label:"Music",icon:"🎵"},
  {id:"gaming",label:"Gaming",icon:"🎮"},
  {id:"comedy",label:"Comedy",icon:"😂"},
  {id:"sports",label:"Sports",icon:"⚡"},
];

// ─── VOTE PACKS ───────────────────────────────────────────────────────────────
const VOTE_PACKS=[
  {id:"s",label:"Starter",votes:10,amount:500,display:"$5"},
  {id:"p",label:"Pro Fan",votes:50,amount:2000,display:"$20"},
  {id:"l",label:"Legend",votes:150,amount:5000,display:"$50"},
];

// ─── FIREBASE ────────────────────────────────────────────────────────────────
let _db=null,_auth=null,_fbl=false;
async function loadFB(){
  if(_fbl)return{db:_db,auth:_auth};
  if(!FB_READY)return{db:null,auth:null};
  try{
    const[a,f,au]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"),
    ]);
    const app=a.initializeApp(FIREBASE_CONFIG);
    _db={fs:f.getFirestore(app),doc:f.doc,setDoc:f.setDoc,getDoc:f.getDoc,updateDoc:f.updateDoc,addDoc:f.addDoc,collection:f.collection,onSnapshot:f.onSnapshot,query:f.query,orderBy:f.orderBy,limit:f.limit,inc:f.increment,serverTimestamp:f.serverTimestamp};
    _auth={a:au.getAuth(app),create:au.createUserWithEmailAndPassword,sign:au.signInWithEmailAndPassword,out:au.signOut,GP:au.GoogleAuthProvider,popup:au.signInWithPopup};
    _fbl=true;return{db:_db,auth:_auth};
  }catch(e){console.error(e);return{db:null,auth:null};}
}
async function fbSignUp(email,pw,name,role){
  const{auth,db}=await loadFB();if(!auth)return null;
  try{
    const c=await auth.create(auth.a,email,pw);
    const uid=c.user.uid;
    const p={name,email,role,voteCredits:5,createdAt:Date.now()};
    if(db)await db.setDoc(db.doc(db.fs,"users",uid),p);
    return{uid,...p};
  }catch(e){return{error:e.message};}
}
async function fbSignIn(email,pw){
  const{auth,db}=await loadFB();if(!auth)return null;
  try{
    const c=await auth.sign(auth.a,email,pw);
    const uid=c.user.uid;
    if(db){const s=await db.getDoc(db.doc(db.fs,"users",uid));if(s.exists())return{uid,...s.data()};}
    return{uid,name:email.split("@")[0],email,role:"viewer",voteCredits:5};
  }catch(e){return{error:e.message};}
}
async function fbGoogle(){
  const{auth,db}=await loadFB();
  if(!auth)return{error:"Firebase not ready"};
  try{
    const p=new auth.GP();
    p.addScope("email");
    p.setCustomParameters({prompt:"select_account"});
    const c=await auth.popup(auth.a,p);
    const uid=c.user.uid;
    const name=c.user.displayName||c.user.email.split("@")[0];
    const email=c.user.email;
    if(db){
      const s=await db.getDoc(db.doc(db.fs,"users",uid));
      if(s.exists())return{uid,...s.data()};
      const pr={name,email,role:"viewer",voteCredits:5,createdAt:Date.now()};
      await db.setDoc(db.doc(db.fs,"users",uid),pr);
      return{uid,...pr};
    }
    return{uid,name,email,role:"viewer",voteCredits:5};
  }catch(e){
    if(e.code==="auth/popup-blocked")return{error:"Popup blocked. Please allow popups for this site in your browser settings."};
    if(e.code==="auth/unauthorized-domain")return{error:"Domain not authorized. Add your site URL to Firebase Authentication → Settings → Authorized domains."};
    if(e.code==="auth/cancelled-popup-request")return{error:""};
    return{error:e.message};
  }
}
async function fbCreateRoom(uid,data){
  const{db}=await loadFB();if(!db)return null;
  const ref=await db.addDoc(db.collection(db.fs,"rooms"),{...data,hostId:uid,viewers:0,isLive:true,createdAt:db.serverTimestamp()});
  return ref.id;
}
async function fbGetRooms(cb){
  const{db}=await loadFB();if(!db){cb([]);return()=>{};}
  const q=db.query(db.collection(db.fs,"rooms"),db.orderBy("createdAt","desc"),db.limit(30));
  return db.onSnapshot(q,snap=>cb(snap.docs.map(d=>({id:d.id,...d.data()}))));
}
async function fbAddVotes(uid,n){
  const{db}=await loadFB();if(!db||!uid)return;
  await db.updateDoc(db.doc(db.fs,"users",uid),{voteCredits:db.inc(n)});
}
async function fbReport(uid,roomId,reason){
  const{db}=await loadFB();if(!db)return;
  await db.addDoc(db.collection(db.fs,"reports"),{uid,roomId,reason,ts:Date.now(),reviewed:false});
}


async function fbGetRoom(roomId,cb){
  const{db}=await loadFB();if(!db){cb(null);return()=>{};}
  return db.onSnapshot(db.doc(db.fs,"rooms",roomId),snap=>cb(snap.exists()?{id:snap.id,...snap.data()}:null));
}
async function fbGetChat(roomId,cb){
  const{db}=await loadFB();if(!db){cb([]);return()=>{};}
  const q=db.query(db.collection(db.fs,"rooms",roomId,"chat"),db.orderBy("ts","asc"),db.limit(100));
  return db.onSnapshot(q,snap=>cb(snap.docs.map(d=>({id:d.id,...d.data()}))));
}
async function fbSendChat(roomId,uid,name,text){
  const{db}=await loadFB();if(!db)return;
  await db.addDoc(db.collection(db.fs,"rooms",roomId,"chat"),{uid,name,text,ts:Date.now()});
}
async function fbCastVote(uid,roomId,contestantId){
  const{db}=await loadFB();if(!db||!uid)return{error:"No auth"};
  const voteRef=db.doc(db.fs,"votes",uid+"_"+roomId);
  const existing=await db.getDoc(voteRef);
  if(existing.exists())return{error:"Already voted"};
  await db.setDoc(voteRef,{uid,roomId,contestantId,ts:Date.now()});
  await db.updateDoc(db.doc(db.fs,"users",uid),{voteCredits:db.inc(-1)});
  const roomRef=db.doc(db.fs,"rooms",roomId);
  await db.updateDoc(roomRef,{["votes."+contestantId]:db.inc(1)});
  return{success:true};
}
async function fbUpdateViewers(roomId,delta){
  const{db}=await loadFB();if(!db)return;
  await db.updateDoc(db.doc(db.fs,"rooms",roomId),{viewers:db.inc(delta)}).catch(()=>{});
}
async function fbEndRoom(roomId){
  const{db}=await loadFB();if(!db)return;
  await db.updateDoc(db.doc(db.fs,"rooms",roomId),{isLive:false,endedAt:Date.now()});
}
async function fbAddContestant(roomId,name){
  const{db}=await loadFB();if(!db)return;
  const id="c_"+Date.now();
  const roomRef=db.doc(db.fs,"rooms",roomId);
  const snap=await db.getDoc(roomRef);
  const existing=snap.data()?.contestants||[];
  await db.updateDoc(roomRef,{contestants:[...existing,{id,name,votes:0}]});
}

// ─── AGORA HOOK ───────────────────────────────────────────────────────────────
function useAgora(){
  const clientRef=useRef(null);
  const[status,setStatus]=useState("idle");
  const[viewers,setViewers]=useState(0);
  const localTracksRef=useRef({audio:null,video:null});

  useEffect(()=>{
    if(!window.AgoraRTC){
      const s=document.createElement("script");
      s.src="https://download.agora.io/sdk/release/AgoraRTC_N.js";
      s.async=true;
      document.head.appendChild(s);
    }
  },[]);

  async function joinAsHost(channel){
    if(!window.AgoraRTC||AGORA_APP_ID==="YOUR_AGORA_APP_ID"){setStatus("demo");return;}
    try{
      setStatus("joining");
      const client=window.AgoraRTC.createClient({mode:"live",codec:"vp8"});
      await client.setClientRole("host");
      await client.join(AGORA_APP_ID,channel,null,null);
      const[audioTrack,videoTrack]=await window.AgoraRTC.createMicrophoneAndCameraTracks();
      await client.publish([audioTrack,videoTrack]);
      videoTrack.play("agora-local");
      localTracksRef.current={audio:audioTrack,video:videoTrack};
      clientRef.current=client;
      client.on("user-joined",()=>setViewers(v=>v+1));
      client.on("user-left",()=>setViewers(v=>Math.max(0,v-1)));
      setStatus("live");
    }catch(e){console.error("Agora host error:",e);setStatus("error");}
  }

  async function joinAsViewer(channel){
    if(!window.AgoraRTC||AGORA_APP_ID==="YOUR_AGORA_APP_ID"){setStatus("demo");return;}
    try{
      setStatus("joining");
      const client=window.AgoraRTC.createClient({mode:"live",codec:"vp8"});
      await client.setClientRole("audience");
      await client.join(AGORA_APP_ID,channel,null,null);
      client.on("user-published",async(user,mediaType)=>{
        await client.subscribe(user,mediaType);
        if(mediaType==="video")user.videoTrack.play("agora-remote");
        if(mediaType==="audio")user.audioTrack.play();
      });
      clientRef.current=client;
      setStatus("watching");
    }catch(e){console.error("Agora viewer error:",e);setStatus("error");}
  }

  async function leave(){
    const{audio,video}=localTracksRef.current;
    audio?.close();video?.close();
    await clientRef.current?.leave().catch(()=>{});
    clientRef.current=null;
    localTracksRef.current={audio:null,video:null};
    setStatus("idle");
  }

  return{status,viewers,joinAsHost,joinAsViewer,leave};
}

// ─── PAYSTACK ────────────────────────────────────────────────────────────────
function usePaystack(){
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    if(window.PaystackPop){setReady(true);return;}
    const s=document.createElement("script");
    s.src="https://js.paystack.co/v1/inline.js";
    s.onload=()=>setReady(true);
    document.head.appendChild(s);
  },[]);
  const pay=useCallback(({email,amount,onSuccess,onClose})=>{
    if(!window.PaystackPop)return;
    const h=window.PaystackPop.setup({key:PAYSTACK_PK,email,amount:amount*100,currency:"USD",ref:"RL_"+Date.now(),callback:onSuccess,onClose});
    h.openIframe();
  },[]);
  return{ready,pay};
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:${C.bg};color:${C.txt};font-family:'DM Sans',sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:${C.sur}}
::-webkit-scrollbar-thumb{background:${C.bdr};border-radius:2px}
.mono{font-family:'DM Mono',monospace}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp .35s ease forwards}

@keyframes liveblink{0%,100%{opacity:1}50%{opacity:0.3}}
.live-blink{animation:liveblink 1.2s ease-in-out infinite}

/* Cards */
.rl-card{background:${C.card};border:1px solid ${C.bdr};border-radius:12px;transition:all .2s}
.rl-card:hover{background:${C.cardHov};border-color:${C.bdrLight}}
.rl-card-active{background:${C.cardHov};border-color:${C.accActive}}

/* Buttons */
.btn-white{background:${C.wht};color:#111;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;transition:all .15s}
.btn-white:hover{background:#E8E8E8;transform:translateY(-1px)}
.btn-white:active{transform:translateY(0)}
.btn-outline{background:transparent;color:${C.acc};border:1px solid ${C.bdrLight};border-radius:8px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:all .15s}
.btn-outline:hover{border-color:${C.acc};background:${C.accLo}}
.btn-ghost{background:transparent;color:${C.mut};border:1px solid ${C.bdr};border-radius:8px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:all .15s}
.btn-ghost:hover{color:${C.txt};border-color:${C.mut}}

/* Inputs */
input,textarea,select{background:${C.sur};border:1px solid ${C.bdr};border-radius:8px;color:${C.wht};font-family:'DM Sans',sans-serif;font-size:14px;padding:12px 16px;outline:none;transition:all .15s;width:100%}
input:focus,textarea:focus,select:focus{border-color:${C.acc};background:${C.card}}
input::placeholder,textarea::placeholder{color:${C.mut}}

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.92);backdrop-filter:blur(10px);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeUp .2s ease}

/* Nav */
.nav-item{background:transparent;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:${C.mut};padding:7px 14px;border-radius:7px;transition:all .15s}
.nav-item:hover{color:${C.txt};background:${C.card}}
.nav-item.on{color:${C.wht};background:${C.card};border:1px solid ${C.bdr}}

/* Category pill */
.cat{padding:6px 14px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;border:1px solid ${C.bdr};background:transparent;color:${C.mut};font-family:'DM Sans',sans-serif}
.cat:hover{color:${C.txt};border-color:${C.bdrLight}}
.cat.on{color:${C.wht};background:${C.card};border-color:${C.bdrLight}}

/* Toast */
.toast{position:fixed;bottom:20px;right:20px;z-index:300;background:${C.card};border:1px solid ${C.bdrLight};border-radius:10px;padding:13px 18px;font-size:13px;max-width:300px;animation:fadeUp .3s ease;box-shadow:0 8px 32px rgba(0,0,0,.6)}

/* Vote bar */
.vbar{background:${C.bdr};border-radius:99px;height:4px;overflow:hidden}
.vfill{height:100%;border-radius:99px;background:${C.acc};transition:width .7s ease}

/* Avatar */
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0}

/* Stream bg */
.strm{background:${C.sur};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;position:relative;overflow:hidden}

/* Divider */
.div{height:1px;background:${C.bdr};margin:16px 0}

@media(max-width:680px){.hs{display:none!important}}
`;

// ─── CAMERA PAUSE LOGO ────────────────────────────────────────────────────────
function Logo({size=36,showText=true}){
  const s=size;
  const camW=s*1.3;
  const camH=s*0.85;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <svg width={camW} height={camH} viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Camera body */}
        <rect x="1" y="7" width="36" height="26" rx="4" fill={C.card} stroke={C.acc} strokeWidth="1.5"/>
        {/* Camera lens ring */}
        <circle cx="19" cy="20" r="9" fill={C.sur} stroke={C.acc} strokeWidth="1.5"/>
        {/* Lens inner */}
        <circle cx="19" cy="20" r="5.5" fill={C.bg} stroke={C.bdrLight} strokeWidth="1"/>
        {/* Camera viewfinder bump */}
        <rect x="14" y="1" width="10" height="6" rx="2" fill={C.card} stroke={C.acc} strokeWidth="1.5"/>
        {/* Camera lens dot */}
        <circle cx="19" cy="20" r="2" fill={C.bdrLight}/>
        {/* Pause symbol — two vertical bars centered in lens */}
        <rect x="16" y="17" width="2.5" height="6" rx="1" fill={C.acc}/>
        <rect x="20" y="17" width="2.5" height="6" rx="1" fill={C.acc}/>
        {/* Viewfinder triangle — camera pointing right */}
        <path d="M39 14 L39 26 L51 20 Z" fill={C.card} stroke={C.acc} strokeWidth="1.5" strokeLinejoin="round"/>
        {/* Small light indicator top right of body */}
        <circle cx="33" cy="11" r="2" fill={C.live} opacity="0.9"/>
      </svg>
      {showText&&(
        <div style={{fontFamily:"DM Sans",fontWeight:700,fontSize:size*0.55,letterSpacing:"0.06em",color:C.wht}}>
          Reality<span style={{color:C.acc,fontWeight:300}}>Live</span>
        </div>
      )}
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3200);return()=>clearTimeout(t);},[]);
  return <div className="toast">{msg}</div>;
}

// ─── AUTH SCREEN — First thing users see ─────────────────────────────────────
function AuthScreen({onAuth}){
  const[mode,setMode]=useState("login");
  const[form,setForm]=useState({name:"",email:"",password:"",role:"viewer"});
  const[loading,setL]=useState(false);
  const[error,setE]=useState("");
  const[age,setAge]=useState(false);
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  async function submit(){
    if(!form.email||!form.password){setE("Email and password are required.");return;}
    if(mode==="signup"&&!age){setE("You must confirm you are 18 or older.");return;}
    setL(true);setE("");
    if(FB_READY){
      const r=mode==="signup"
        ?await fbSignUp(form.email,form.password,form.name||form.email.split("@")[0],form.role)
        :await fbSignIn(form.email,form.password);
      if(r?.error){
        setE(r.error.includes("auth/")?r.error.split("auth/")[1].replace(")","").replace(/-/g," "):r.error);
        setL(false);return;
      }
      if(r){onAuth(r);return;}
      setE("Something went wrong. Try again.");setL(false);
    }else{
      onAuth({name:form.name||form.email.split("@")[0],email:form.email,role:form.role,voteCredits:5});
    }
  }

  async function googleAuth(){
    if(mode==="signup"&&!age){setE("Please confirm your age first.");return;}
    setL(true);setE("");
    const r=await fbGoogle();
    if(r?.error&&r.error!==""){setE(r.error);setL(false);return;}
    if(r&&!r.error){onAuth(r);return;}
    setL(false);
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      {/* Logo centered */}
      <div style={{marginBottom:40,animation:"fadeUp .4s ease"}}>
        <Logo size={40}/>
      </div>

      {/* Auth card */}
      <div className="rl-card fade-up" style={{width:"min(400px,100%)",padding:"32px 28px"}}>
        {/* Mode tabs */}
        <div style={{display:"flex",gap:0,marginBottom:28,background:C.sur,borderRadius:8,padding:3}}>
          {[["login","Sign In"],["signup","Sign Up"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setE("");setAge(false);}} style={{
              flex:1,padding:"10px",borderRadius:7,border:"none",
              background:mode===m?C.card:"transparent",
              color:mode===m?C.wht:C.mut,
              cursor:"pointer",fontFamily:"DM Sans",fontWeight:600,fontSize:14,
              transition:"all .15s"
            }}>{l}</button>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Google sign in */}
          <button onClick={googleAuth} disabled={loading} style={{
            width:"100%",padding:"12px",borderRadius:8,
            border:`1px solid ${C.bdrLight}`,background:C.sur,
            color:C.wht,cursor:"pointer",fontFamily:"DM Sans",
            fontWeight:500,fontSize:14,display:"flex",alignItems:"center",
            justifyContent:"center",gap:10,transition:"all .15s",
            opacity:loading?0.6:1
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:1,background:C.bdr}}/>
            <span style={{fontSize:12,color:C.mut}}>or</span>
            <div style={{flex:1,height:1,background:C.bdr}}/>
          </div>

          {mode==="signup"&&<input placeholder="Display name" value={form.name} onChange={set("name")}/>}
          <input placeholder="Email address" type="email" value={form.email} onChange={set("email")}/>
          <input placeholder="Password" type="password" value={form.password} onChange={set("password")}/>

          {mode==="signup"&&(
            <select value={form.role} onChange={set("role")}>
              <option value="viewer">I want to watch and vote</option>
              <option value="creator">I want to host live rooms</option>
            </select>
          )}

          {mode==="signup"&&(
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"11px 13px",background:C.sur,borderRadius:8,border:`1px solid ${age?C.bdrLight:C.bdr}`}}>
              <input type="checkbox" checked={age} onChange={e=>setAge(e.target.checked)} style={{width:15,height:15,marginTop:2,flexShrink:0,accentColor:C.wht}}/>
              <span style={{fontSize:12,color:C.mut,lineHeight:1.6}}>
                I confirm I am <strong style={{color:C.txt}}>18 or older</strong> and agree to the <span style={{color:C.txt,textDecoration:"underline",cursor:"pointer"}}>Terms of Service</span> and <span style={{color:C.txt,textDecoration:"underline",cursor:"pointer"}}>Privacy Policy</span>
              </span>
            </label>
          )}

          {error&&(
            <div style={{fontSize:13,color:"#FF6B6B",background:"rgba(255,107,107,0.07)",borderRadius:8,padding:"10px 13px",border:"1px solid rgba(255,107,107,0.15)"}}>
              {error}
            </div>
          )}

          <button className="btn-white" onClick={submit} disabled={loading} style={{padding:"13px",fontSize:15,borderRadius:8,marginTop:4,opacity:loading?0.7:1}}>
            {loading?"Please wait...":mode==="login"?"Sign In":"Create Account"}
          </button>
        </div>

        {!FB_READY&&(
          <div style={{marginTop:16,padding:"10px 13px",background:C.sur,borderRadius:8,border:`1px solid ${C.bdr}`}}>
            <p style={{fontSize:11,color:C.mut,lineHeight:1.6}}>
              ⚠ Firebase not configured — running in demo mode. Accounts will not save.
            </p>
          </div>
        )}
      </div>

      <p style={{fontSize:12,color:C.mut,marginTop:20,textAlign:"center",lineHeight:1.8}}>
        Free to join · Available worldwide<br/>
        Your data is encrypted and protected
      </p>
    </div>
  );
}

// ─── CREATE ROOM MODAL ────────────────────────────────────────────────────────
function CreateRoom({user,onClose,onToast}){
  const[title,setTitle]=useState("");
  const[cat,setCat]=useState("talent");
  const[desc,setDesc]=useState("");
  const[loading,setL]=useState(false);

  async function create(){
    if(!title.trim())return;
    setL(true);
    const data={title:title.trim(),category:cat,description:desc.trim(),hostName:user.name,isLive:true,viewers:0};
    if(FB_READY&&user.uid){
      const id=await fbCreateRoom(user.uid,data);
      if(id){onToast("You are live — viewers can join your room now.");onClose();return;}
    }
    onToast("Room created. Connect Firebase to make it visible to all users.");
    onClose();
  }

  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rl-card" style={{width:"min(460px,95vw)",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontWeight:700,fontSize:18,color:C.wht}}>Create a Room</div>
          <button className="btn-ghost" onClick={onClose} style={{padding:"5px 11px",fontSize:13}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:C.mut,fontWeight:600,display:"block",marginBottom:6,letterSpacing:"0.1em"}}>ROOM TITLE</label>
            <input placeholder="What is your room about?" value={title} onChange={e=>setTitle(e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.mut,fontWeight:600,display:"block",marginBottom:8,letterSpacing:"0.1em"}}>CATEGORY</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {CATS.filter(c=>c.id!=="all").map(c=>(
                <button key={c.id} onClick={()=>setCat(c.id)} className={`cat ${cat===c.id?"on":""}`}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{fontSize:11,color:C.mut,fontWeight:600,display:"block",marginBottom:6,letterSpacing:"0.1em"}}>DESCRIPTION (OPTIONAL)</label>
            <textarea placeholder="Tell viewers what to expect..." value={desc} onChange={e=>setDesc(e.target.value)} style={{height:72,resize:"none"}}/>
          </div>
          <button className="btn-white" onClick={create} disabled={loading||!title.trim()} style={{padding:"13px",fontSize:15,borderRadius:8,opacity:!title.trim()?0.5:1}}>
            {loading?"Starting...":"Go Live"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BUY VOTES MODAL ──────────────────────────────────────────────────────────
function BuyVotes({user,onClose,onSuccess}){
  const{ready,pay}=usePaystack();
  const[sel,setSel]=useState(VOTE_PACKS[0]);
  function go(){pay({email:user.email,amount:sel.amount,onSuccess:r=>{onSuccess(sel.votes,sel.label);onClose();},onClose});}
  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rl-card" style={{width:"min(380px,95vw)",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:18,color:C.wht}}>Vote Packs</div>
          <button className="btn-ghost" onClick={onClose} style={{padding:"5px 11px",fontSize:13}}>✕</button>
        </div>
        <p style={{color:C.mut,fontSize:13,marginBottom:18,lineHeight:1.6}}>Use votes to support contestants in live rooms. Votes decide who wins.</p>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
          {VOTE_PACKS.map(p=>(
            <div key={p.id} onClick={()=>setSel(p)} className={`rl-card ${sel.id===p.id?"rl-card-active":""}`} style={{padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:600,color:C.wht,fontSize:14}}>{p.label}</div>
                <div style={{fontSize:12,color:C.mut,marginTop:2}}>{p.votes} votes</div>
              </div>
              <div style={{fontWeight:700,color:C.wht,fontSize:18}}>{p.display}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.sur,borderRadius:8,padding:11,marginBottom:14,fontSize:12,color:C.mut}}>
          Worldwide cards accepted · Secured by Paystack
        </div>
        <button className="btn-white" onClick={go} disabled={!ready} style={{width:"100%",padding:"13px",fontSize:14,borderRadius:8}}>
          {ready?`Pay ${sel.display} — Get ${sel.votes} votes`:"Loading..."}
        </button>
      </div>
    </div>
  );
}

// ─── ROOM CARD ────────────────────────────────────────────────────────────────
function RoomCard({room,onClick}){
  const cat=CATS.find(c=>c.id===room.category)||CATS[1];
  return(
    <div className="rl-card" onClick={onClick} style={{cursor:"pointer",overflow:"hidden"}}>
      <div className="strm" style={{height:110}}>
        <div style={{fontSize:34,zIndex:1}}>{cat.icon}</div>
        <div style={{position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:5,background:"rgba(0,0,0,.7)",padding:"3px 9px",borderRadius:6,zIndex:2}}>
          <span className="live-blink" style={{width:6,height:6,borderRadius:"50%",background:C.live,display:"inline-block"}}/>
          <span className="mono" style={{fontSize:10,color:C.wht,fontWeight:500,letterSpacing:"0.08em"}}>LIVE</span>
        </div>
        <div style={{position:"absolute",top:10,right:10,fontSize:11,color:C.txt,background:"rgba(0,0,0,.6)",padding:"2px 8px",borderRadius:6,zIndex:2}}>
          {room.viewers||0} watching
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        <div style={{fontSize:14,fontWeight:600,color:C.wht,marginBottom:4,lineHeight:1.3}}>{room.title}</div>
        <div style={{fontSize:12,color:C.mut,marginBottom:6}}>by {room.hostName}</div>
        <div style={{display:"inline-block",fontSize:11,color:C.txtSub,background:C.sur,padding:"2px 8px",borderRadius:5}}>{cat.icon} {cat.label}</div>
      </div>
    </div>
  );
}


// ─── ADD CONTESTANT MODAL ─────────────────────────────────────────────────────
function AddContestant({roomId,onClose,onToast}){
  const[name,setName]=useState("");
  const[loading,setL]=useState(false);
  async function add(){
    if(!name.trim())return;
    setL(true);
    await fbAddContestant(roomId,name.trim());
    onToast(`${name.trim()} added as contestant`);
    onClose();
  }
  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rl-card" style={{width:"min(360px,95vw)",padding:28}}>
        <div style={{fontWeight:700,fontSize:17,color:C.wht,marginBottom:18}}>Add Contestant</div>
        <input placeholder="Contestant name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button className="btn-white" onClick={add} disabled={loading||!name.trim()} style={{flex:1,padding:"11px",fontSize:14,borderRadius:8}}>
            {loading?"Adding...":"Add"}
          </button>
          <button className="btn-ghost" onClick={onClose} style={{padding:"11px 16px",fontSize:14,borderRadius:8}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── REPORT MODAL ─────────────────────────────────────────────────────────────
function ReportModal({roomId,user,onClose,onToast}){
  const[reason,setReason]=useState("");
  const[done,setDone]=useState(false);
  const reasons=["Nudity / sexual content","Violence or harm","Hate speech","Spam or scam","Underage content","Other"];
  async function submit(){
    if(!reason)return;
    await fbReport(user.uid||"anon",roomId,reason);
    setDone(true);
    setTimeout(()=>{onToast("Report submitted. Reviewed within 24hrs.");onClose();},1200);
  }
  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rl-card" style={{width:"min(380px,95vw)",padding:28}}>
        <div style={{fontWeight:700,fontSize:17,color:C.wht,marginBottom:6}}>Report this room</div>
        <p style={{fontSize:13,color:C.mut,marginBottom:18}}>Select the reason that applies.</p>
        {done?(
          <div style={{textAlign:"center",padding:"20px 0",color:C.txt}}>✓ Report received</div>
        ):(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
              {reasons.map(r=>(
                <div key={r} onClick={()=>setReason(r)} className="rl-card" style={{padding:"11px 14px",cursor:"pointer",borderColor:reason===r?C.acc:C.bdr,background:reason===r?C.accLo:C.card}}>
                  <span style={{fontSize:13,color:reason===r?C.wht:C.txt}}>{r}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn-white" onClick={submit} disabled={!reason} style={{flex:1,padding:"11px",fontSize:14,borderRadius:8,opacity:!reason?0.5:1}}>Submit</button>
              <button className="btn-ghost" onClick={onClose} style={{padding:"11px 16px",fontSize:14,borderRadius:8}}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ─── REPORT MODAL ────────────────────────────────────────────────────────────
function ReportModal({roomId,user,onClose,onToast}){
  const[reason,setReason]=useState("");
  const[sent,setSent]=useState(false);
  const reasons=["Nudity / Sexual content","Violence or harm","Hate speech","Spam or scam","Underage content","Other"];
  async function submit(){
    if(!reason)return;
    await fbReport(user?.uid||"anon",roomId,reason);
    setSent(true);
    onToast("Report submitted. Reviewed within 24 hours.");
    setTimeout(onClose,1500);
  }
  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rl-card" style={{width:"min(360px,94vw)",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:600,fontSize:16,color:C.wht}}>Report Room</div>
          <button className="btn-ghost" onClick={onClose} style={{padding:"5px 10px",fontSize:12}}>✕</button>
        </div>
        {sent?(
          <div style={{textAlign:"center",padding:"20px 0",color:C.txt}}>✓ Reported. Thank you.</div>
        ):(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
              {reasons.map(r=>(
                <button key={r} onClick={()=>setReason(r)} style={{
                  padding:"10px 13px",borderRadius:8,textAlign:"left",fontFamily:"DM Sans",
                  fontSize:13,cursor:"pointer",border:`1px solid ${reason===r?C.bdrLight:C.bdr}`,
                  background:reason===r?C.cardHov:C.sur,color:reason===r?C.wht:C.txt,transition:"all .15s"
                }}>{r}</button>
              ))}
            </div>
            <button className="btn-white" onClick={submit} disabled={!reason} style={{width:"100%",padding:"11px",fontSize:14,borderRadius:8,opacity:!reason?0.5:1}}>
              Submit Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ADD CONTESTANT MODAL ─────────────────────────────────────────────────────
function AddContestant({roomId,onClose,onToast}){
  const[name,setName]=useState("");
  const[loading,setL]=useState(false);
  async function add(){
    if(!name.trim())return;
    setL(true);
    await fbAddContestant(roomId,name.trim());
    onToast(`${name.trim()} added as contestant.`);
    onClose();
  }
  return(
    <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rl-card" style={{width:"min(340px,94vw)",padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:600,fontSize:16,color:C.wht}}>Add Contestant</div>
          <button className="btn-ghost" onClick={onClose} style={{padding:"5px 10px",fontSize:12}}>✕</button>
        </div>
        <input placeholder="Contestant name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} style={{marginBottom:12}}/>
        <button className="btn-white" onClick={add} disabled={loading||!name.trim()} style={{width:"100%",padding:"11px",fontSize:14,borderRadius:8,opacity:!name.trim()?0.5:1}}>
          {loading?"Adding...":"Add to Room"}
        </button>
      </div>
    </div>
  );
}

// ─── ROOM VIEWER — The main experience ───────────────────────────────────────
function RoomViewer({room,user,onClose,onBuyVotes,onToast}){
  const[roomData,setRoomData]=useState(room);
  const[chat,setChat]=useState([]);
  const[msg,setMsg]=useState("");
  const[voted,setVoted]=useState(null);
  const[showReport,setShowReport]=useState(false);
  const[showAddContestant,setShowAddContestant]=useState(false);
  const[muted,setMuted]=useState(false);
  const chatRef=useRef(null);
  const isHost=user?.uid&&user.uid===roomData?.hostId;
  const agoraReady=AGORA_APP_ID!=="YOUR_AGORA_APP_ID";
  const{status,viewers:agoraViewers,joinAsHost,joinAsViewer,leave}=useAgora();

  // Listen to room changes in real time
  useEffect(()=>{
    let unsub=()=>{};
    fbGetRoom(room.id,data=>setRoomData(data)).then(fn=>{if(fn)unsub=fn;});
    return()=>unsub();
  },[room.id]);

  // Listen to chat
  useEffect(()=>{
    let unsub=()=>{};
    fbGetChat(room.id,msgs=>setChat(msgs)).then(fn=>{if(fn)unsub=fn;});
    return()=>unsub();
  },[room.id]);

  // Join Agora on mount
  useEffect(()=>{
    if(!agoraReady)return;
    const channel="rl_"+room.id;
    if(isHost)joinAsHost(channel);
    else joinAsViewer(channel);
    fbUpdateViewers(room.id,1);
    return()=>{
      leave();
      fbUpdateViewers(room.id,-1);
    };
  },[room.id,isHost]);

  // Auto scroll chat
  useEffect(()=>{
    if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;
  },[chat]);

  async function sendChat(){
    if(!msg.trim())return;
    await fbSendChat(room.id,user.uid||"anon",user.name||"Viewer",msg.trim());
    setMsg("");
  }

  async function castVote(contestant){
    if(voted)return;
    if((user.voteCredits||0)<1){onBuyVotes();return;}
    const result=await fbCastVote(user.uid,room.id,contestant.id);
    if(result?.error){onToast("You already voted in this room.");return;}
    setVoted(contestant.id);
    onToast(`Voted for ${contestant.name}!`);
  }

  async function endStream(){
    await fbEndRoom(room.id);
    await leave();
    onToast("Stream ended.");
    onClose();
  }

  const contestants=roomData?.contestants||[];
  const totalVotes=contestants.reduce((a,c)=>a+(c.votes||0),0);
  const cat=CATS.find(c=>c.id===roomData?.category)||CATS[1];
  const liveViewers=(roomData?.viewers||0)+(agoraReady?agoraViewers:0);

  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column",animation:"fadeUp .25s ease"}}>
      {showReport&&<ReportModal roomId={room.id} user={user} onClose={()=>setShowReport(false)} onToast={onToast}/>}
      {showAddContestant&&<AddContestant roomId={room.id} onClose={()=>setShowAddContestant(false)} onToast={onToast}/>}

      {/* Top bar */}
      <div style={{background:C.sur,borderBottom:`1px solid ${C.bdr}`,padding:"0 16px",height:52,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button className="btn-ghost" onClick={onClose} style={{padding:"6px 10px",fontSize:13}}>← Back</button>
        <div style={{flex:1,overflow:"hidden"}}>
          <div style={{fontWeight:600,fontSize:14,color:C.wht,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{roomData?.title}</div>
          <div style={{fontSize:11,color:C.mut}}>by {roomData?.hostName}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,59,59,0.1)",border:"1px solid rgba(255,59,59,0.25)",padding:"4px 10px",borderRadius:7}}>
          <span className="live-blink" style={{width:6,height:6,borderRadius:"50%",background:C.live,display:"inline-block"}}/>
          <span style={{fontSize:11,color:C.live,fontWeight:600,fontFamily:"DM Mono"}}>LIVE</span>
          <span style={{fontSize:11,color:C.mut,marginLeft:4}}>{liveViewers} watching</span>
        </div>
        <button onClick={()=>setShowReport(true)} style={{padding:"5px 10px",fontSize:11,borderRadius:6,background:"transparent",border:`1px solid ${C.bdr}`,color:C.mut,cursor:"pointer",fontFamily:"DM Sans"}}>Report</button>
        {isHost&&<button className="btn-ghost" onClick={endStream} style={{padding:"5px 10px",fontSize:11,color:C.live,borderColor:"rgba(255,59,59,0.3)"}}>End</button>}
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* LEFT: Video + Voting */}
        <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Video area */}
          <div style={{borderRadius:12,overflow:"hidden",background:C.card,border:`1px solid ${C.bdr}`,position:"relative",aspectRatio:"16/9",maxHeight:280}}>
            {agoraReady&&(status==="live"||status==="watching")?(
              <div id={isHost?"agora-local":"agora-remote"} style={{width:"100%",height:"100%"}}/>
            ):(
              <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:C.sur}}>
                <div style={{fontSize:36}}>{cat.icon}</div>
                <div style={{fontSize:13,color:C.mut}}>
                  {!agoraReady?"Add Agora App ID to enable live video":status==="connecting"?"Connecting...":status==="error"?"Connection failed — check your camera":"Waiting for stream..."}
                </div>
                {isHost&&status==="idle"&&agoraReady&&(
                  <button className="btn-white" onClick={()=>joinAsHost("rl_"+room.id)} style={{padding:"8px 18px",fontSize:13,borderRadius:7,marginTop:4}}>
                    Start Camera
                  </button>
                )}
              </div>
            )}
            {/* Mute button for hosts */}
            {isHost&&status==="live"&&(
              <button onClick={()=>{setMuted(m=>{const next=!m;return next;});}} style={{position:"absolute",bottom:10,right:10,padding:"6px 12px",borderRadius:7,background:"rgba(0,0,0,.7)",border:`1px solid ${C.bdr}`,color:C.txt,cursor:"pointer",fontFamily:"DM Sans",fontSize:12}}>
                {muted?"🔇 Unmute":"🎙 Mute"}
              </button>
            )}
          </div>

          {/* Contestants + Voting */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.mut,letterSpacing:"0.1em"}}>CONTESTANTS · {totalVotes} total votes</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {isHost&&(
                  <button onClick={()=>setShowAddContestant(true)} style={{fontSize:11,color:C.txt,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"DM Sans"}}>
                    + Add
                  </button>
                )}
                <button onClick={onBuyVotes} style={{fontSize:11,color:C.txt,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"DM Sans"}}>
                  🗳 {user?.voteCredits||0} votes
                </button>
              </div>
            </div>

            {contestants.length===0?(
              <div style={{textAlign:"center",padding:"28px 16px",background:C.sur,borderRadius:10,border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:13,color:C.mut,marginBottom:isHost?12:0}}>No contestants yet.</div>
                {isHost&&<button onClick={()=>setShowAddContestant(true)} className="btn-white" style={{padding:"8px 18px",fontSize:13,borderRadius:7}}>Add First Contestant</button>}
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {contestants.map((c,i)=>{
                  const pct=totalVotes>0?Math.round((c.votes/totalVotes)*100):0;
                  const leading=c.votes===Math.max(...contestants.map(x=>x.votes||0))&&totalVotes>0;
                  const isVoted=voted===c.id;
                  return(
                    <div key={c.id} className="rl-card" style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:10,borderColor:leading&&totalVotes>0?C.bdrLight:C.bdr}}>
                      <div className="av" style={{width:34,height:34,background:C.sur,color:C.txt,fontSize:13,border:`1px solid ${C.bdr}`,fontWeight:600}}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                          <span style={{fontSize:13,fontWeight:600,color:leading&&totalVotes>0?C.wht:C.txt}}>
                            {c.name} {leading&&totalVotes>0?"👑":""}
                          </span>
                          <span style={{fontSize:12,color:C.txtSub}}>{pct}% · {c.votes||0} votes</span>
                        </div>
                        <div className="vbar"><div className="vfill" style={{width:`${pct}%`}}/></div>
                      </div>
                      <button
                        onClick={()=>castVote(c)}
                        disabled={!!voted}
                        style={{
                          padding:"7px 14px",borderRadius:7,fontSize:12,fontWeight:600,
                          fontFamily:"DM Sans",cursor:voted?"default":"pointer",
                          border:`1px solid ${isVoted?C.acc:C.bdr}`,
                          background:isVoted?C.accMd:"transparent",
                          color:isVoted?C.wht:C.mut,
                          transition:"all .15s",minWidth:58
                        }}>
                        {isVoted?"✓ Voted":"Vote"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Room info */}
          {roomData?.description&&(
            <div style={{background:C.sur,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.bdr}`}}>
              <div style={{fontSize:12,color:C.mut,marginBottom:4,fontWeight:600,letterSpacing:"0.08em"}}>ABOUT THIS ROOM</div>
              <div style={{fontSize:13,color:C.txt,lineHeight:1.6}}>{roomData.description}</div>
            </div>
          )}
        </div>

        {/* RIGHT: Live Chat */}
        <div style={{width:220,borderLeft:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",flexShrink:0}} className="hs">
          <div style={{padding:"11px 14px",fontSize:11,color:C.mut,fontWeight:600,borderBottom:`1px solid ${C.bdr}`,letterSpacing:"0.1em"}}>LIVE CHAT</div>
          <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"10px",display:"flex",flexDirection:"column",gap:6}}>
            {chat.length===0?(
              <div style={{textAlign:"center",padding:"20px 10px",color:C.mut,fontSize:12}}>No messages yet. Say something!</div>
            ):chat.map(m=>(
              <div key={m.id} className="cbubble">
                <span style={{fontWeight:600,fontSize:11,color:C.acc}}>{m.name} </span>
                <span style={{fontSize:12,color:C.txt}}>{m.text}</span>
              </div>
            ))}
          </div>
          <div style={{padding:"8px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:6}}>
            <input
              value={msg}
              onChange={e=>setMsg(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendChat()}
              placeholder="Type a message..."
              style={{fontSize:12,padding:"7px 10px"}}
            />
            <button className="btn-white" onClick={sendChat} style={{padding:"7px 10px",fontSize:12,borderRadius:7,flexShrink:0}}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function ProfileTab({user,setUser,onLogout,onBuyVotes}){
  return(
    <div className="fade-up">
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        <div className="av" style={{width:60,height:60,background:C.card,color:C.wht,fontSize:22,border:`1px solid ${C.bdr}`}}>
          {user.name?.[0]?.toUpperCase()||"?"}
        </div>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:C.wht}}>{user.name}</div>
          <div style={{fontSize:13,color:C.mut,marginTop:2}}>{user.email}</div>
          <div style={{fontSize:12,color:C.txtSub,marginTop:2}}>{user.role==="creator"?"Creator":"Viewer"}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        {[["Credits",user.voteCredits||0],["Rooms","0"],["Votes","0"]].map(([l,v])=>(
          <div key={l} className="rl-card" style={{padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:700,color:C.wht}}>{v}</div>
            <div style={{fontSize:11,color:C.mut,marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>

      <div className="rl-card" style={{padding:18,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:600,color:C.wht,marginBottom:4}}>Vote Credits</div>
            <div style={{fontSize:13,color:C.mut}}>{user.voteCredits||0} available</div>
          </div>
          <button className="btn-outline" onClick={onBuyVotes} style={{padding:"8px 16px",fontSize:13,borderRadius:8}}>
            Buy More
          </button>
        </div>
      </div>

      {user.role==="viewer"&&(
        <div className="rl-card" style={{padding:18,marginBottom:12}}>
          <div style={{fontWeight:600,color:C.wht,marginBottom:6}}>Become a Creator</div>
          <div style={{fontSize:13,color:C.mut,marginBottom:14,lineHeight:1.6}}>Host live rooms. Reach a global audience. Build your community.</div>
          <button className="btn-white" onClick={async()=>{
            setUser(p=>({...p,role:"creator"}));
            if(user.uid){const{db}=await loadFB();if(db)await db.updateDoc(db.doc(db.fs,"users",user.uid),{role:"creator"});}
          }} style={{padding:"10px 20px",fontSize:14,borderRadius:8}}>
            Switch to Creator
          </button>
        </div>
      )}

      <div className="div"/>
      <button className="btn-ghost" onClick={onLogout} style={{padding:"10px 18px",fontSize:13}}>
        Sign Out
      </button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const[authed,setAuthed]=useState(false);
  const[user,setUser]=useState(null);
  const[tab,setTab]=useState("rooms");
  const[rooms,setRooms]=useState([]);
  const[showCreate,setShowCreate]=useState(false);
  const[showBuyVotes,setShowBuyVotes]=useState(false);
  const[activeRoom,setActiveRoom]=useState(null);
  const[toast,setToast]=useState(null);
  const[catFilter,setCatFilter]=useState("all");
  const[search,setSearch]=useState("");
  const notify=msg=>setToast(msg);

  useEffect(()=>{
    if(!authed)return;
    let unsub=()=>{};
    fbGetRooms(data=>setRooms(data.filter(r=>r.isLive))).then(fn=>{if(fn)unsub=fn;});
    return()=>unsub();
  },[authed]);

  function handleAuth(u){
    setUser({...u,voteCredits:u.voteCredits??5});
    setAuthed(true);
  }
  function handleLogout(){
    setUser(null);setAuthed(false);setTab("rooms");
  }
  function handleVotePurchase(n,label){
    setUser(p=>({...p,voteCredits:(p.voteCredits||0)+n}));
    notify(`${label} unlocked — ${n} votes added`);
    if(user?.uid)fbAddVotes(user.uid,n).catch(console.error);
  }

  const filtered=rooms.filter(r=>{
    if(catFilter!=="all"&&r.category!==catFilter)return false;
    if(search&&!r.title.toLowerCase().includes(search.toLowerCase())&&!r.hostName?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  // Show auth screen if not logged in
  if(!authed)return(
    <>
      <style>{CSS}</style>
      <AuthScreen onAuth={handleAuth}/>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </>
  );

  return(
    <>
      <style>{CSS}</style>
      {showCreate&&user&&<CreateRoom user={user} onClose={()=>setShowCreate(false)} onToast={notify}/>}
      {activeRoom&&user&&<RoomViewer room={activeRoom} user={user} onClose={()=>setActiveRoom(null)} onBuyVotes={()=>setShowBuyVotes(true)} onToast={notify}/>}
      {showBuyVotes&&user&&<BuyVotes user={user} onClose={()=>setShowBuyVotes(false)} onSuccess={handleVotePurchase}/>}
      {activeRoom&&user&&<RoomViewer room={activeRoom} user={user} onClose={()=>setActiveRoom(null)} onBuyVotes={()=>setShowBuyVotes(true)} onToast={notify}/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}

      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        {/* Nav */}
        <nav style={{background:C.sur,borderBottom:`1px solid ${C.bdr}`,padding:"0 20px",display:"flex",alignItems:"center",gap:10,height:54,position:"sticky",top:0,zIndex:50}}>
          <Logo size={28}/>
          <div style={{display:"flex",gap:2,marginLeft:8}}>
            {[["rooms","Rooms"],["explore","Explore"],["profile","Profile"]].map(([k,l])=>(
              <button key={k} className={`nav-item ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
          <div style={{flex:1}}/>
          <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:160,padding:"6px 11px",fontSize:13}} className="hs"/>
          <button className="btn-ghost" onClick={()=>setShowBuyVotes(true)} style={{padding:"6px 12px",fontSize:12,display:"flex",alignItems:"center",gap:5}}>
            🗳 {user?.voteCredits||0}
          </button>
          {user?.role==="creator"&&(
            <button className="btn-white" onClick={()=>setShowCreate(true)} style={{padding:"7px 14px",fontSize:13,borderRadius:8,display:"flex",alignItems:"center",gap:6}}>
              <span className="live-blink" style={{width:6,height:6,borderRadius:"50%",background:C.live,display:"inline-block"}}/>
              Go Live
            </button>
          )}
          <div className="av" style={{width:30,height:30,background:C.card,color:C.wht,fontSize:12,cursor:"pointer",border:`1px solid ${C.bdr}`}} onClick={()=>setTab("profile")}>
            {user?.name?.[0]?.toUpperCase()||"?"}
          </div>
        </nav>

        <main style={{flex:1,padding:"20px",maxWidth:1040,width:"100%",margin:"0 auto"}}>
          {tab==="rooms"&&(
            <div className="fade-up">
              {/* Category filter */}
              <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
                {CATS.map(c=>(
                  <button key={c.id} onClick={()=>setCatFilter(c.id)} className={`cat ${catFilter===c.id?"on":""}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              {/* Rooms or empty */}
              {filtered.length===0?(
                <div style={{textAlign:"center",padding:"72px 20px",color:C.mut}}>
                  <div style={{fontSize:40,marginBottom:16}}>📡</div>
                  <div style={{fontSize:18,fontWeight:600,color:C.txt,marginBottom:8}}>No live rooms right now</div>
                  <p style={{fontSize:14,color:C.mut,marginBottom:24,lineHeight:1.7,maxWidth:360,margin:"0 auto 24px"}}>
                    {user?.role==="creator"
                      ?"Be the first. Create a room and go live."
                      :"No one is live right now. Come back soon or invite a creator."}
                  </p>
                  {user?.role==="creator"&&(
                    <button className="btn-white" onClick={()=>setShowCreate(true)} style={{padding:"11px 24px",fontSize:14,borderRadius:8}}>
                      Create a room
                    </button>
                  )}
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:14}}>
                  {filtered.map(r=><RoomCard key={r.id} room={r} onClick={()=>setActiveRoom(r)}/>)}
                </div>
              )}
            </div>
          )}

          {tab==="explore"&&(
            <div className="fade-up">
              <div style={{fontWeight:700,fontSize:20,color:C.wht,marginBottom:4}}>Explore</div>
              <p style={{color:C.mut,fontSize:14,marginBottom:24}}>Browse every type of live room on RealityLive.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                {CATS.filter(c=>c.id!=="all").map(c=>(
                  <div key={c.id} className="rl-card" onClick={()=>{setTab("rooms");setCatFilter(c.id);}} style={{padding:"22px 18px",cursor:"pointer"}}>
                    <div style={{fontSize:32,marginBottom:10}}>{c.icon}</div>
                    <div style={{fontSize:15,fontWeight:600,color:C.wht,marginBottom:4}}>{c.label}</div>
                    <div style={{fontSize:12,color:C.mut}}>Browse live rooms</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="profile"&&user&&(
            <ProfileTab user={user} setUser={setUser} onLogout={handleLogout} onBuyVotes={()=>setShowBuyVotes(true)}/>
          )}
        </main>

        <footer style={{borderTop:`1px solid ${C.bdr}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <Logo size={20}/>
          <p style={{fontSize:11,color:C.mut}}>© 2026 RealityLive · support@realitylive.app</p>
        </footer>
      </div>
    </>
  );
}
