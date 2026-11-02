import fs from "node:fs";
import { createSessionToken, verifySessionToken } from "./src/lib/auth/session.ts";

// Load master key like the server
function load() {
  const txt = fs.readFileSync(".env.local", "utf-8");
  const m = txt.match(/ENCRYPTION_MASTER_KEY\s*=\s*(.+)/);
  if (m) process.env.ENCRYPTION_MASTER_KEY = m[1].trim();
}
load();

const token = createSessionToken({ userId: "u1", profileId: "p1", phoneHash: "h1", role: "MEMBER" });
const verified = verifySessionToken(token);
console.log("token len:", token.length);
console.log("verify ok:", verified !== null, verified ? JSON.stringify({ uid: verified.userId, pid: verified.profileId, role: verified.role }) : "");

// Make the call to the running server
const res = await fetch("http://localhost:3410/api/messages/conversations", {
  headers: { cookie: `pal_session=${token}` },
});
console.log("HTTP status:", res.status);
console.log("body:", (await res.text()).slice(0, 200));
