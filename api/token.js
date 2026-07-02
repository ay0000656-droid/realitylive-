const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  const { channelName, uid, role } = req.query;
  if (!channelName) return res.status(400).json({ error: "channelName required" });
  const APP_ID = process.env.AGORA_APP_ID;
  const APP_CERT = process.env.AGORA_APP_CERT;
  if (!APP_ID || !APP_CERT) return res.status(500).json({ error: "Agora not configured" });
  try {
    const userRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expireTs = Math.floor(Date.now() / 1000) + 3600;
    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERT, channelName, uid ? parseInt(uid) : 0, userRole, expireTs);
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate token" });
  }
};
