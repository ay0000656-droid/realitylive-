// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// 🔥 SETUP (free, 5 minutes):
// 1. console.firebase.google.com → New Project → name it "realitylive"
// 2. Click Web (</>), register app, copy config values into FIREBASE_CONFIG below
// 3. Build → Authentication → Sign-in method → enable Email/Password
// 4. Build → Firestore Database → Create database → Start in test mode
// 5. Paste your real values below — accounts + votes save permanently instantly
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDvOfC3ggo204_urbjarcKDnHIMKNqPJxU",
  authDomain:        "realitylive-c9e27.firebaseapp.com",
  projectId:         "realitylive-c9e27",
  storageBucket:     "realitylive-c9e27.firebasestorage.app",
  messagingSenderId: "476273854407",
  appId:             "1:476273854407:web:49dd27e1d288009497bbe2",
  measurementId:     "G-FNRT2QF0J5",
};
const FB_READY = FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY";

// ── Dynamic Firebase loader (no npm needed in prototype) ──────────────────────
let _db = null, _auth = null, _fbLoaded = false;
async function loadFirebase() {
  if (_fbLoaded) return { db: _db, auth: _auth };
  if (!FB_READY)  return { db: null, auth: null };
  try {
    const [appMod, fsMod, authMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"),
    ]);
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    _db   = { fs: fsMod.getFirestore(app), doc: fsMod.doc, setDoc: fsMod.setDoc, getDoc: fsMod.getDoc, updateDoc: fsMod.updateDoc, increment: fsMod.increment };
    _auth = { a: authMod.getAuth(app), createUser: authMod.createUserWithEmailAndPassword, signIn: authMod.signInWithEmailAndPassword, signOut: authMod.signOut, GoogleProvider: authMod.GoogleAuthProvider, signInWithPopup: authMod.signInWithPopup };
    _fbLoaded = true;
    return { db: _db, auth: _auth };
  } catch(e) { console.error("Firebase:", e); return { db: null, auth: null }; }
}

// ── Auth helpers ───────────────────────────────────────────────────────────────
async function fbSignUp(email, password, name, role) {
  const { auth, db } = await loadFirebase();
  if (!auth) return null;
  try {
    const cred = await auth.createUser(auth.a, email, password);
    const uid  = cred.user.uid;
    const profile = { name, email, role, voteCredits: 3, createdAt: Date.now() };
    if (db) await db.setDoc(db.doc(db.fs, "users", uid), profile);
    return { uid, ...profile };
  } catch(e) { return { error: e.message }; }
}
async function fbSignIn(email, password) {
  const { auth, db } = await loadFirebase();
  if (!auth) return null;
  try {
    const cred = await auth.signIn(auth.a, email, password);
    const uid  = cred.user.uid;
    if (db) {
      const snap = await db.getDoc(db.doc(db.fs, "users", uid));
      if (snap.exists()) return { uid, ...snap.data() };
    }
    return { uid, name: email.split("@")[0], email, role: "viewer", voteCredits: 3 };
  } catch(e) { return { error: e.message }; }
}
async function fbAddVotes(uid, credits) {
  const { db } = await loadFirebase();
  if (!db || !uid) return;
  await db.updateDoc(db.doc(db.fs, "users", uid), { voteCredits: db.increment(credits) });
}
async function fbCastVote(uid, showId, contestantIdx) {
  const { db } = await loadFirebase();
  if (!db || !uid) return;
  await db.setDoc(db.doc(db.fs, "votes", `${uid}_${showId}`), { uid, showId, contestantIdx, ts: Date.now() });
  await db.updateDoc(db.doc(db.fs, "users", uid), { voteCredits: db.increment(-1) });
}

async function fbGoogleSignIn() {
  const { auth, db } = await loadFirebase();
  if (!auth) return { error: "Firebase not configured" };
  try {
    const provider = new auth.GoogleProvider();
    const cred = await auth.signInWithPopup(auth.a, provider);
    const uid  = cred.user.uid;
    const name = cred.user.displayName || cred.user.email.split("@")[0];
    const email = cred.user.email;
    if (db) {
      const snap = await db.getDoc(db.doc(db.fs, "users", uid));
      if (snap.exists()) return { uid, ...snap.data() };
      const profile = { name, email, role: "viewer", voteCredits: 3, createdAt: Date.now() };
      await db.setDoc(db.doc(db.fs, "users", uid), profile);
      return { uid, ...profile };
    }
    return { uid, name, email, role: "viewer", voteCredits: 3 };
  } catch(e) { return { error: e.message }; }
}

async function fbSaveReport(uid, showId, reason) {
  const { db } = await loadFirebase();
  if (!db) return;
  await db.setDoc(db.doc(db.fs, "reports", `${uid}_${showId}_${Date.now()}`), {
    uid, showId, reason, ts: Date.now(), reviewed: false
  });
}

