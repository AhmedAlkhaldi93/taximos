import nodemailer from "nodemailer";
import { getSettings } from "./db";

async function getTransporter() {
  const s = await getSettings();
  const host = process.env.SMTP_HOST || s.smtpHost || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || s.smtpPort || 587);
  const user = process.env.SMTP_USER || s.smtpUser || "";
  const password = process.env.SMTP_PASSWORD || s.smtpPassword || "";
  if (!host || !user || !password) return { transporter: null, s, user, reason: "SMTP is not configured" };
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password }, tls: { rejectUnauthorized: false } });
  await transporter.verify();
  return { transporter, s, user, reason: null };
}

export async function sendBookingEmail(booking: any) {
  const recipient = process.env.BOOKING_EMAIL || (await getSettings()).bookingEmail || "";
  if (!recipient) return { sent: false, reason: "Booking recipient email is not configured" };
  try {
    const { transporter, s, user, reason } = await getTransporter();
    if (!transporter) return { sent: false, reason };
    const currency = process.env.CURRENCY || s.currency || "€";
    await transporter.sendMail({
      from: `"${s.siteName || "Taxi Booking"}" <${user}>`,
      to: recipient,
      subject: `New taxi booking #${booking.id} — ${booking.customer_name}`,
      text: bookingText(booking, currency),
      html: bookingHtml(booking, currency, "New taxi booking"),
    });
    return { sent: true };
  } catch (error: any) {
    return { sent: false, reason: error?.message || "Failed to send booking email" };
  }
}

export async function sendBookingStatusEmail(booking: any, status: "confirmed" | "cancelled") {
  if (!booking.customer_email) return { sent: false, reason: "Customer email is missing" };
  try {
    const { transporter, s, user, reason } = await getTransporter();
    if (!transporter) return { sent: false, reason };
    const confirmed = status === "confirmed";
    const title = confirmed ? "Your taxi booking is confirmed" : "Your taxi booking was declined";
    const currency = process.env.CURRENCY || s.currency || "€";
    const text = `${title}\n\nBooking #${booking.id}\n\nCustomer: ${booking.customer_name}\nPickup: ${booking.pickup}\n${formatStops(booking)}Destination: ${booking.destination}\nDate: ${booking.scheduled_at || "As soon as possible"}\nPrice: ${Number(booking.price || 0).toFixed(2)} ${currency}\n\n${confirmed ? "We look forward to driving you." : "Unfortunately, we cannot accept this booking."}`;
    await transporter.sendMail({
      from: `"${s.siteName || "Taxi Booking"}" <${user}>`,
      to: booking.customer_email,
      subject: `#${booking.id} — ${title}`,
      text,
      html: bookingHtml(booking, currency, title, confirmed),
    });
    return { sent: true };
  } catch (error: any) {
    return { sent: false, reason: error?.message || "Failed to send customer email" };
  }
}

function bookingText(booking: any, currency: string) {
  return `New taxi booking #${booking.id}\n\nCustomer: ${booking.customer_name}\nPhone: ${booking.phone}\nCustomer email: ${booking.customer_email || "-"}\nPickup: ${booking.pickup}\n${formatStops(booking)}Destination: ${booking.destination}\nDate: ${booking.scheduled_at || "As soon as possible"}\nDistance: ${Number(booking.distance_km || 0).toFixed(1)} km\nDuration: ${Math.round(Number(booking.duration_min || 0))} min\nPrice: ${Number(booking.price || 0).toFixed(2)} ${currency}\nNotes: ${booking.notes || "-"}`;
}

function formatStops(booking: any) {
  const stops = Array.isArray(booking.stops) ? booking.stops : (() => { try { return JSON.parse(booking.stops_json || "[]"); } catch { return []; } })();
  return stops.length ? `Stops: ${stops.join(" → ")}\n` : "";
}

function bookingHtml(booking: any, currency: string, title: string, confirmed?: boolean) {
  const statusBlock = confirmed === undefined ? "" : `<div style="margin-bottom:20px;padding:14px;border-radius:12px;background:${confirmed ? "#dcfce7" : "#fee2e2"};color:${confirmed ? "#166534" : "#991b1b"};font-weight:bold">${escapeHtml(title)}</div>`;
  const stops = Array.isArray(booking.stops) ? booking.stops : (() => { try { return JSON.parse(booking.stops_json || "[]"); } catch { return []; } })();
  return `<!DOCTYPE html><html><body style="margin:0;padding:30px;background:#f3f4f6;font-family:Arial;color:#111827"><div style="max-width:700px;margin:auto;background:#fff;border-radius:20px;overflow:hidden"><div style="background:#111827;color:#fff;padding:28px"><h1 style="margin:0">${escapeHtml(title)}</h1><p>Booking #${booking.id}</p></div><div style="padding:28px">${statusBlock}<table style="width:100%;border-collapse:collapse">${row("Customer",booking.customer_name)}${row("Phone",booking.phone)}${row("Email",booking.customer_email || "-")}${row("Pickup",booking.pickup)}${stops.length ? row("Stops",stops.join(" → ")) : ""}${row("Destination",booking.destination)}${row("Date & Time",booking.scheduled_at || "As soon as possible")}${row("Distance",`${Number(booking.distance_km || 0).toFixed(1)} km`)}${row("Duration",`${Math.round(Number(booking.duration_min || 0))} min`)}${row("Price",`${Number(booking.price || 0).toFixed(2)} ${currency}`)}${booking.notes ? row("Notes",booking.notes) : ""}</table></div></div></body></html>`;
}

function row(label: string, value: any) { return `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;width:35%">${escapeHtml(label)}</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb">${escapeHtml(value)}</td></tr>`; }
function escapeHtml(value: any) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]!)); }
