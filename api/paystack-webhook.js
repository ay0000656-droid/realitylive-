const crypto = require("crypto");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const sig = req.headers["x-paystack-signature"];
  const expected = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");
  if (sig !== expected) return res.status(401).json({ error: "Unauthorized" });
  const { event, data } = req.body;
  if (event !== "charge.success") return res.status(200).json({ message: "Ignored" });
  const uid = data.metadata?.custom_fields?.find(f => f.variable_name === "uid")?.value;
  if (!uid) return res.status(200).json({ message: "No UID" });
  const PACKS = { 50000: 10, 200000: 50, 500000: 150 };
  const credits = PACKS[data.amount];
  if (!credits) return res.status(200).json({ message: "Unknown amount" });
  try {
    const admin = require("firebase-admin");
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    const db = admin.firestore();
    await db.collection("users").doc(uid).update({ voteCredits: admin.firestore.FieldValue.increment(credits) });
    await db.collection("transactions").add({ uid, amount: data.amount, credits, reference: data.reference, ts: Date.now() });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Firebase error" });
  }
};