import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Bold broadcast aesthetic: deep navy-black base, electric amber accent
// (TV broadcast warmth, not gaming-green). Signature: animated "ON AIR" ticker.
const T = {
  bg:       "#080810",
  surface:  "#0F0F1A",
  card:     "#161625",
  border:   "#252538",
  accent:   "#E8365D",        // red — bold, broadcast energy
  accentLo: "rgba(232,54,93,0.12)",
  red:      "#C0183D",
  redLo:    "rgba(192,24,61,0.12)",
  green:    "#1DB954",
  text:     "#EEEEFc",
  muted:    "#6B6B8A",
  white:    "#FFFFFF",
};

// ─── AGORA CONFIG ─────────────────────────────────────────────────────────────
// 🔴 REAL AGORA SETUP:
// 1. Go to console.agora.io → create a project → copy App ID below
// 2. For testing with no token auth: set Token Security to "No certificate"
// 3. Install: npm install agora-rtc-sdk-ng
// 4. Replace APP_ID with your real Agora App ID
const AGORA_APP_ID = "eb6533f773124b6ab8e7b782bc718c84";

// ─── PAYSTACK CONFIG ──────────────────────────────────────────────────────────
// 🟢 YOUR PAYSTACK KEYS:
// Paste your PUBLIC key below (starts with pk_live_ or pk_test_)
// NEVER paste your secret key in frontend code
const PAYSTACK_PUBLIC_KEY = "pk_live_2cdbfd0a3340c67656ca92204f4c78901fed0a19";

