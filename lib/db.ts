import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, "taxi.sqlite"));

db.exec(`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bookings(
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, customer_name TEXT NOT NULL,
  phone TEXT NOT NULL, pickup TEXT NOT NULL, destination TEXT NOT NULL, distance_km REAL NOT NULL,
  duration_min REAL NOT NULL, price REAL NOT NULL, scheduled_at TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'new', completed_at TEXT
);
CREATE TABLE IF NOT EXISTS reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL, comment TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 1
);
`);
const cols = db.prepare("PRAGMA table_info(bookings)").all() as {name:string}[];
if (!cols.some(c=>c.name==="completed_at")) db.exec("ALTER TABLE bookings ADD COLUMN completed_at TEXT");
const defaults:Record<string,string>={
 siteName:"CITYRIDE",tagline:"Jouw rit begint hier",heroTitle:"Snel, helder en betrouwbaar taxivervoer",
 heroText:"Bereken direct je ritprijs, kies je gewenste tijd en verstuur je reservering in enkele stappen.",logoUrl:"",
 phone:"+32 470 00 00 00",whatsapp:"32470000000",email:"booking@example.com",address:"Antwerpen, België",
 footerText:"Moderne taxireserveringen voor ritten in en rond de stad.",baseFare:process.env.BASE_FARE||"4",perKm:process.env.PER_KM||"1.4",
 minFare:process.env.MIN_FARE||"6",currency:process.env.CURRENCY||"€",primaryColor:"#111827",accentColor:"#facc15",
 bookingEmail:process.env.BOOKING_EMAIL||"",smtpHost:process.env.SMTP_HOST||"",smtpPort:process.env.SMTP_PORT||"587",smtpUser:process.env.SMTP_USER||"",smtpPassword:process.env.SMTP_PASSWORD||""
};
const ins=db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)"); for(const[k,v]of Object.entries(defaults))ins.run(k,v);
export function getSettings(){return Object.fromEntries((db.prepare("SELECT key,value FROM settings").all() as any[]).map(r=>[r.key,r.value]));}
export function updateSettings(values:Record<string,string>){const s=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");db.transaction(()=>{for(const[k,v]of Object.entries(values))s.run(k,String(v));})();}
export function createBooking(d:any){const r=db.prepare(`INSERT INTO bookings(created_at,customer_name,phone,pickup,destination,distance_km,duration_min,price,scheduled_at,notes,status,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(new Date().toISOString(),d.customer_name,d.phone,d.pickup,d.destination,d.distance_km,d.duration_min,d.price,d.scheduled_at||null,d.notes||null,"new",null);return Number(r.lastInsertRowid);}
export function listBookings(){return db.prepare("SELECT * FROM bookings ORDER BY id DESC").all();}
export function updateBookingStatus(id:number,status:string){if(!["new","confirmed","completed","cancelled"].includes(status))throw new Error("Invalid status");if(status==="completed")db.prepare("UPDATE bookings SET status=?,completed_at=COALESCE(completed_at,?) WHERE id=?").run(status,new Date().toISOString(),id);else db.prepare("UPDATE bookings SET status=?,completed_at=NULL WHERE id=?").run(status,id);}
export function getDashboardStats(){
 const count=(s:string)=>Number((db.prepare("SELECT COUNT(*) n FROM bookings WHERE status=?").get(s) as any).n||0); const total=Number((db.prepare("SELECT COUNT(*) n FROM bookings").get() as any).n||0);
 const pending=count("new"),confirmed=count("confirmed"),completed=count("completed"),cancelled=count("cancelled"); const income=Number((db.prepare("SELECT COALESCE(SUM(price),0) v FROM bookings WHERE status='completed'").get() as any).v||0); const avg=completed?income/completed:0;
 const rows=db.prepare("SELECT price,completed_at FROM bookings WHERE status='completed' AND completed_at IS NOT NULL").all() as any[]; const day=(x:any)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(x)); const month=(x:any)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit"}).format(new Date(x)); const now=new Date(); const today=day(now),thisMonth=month(now); const dailyIncome=rows.filter(r=>day(r.completed_at)===today).reduce((a,r)=>a+Number(r.price||0),0); const monthlyIncome=rows.filter(r=>month(r.completed_at)===thisMonth).reduce((a,r)=>a+Number(r.price||0),0);
 return {total,pending,confirmed,completed,cancelled,income,averageCompleted:avg,dailyIncome,monthlyIncome};
}
export function createReview(name:string,rating:number,comment:string){const r=db.prepare("INSERT INTO reviews(created_at,customer_name,rating,comment,approved) VALUES(?,?,?,?,1)").run(new Date().toISOString(),name,rating,comment);return Number(r.lastInsertRowid);}
export function listReviews(approvedOnly=true){return approvedOnly?db.prepare("SELECT * FROM reviews WHERE approved=1 ORDER BY id DESC").all():db.prepare("SELECT * FROM reviews ORDER BY id DESC").all();}
export function setReviewApproval(id:number,approved:boolean){db.prepare("UPDATE reviews SET approved=? WHERE id=?").run(approved?1:0,id);}
export function deleteReview(id:number){db.prepare("DELETE FROM reviews WHERE id=?").run(id);}
