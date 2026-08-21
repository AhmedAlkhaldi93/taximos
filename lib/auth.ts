import crypto from "crypto";import {cookies} from "next/headers";const NAME="taxi_admin";const secret=process.env.SESSION_SECRET||"change-me-long-secret";
function sign(v:string){return crypto.createHmac("sha256",secret).update(v).digest("hex")}
export function makeSession(){const v=`admin:${Date.now()}:${crypto.randomBytes(12).toString("hex")}`;return `${v}.${sign(v)}`}
export function validSession(t?:string){if(!t)return false;const i=t.lastIndexOf(".");if(i<1)return false;const v=t.slice(0,i),s=t.slice(i+1),e=sign(v);return s.length===e.length&&crypto.timingSafeEqual(Buffer.from(s),Buffer.from(e))}
export async function isAdmin(){return validSession((await cookies()).get(NAME)?.value)}export const sessionCookie=NAME;