// Vote packages (in Naira — change currency/amounts as needed)
const VOTE_PACKS = [
  { id: "starter", label: "Starter Pack", votes: 10,  amount: 50000,  display: "₦500" },
  { id: "super",   label: "Super Fan",    votes: 50,  amount: 200000, display: "₦2,000" },
  { id: "legend",  label: "Legend Pack",  votes: 150, amount: 500000, display: "₦5,000" },
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const SHOWS = [
  { id: "s1", title: "Vocal Powerhouse",    emoji: "🎤", host: "Amara K.", viewers: 3842, color: T.accent,  contestants: ["Chisom", "Bayo", "Zainab", "Emeka"],  votes: [820, 610, 940, 430] },
  { id: "s2", title: "Street Comedy Battle",emoji: "😂", host: "Tunde F.", viewers: 1920, color: T.red,    contestants: ["Sola",   "Kemi", "Dami",  "Rauf"],    votes: [510, 390, 280, 620] },
  { id: "s3", title: "Dance Explosion",     emoji: "💃", host: "Blessing O.",viewers:2611,color:"#9B5DE5", contestants: ["Fatima", "Chidi","Ngozi", "Seun"],   votes: [730, 540, 410, 680] },
  { id: "s4", title: "Hustle Nation",       emoji: "🏙️", host: "Chuks M.", viewers: 987,  color:"#06D6A0", contestants: ["Ada",    "Jide", "Hauwa","Tope"],    votes: [310, 280, 190, 350] },
];

const LEADERBOARD = [
  { rank:1, name:"Zainab",  show:"Vocal Powerhouse",    votes:14820, color:T.accent },
  { rank:2, name:"Rauf",    show:"Street Comedy",       votes:11240, color:T.red    },
  { rank:3, name:"Chisom",  show:"Vocal Powerhouse",    votes:9310,  color:T.accent },
  { rank:4, name:"Seun",    show:"Dance Explosion",     votes:7650,  color:"#9B5DE5"},
  { rank:5, name:"Tope",    show:"Hustle Nation",       votes:6200,  color:"#06D6A0"},
];

const SEED_CHAT = [
  { user:"superfan_ng",  text:"Zainab is GOING OFF right now 🔥", ts:"just now" },
  { user:"realtvaddict", text:"Vote Rauf!! he carried that last set",ts:"1m" },
  { user:"watchdog99",   text:"This is better than Big Brother lol", ts:"2m" },
  { user:"stageking",    text:"First time here — this is REAL",      ts:"3m" },
];

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
  html { scroll-behavior: smooth; }
  body { background:${T.bg}; color:${T.text}; font-family:'Space Grotesk',sans-serif; min-height:100vh; }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:${T.surface}; }
  ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }

  .syne { font-family:'Syne',sans-serif; }

  /* Broadcast ticker */
  @keyframes ticker {
    0%   { transform:translateX(100vw); }
    100% { transform:translateX(-100%); }
  }
  .ticker-inner { display:inline-block; animation:ticker 28s linear infinite; white-space:nowrap; }

  /* Live pulse */
  @keyframes livepulse {
    0%,100% { box-shadow:0 0 0 0 rgba(232,54,93,0.7); }
    70%     { box-shadow:0 0 0 8px rgba(232,54,93,0); }
  }
  .live-dot {
    width:8px; height:8px; border-radius:50%;
    background:${T.red}; display:inline-block;
    animation:livepulse 1.6s ease-in-out infinite;
  }

  /* Buttons */
  .btn-primary {
    background:${T.accent}; color:#000; border:none; border-radius:8px;
    font-family:'Space Grotesk',sans-serif; font-weight:700; cursor:pointer;
    transition:all 0.15s; letter-spacing:0.02em;
  }
  .btn-primary:hover { filter:brightness(1.12); transform:translateY(-1px); }
  .btn-primary:active { transform:translateY(0); }

  .btn-danger {
    background:${T.red}; color:#fff; border:none; border-radius:8px;
    font-family:'Space Grotesk',sans-serif; font-weight:700; cursor:pointer;
    transition:all 0.15s;
  }
  .btn-danger:hover { filter:brightness(1.1); }

  .btn-ghost {
    background:transparent; color:${T.muted}; border:1px solid ${T.border};
    border-radius:8px; font-family:'Space Grotesk',sans-serif; font-weight:500;
    cursor:pointer; transition:all 0.15s;
  }
  .btn-ghost:hover { color:${T.text}; border-color:${T.muted}; }

  /* Cards */
  .card { background:${T.card}; border:1px solid ${T.border}; border-radius:14px; }
  .card-hover { transition:border-color 0.2s, transform 0.2s; }
  .card-hover:hover { border-color:#3A3A58; transform:translateY(-2px); }

  /* Input */
  input, textarea, select {
    background:${T.surface}; border:1px solid ${T.border}; border-radius:8px;
    color:${T.text}; font-family:'Space Grotesk',sans-serif; font-size:14px;
    padding:10px 14px; outline:none; transition:border-color 0.15s; width:100%;
  }
  input:focus, textarea:focus, select:focus { border-color:${T.accent}; }
  input::placeholder, textarea::placeholder { color:${T.muted}; }

  /* Modal */
  .modal-bg {
    position:fixed; inset:0; background:rgba(0,0,0,0.8);
    backdrop-filter:blur(6px); z-index:100;
    display:flex; align-items:center; justify-content:center;
    animation:fadeIn 0.2s ease; padding:16px;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }

  /* Chat bubble */
  .bubble {
    background:${T.surface}; border-radius:10px;
    padding:8px 12px; font-size:13px; line-height:1.5;
    animation:slideUp 0.25s ease;
  }
  @keyframes slideUp {
    from{opacity:0;transform:translateY(6px)}
    to{opacity:1;transform:translateY(0)}
  }

  /* Vote bar */
  .vbar-bg { background:${T.border}; border-radius:99px; height:5px; overflow:hidden; }
  .vbar-fill { height:100%; border-radius:99px; transition:width 0.7s cubic-bezier(.4,0,.2,1); }

  /* Toast */
  .toast {
    position:fixed; bottom:24px; right:24px; z-index:300;
    background:${T.card}; border:1px solid ${T.border};
    border-left:3px solid ${T.accent}; border-radius:10px;
    padding:14px 18px; font-size:14px; max-width:300px;
    animation:slideUp 0.3s ease;
  }

  /* Nav tab */
  .ntab {
    background:transparent; border:none; cursor:pointer;
    font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:600;
    color:${T.muted}; padding:9px 15px; border-radius:8px; transition:all 0.15s;
  }
  .ntab:hover { color:${T.text}; background:${T.card}; }
  .ntab.on { color:${T.text}; background:${T.card}; border-bottom:2px solid ${T.accent}; }

  /* Stream placeholder */
  .stream-bg {
    background:linear-gradient(135deg,#08081A,#14102A);
    border-radius:12px; position:relative; overflow:hidden;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:10px;
  }
  .stream-bg::before {
    content:''; position:absolute; inset:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 38px,
      rgba(255,255,255,0.015) 38px,rgba(255,255,255,0.015) 39px);
  }

  /* Agora video container */
  #agora-local  { width:100%; height:100%; border-radius:12px; overflow:hidden; background:#000; }
  #agora-remote { width:100%; height:100%; border-radius:12px; overflow:hidden; background:#111; }

  .avatar {
    border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-weight:700; color:#fff; flex-shrink:0;
  }

  @media(max-width:680px) {
    .hide-sm { display:none !important; }
    .col-sm  { flex-direction:column !important; }
  }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+"K" : n;

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return <div className="toast">✅ {msg}</div>;
}

