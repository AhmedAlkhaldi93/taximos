import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

let initialized = false;

async function initDb() {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      created_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      pickup TEXT NOT NULL,
      destination TEXT NOT NULL,
      distance_km REAL NOT NULL,
      duration_min REAL NOT NULL,
      price REAL NOT NULL,
      scheduled_at TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      created_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 1
    );
  `);

  const defaults: Record<string, string> = {
    siteName: "CITYRIDE",
    tagline: "Jouw rit begint hier",
    heroTitle: "Snel, helder en betrouwbaar taxivervoer",
    heroText:
      "Bereken direct je ritprijs, kies je gewenste tijd en verstuur je reservering in enkele stappen.",
    logoUrl: "",
    phone: "+32 470 00 00 00",
    whatsapp: "32470000000",
    email: "booking@example.com",
    address: "Antwerpen, België",
    footerText:
      "Moderne taxireserveringen voor ritten in en rond de stad.",
    baseFare: process.env.BASE_FARE || "4",
    perKm: process.env.PER_KM || "1.4",
    minFare: process.env.MIN_FARE || "6",
    currency: process.env.CURRENCY || "€",
    primaryColor: "#111827",
    accentColor: "#facc15",
    bookingEmail: process.env.BOOKING_EMAIL || "",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: process.env.SMTP_PORT || "587",
    smtpUser: process.env.SMTP_USER || "",
    smtpPassword: process.env.SMTP_PASSWORD || "",
  };

  for (const [key, value] of Object.entries(defaults)) {
    await pool.query(
      `
      INSERT INTO settings(key, value)
      VALUES($1, $2)
      ON CONFLICT (key) DO NOTHING
      `,
      [key, value]
    );
  }

  initialized = true;
}

async function db() {
  await initDb();
  return pool;
}

export async function getSettings() {
  const database = await db();

  const result = await database.query(
    "SELECT key, value FROM settings"
  );

  return Object.fromEntries(
    result.rows.map((row) => [row.key, row.value])
  );
}

export async function updateSettings(
  values: Record<string, string>
) {
  const database = await db();

  for (const [key, value] of Object.entries(values)) {
    await database.query(
      `
      INSERT INTO settings(key, value)
      VALUES($1, $2)
      ON CONFLICT(key)
      DO UPDATE SET value = EXCLUDED.value
      `,
      [key, String(value)]
    );
  }
}

export async function createBooking(d: any) {
  const database = await db();

  const result = await database.query(
    `
    INSERT INTO bookings(
      created_at,
      customer_name,
      phone,
      pickup,
      destination,
      distance_km,
      duration_min,
      price,
      scheduled_at,
      notes,
      status,
      completed_at
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING id
    `,
    [
      new Date().toISOString(),
      d.customer_name,
      d.phone,
      d.pickup,
      d.destination,
      d.distance_km,
      d.duration_min,
      d.price,
      d.scheduled_at || null,
      d.notes || null,
      "new",
      null,
    ]
  );

  return Number(result.rows[0].id);
}

export async function listBookings() {
  const database = await db();

  const result = await database.query(
    "SELECT * FROM bookings ORDER BY id DESC"
  );

  return result.rows;
}

export async function updateBookingStatus(
  id: number,
  status: string
) {
  if (
    !["new", "confirmed", "completed", "cancelled"].includes(status)
  ) {
    throw new Error("Invalid status");
  }

  const database = await db();

  if (status === "completed") {
    await database.query(
      `
      UPDATE bookings
      SET
        status = $1,
        completed_at = COALESCE(completed_at, $2)
      WHERE id = $3
      `,
      [status, new Date().toISOString(), id]
    );
  } else {
    await database.query(
      `
      UPDATE bookings
      SET
        status = $1,
        completed_at = NULL
      WHERE id = $2
      `,
      [status, id]
    );
  }
}

export async function getDashboardStats() {
  const database = await db();

  const countResult = async (status: string) => {
    const result = await database.query(
      "SELECT COUNT(*)::int AS n FROM bookings WHERE status = $1",
      [status]
    );

    return Number(result.rows[0].n || 0);
  };

  const totalResult = await database.query(
    "SELECT COUNT(*)::int AS n FROM bookings"
  );

  const total = Number(totalResult.rows[0].n || 0);

  const pending = await countResult("new");
  const confirmed = await countResult("confirmed");
  const completed = await countResult("completed");
  const cancelled = await countResult("cancelled");

  const incomeResult = await database.query(`
    SELECT COALESCE(SUM(price), 0) AS v
    FROM bookings
    WHERE status = 'completed'
  `);

  const income = Number(incomeResult.rows[0].v || 0);

  const avg = completed ? income / completed : 0;

  const rowsResult = await database.query(`
    SELECT price, completed_at
    FROM bookings
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
  `);

  const rows = rowsResult.rows;

  const day = (x: any) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Brussels",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(x));

  const month = (x: any) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Brussels",
      year: "numeric",
      month: "2-digit",
    }).format(new Date(x));

  const now = new Date();

  const today = day(now);
  const thisMonth = month(now);

  const dailyIncome = rows
    .filter((r) => day(r.completed_at) === today)
    .reduce((a, r) => a + Number(r.price || 0), 0);

  const monthlyIncome = rows
    .filter((r) => month(r.completed_at) === thisMonth)
    .reduce((a, r) => a + Number(r.price || 0), 0);

  return {
    total,
    pending,
    confirmed,
    completed,
    cancelled,
    income,
    averageCompleted: avg,
    dailyIncome,
    monthlyIncome,
  };
}

export async function createReview(
  name: string,
  rating: number,
  comment: string
) {
  const database = await db();

  const result = await database.query(
    `
    INSERT INTO reviews(
      created_at,
      customer_name,
      rating,
      comment,
      approved
    )
    VALUES($1,$2,$3,$4,1)
    RETURNING id
    `,
    [
      new Date().toISOString(),
      name,
      rating,
      comment,
    ]
  );

  return Number(result.rows[0].id);
}

export async function listReviews(
  approvedOnly = true
) {
  const database = await db();

  const result = approvedOnly
    ? await database.query(
        "SELECT * FROM reviews WHERE approved = 1 ORDER BY id DESC"
      )
    : await database.query(
        "SELECT * FROM reviews ORDER BY id DESC"
      );

  return result.rows;
}

export async function setReviewApproval(
  id: number,
  approved: boolean
) {
  const database = await db();

  await database.query(
    "UPDATE reviews SET approved = $1 WHERE id = $2",
    [approved ? 1 : 0, id]
  );
}

export async function deleteReview(id: number) {
  const database = await db();

  await database.query(
    "DELETE FROM reviews WHERE id = $1",
    [id]
  );
}