// ─── PAYSTACK HOOK ────────────────────────────────────────────────────────────
// Loads Paystack inline script and triggers payment popup
function usePaystack() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.PaystackPop) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  const pay = useCallback(({ email, amount, onSuccess, onClose, meta = {} }) => {
    if (!window.PaystackPop) { alert("Paystack not loaded yet, try again."); return; }
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount,               // in kobo (₦1 = 100 kobo)
      currency: "NGN",
      ref: "RL_" + Date.now() + "_" + Math.random().toString(36).slice(2,8),
      metadata: { custom_fields: [{ display_name: "Platform", value: "RealityLive", ...meta }] },
      callback: res => onSuccess(res),
      onClose,
    });
    handler.openIframe();
  }, []);

  return { ready, pay };
}

// ─── AGORA HOOK ───────────────────────────────────────────────────────────────
// Loads Agora Web SDK dynamically and manages channel join/leave
// In production: generate tokens server-side and pass here
function useAgora() {
  const clientRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | joining | live | watching | error
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState([]);

  // Dynamically load Agora SDK
  useEffect(() => {
    if (window.AgoraRTC) return;
    const s = document.createElement("script");
    s.src = "https://download.agora.io/sdk/release/AgoraRTC_N.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function startBroadcast(channelName) {
    if (!window.AgoraRTC) { setStatus("error"); return; }
    try {
      setStatus("joining");
      const client = window.AgoraRTC.createClient({ mode:"live", codec:"vp8" });
      await client.setClientRole("host");
      // 🔴 For production: replace null with a token from your backend
      await client.join(AGORA_APP_ID, channelName, null, null);
      const [audioTrack, videoTrack] = await window.AgoraRTC.createMicrophoneAndCameraTracks();
      await client.publish([audioTrack, videoTrack]);
      videoTrack.play("agora-local");
      clientRef.current = client;
      setLocalTracks({ audio: audioTrack, video: videoTrack });
      setStatus("live");
    } catch(e) {
      console.error("Agora broadcast error:", e);
      setStatus("error");
    }
  }

  async function watchStream(channelName) {
    if (!window.AgoraRTC) { setStatus("error"); return; }
    try {
      setStatus("joining");
      const client = window.AgoraRTC.createClient({ mode:"live", codec:"vp8" });
      await client.setClientRole("audience");
      await client.join(AGORA_APP_ID, channelName, null, null);
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") user.videoTrack.play("agora-remote");
        if (mediaType === "audio") user.audioTrack.play();
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      });
      client.on("user-unpublished", user => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });
      clientRef.current = client;
      setStatus("watching");
    } catch(e) {
      console.error("Agora watch error:", e);
      setStatus("error");
    }
  }

  async function stopAll() {
    const { audio, video } = localTracks;
    audio?.close(); video?.close();
    await clientRef.current?.leave();
    clientRef.current = null;
    setLocalTracks({ audio:null, video:null });
    setRemoteUsers([]);
    setStatus("idle");
  }

  return { status, remoteUsers, startBroadcast, watchStream, stopAll };
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ onAuth }) {
  const [mode, setMode]       = useState("login");
  const [form, setForm]       = useState({ name:"", email:"", password:"", role:"viewer" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit() {
    if (!form.email || !form.password) { setError("Email and password required."); return; }
    if (mode === "signup" && !ageConfirmed) { setError("You must confirm you are 18 or older to join."); return; }
    setLoading(true); setError("");
    if (FB_READY) {
      const result = mode === "signup"
        ? await fbSignUp(form.email, form.password, form.name || form.email.split("@")[0], form.role)
        : await fbSignIn(form.email, form.password);
      if (result?.error) { setError(result.error.replace("Firebase:","").replace("Error (auth/","").replace(")","").trim()); setLoading(false); return; }
      if (result) { onAuth(result); return; }
      setError("Something went wrong. Try again.");
      setLoading(false);
    } else {
      onAuth({ name: form.name || form.email.split("@")[0], email: form.email, role: form.role, voteCredits: 3 });
    }
  }

  async function googleLogin() {
    setLoading(true); setError("");
    if (!ageConfirmed && mode === "signup") { setError("Please confirm your age first."); setLoading(false); return; }
    const result = await fbGoogleSignIn();
    if (result?.error) { setError("Google sign-in failed. Try email instead."); setLoading(false); return; }
    if (result) { onAuth(result); return; }
    setLoading(false);
  }

  return (
    <div className="modal-bg">
      <div className="card" style={{ width:370, padding:32 }}>
        <div className="syne" style={{ fontSize:30, color:T.white, marginBottom:2 }}>
          REALITY<span style={{ color:T.accent }}>LIVE</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: FB_READY ? T.green : T.muted }} />
          <span style=
