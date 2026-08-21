import nodemailer from "nodemailer";
import { getSettings } from "./db";

export async function sendBookingEmail(booking: any) {
  const s = getSettings();

  const to =
    process.env.BOOKING_EMAIL ||
    s.bookingEmail ||
    "";

  const host =
    process.env.SMTP_HOST ||
    s.smtpHost ||
    "smtp.gmail.com";

  const port = Number(
    process.env.SMTP_PORT ||
    s.smtpPort ||
    587
  );

  const user =
    process.env.SMTP_USER ||
    s.smtpUser ||
    "";

  const password =
    process.env.SMTP_PASSWORD ||
    s.smtpPassword ||
    "";

  if (!to || !host || !user || !password) {
    console.error("SMTP is not configured", {
      hasRecipient: Boolean(to),
      hasHost: Boolean(host),
      hasUser: Boolean(user),
      hasPassword: Boolean(password),
    });

    return {
      sent: false,
      reason: "SMTP is not configured",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,

      auth: {
        user,
        pass: password,
      },

      /*
       * Temporary workaround for the
       * self-signed certificate error
       * on the local Windows environment.
       */
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log("Checking SMTP connection...");

    await transporter.verify();

    console.log("SMTP connection successful.");

    const currency =
      process.env.CURRENCY ||
      s.currency ||
      "€";

    const siteName =
      s.siteName ||
      "Taxi Booking";

    await transporter.sendMail({
      from: `"${siteName}" <${user}>`,
      to,

      subject:
        `New taxi booking #${booking.id} — ` +
        `${booking.customer_name}`,

      text: `
New taxi booking #${booking.id}

Customer:
${booking.customer_name}

Phone:
${booking.phone}

Pickup:
${booking.pickup}

Destination:
${booking.destination}

Date:
${booking.scheduled_at || "As soon as possible"}

Distance:
${Number(booking.distance_km || 0).toFixed(1)} km

Duration:
${Math.round(
  Number(booking.duration_min || 0)
)} min

Price:
${Number(booking.price || 0).toFixed(2)} ${currency}

Notes:
${booking.notes || "-"}
      `.trim(),

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Taxi Booking</title>
</head>

<body style="
  margin:0;
  padding:30px;
  background:#f3f4f6;
  font-family:Arial,Helvetica,sans-serif;
  color:#111827;
">

  <div style="
    max-width:700px;
    margin:auto;
    background:#ffffff;
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 10px 30px rgba(0,0,0,.08);
  ">

    <div style="
      background:#111827;
      color:#ffffff;
      padding:28px;
    ">
      <h1 style="
        margin:0;
        font-size:24px;
      ">
        New Taxi Booking
      </h1>

      <p style="
        margin:8px 0 0;
        opacity:.75;
      ">
        Booking #${booking.id}
      </p>
    </div>

    <div style="padding:28px;">

      <table style="
        width:100%;
        border-collapse:collapse;
      ">

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
            width:35%;
          ">
            Customer
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${escapeHtml(booking.customer_name)}
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Phone
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${escapeHtml(booking.phone)}
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Pickup
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${escapeHtml(booking.pickup)}
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Destination
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${escapeHtml(booking.destination)}
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Date & Time
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${escapeHtml(
              booking.scheduled_at ||
              "As soon as possible"
            )}
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Distance
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${Number(
              booking.distance_km || 0
            ).toFixed(1)} km
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Duration
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
          ">
            ${Math.round(
              Number(booking.duration_min || 0)
            )} min
          </td>
        </tr>

        <tr>
          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Price
          </td>

          <td style="
            padding:12px 0;
            border-bottom:1px solid #e5e7eb;
            font-size:18px;
            font-weight:bold;
          ">
            ${Number(
              booking.price || 0
            ).toFixed(2)}
            ${escapeHtml(currency)}
          </td>
        </tr>

        ${
          booking.notes
            ? `
        <tr>
          <td style="
            padding:12px 0;
            font-weight:bold;
          ">
            Notes
          </td>

          <td style="
            padding:12px 0;
          ">
            ${escapeHtml(booking.notes)}
          </td>
        </tr>
        `
            : ""
        }

      </table>

      <div style="
        margin-top:28px;
        padding:16px;
        background:#f9fafb;
        border-radius:12px;
        color:#6b7280;
        font-size:13px;
      ">
        This booking was automatically sent from the taxi
        booking website.
      </div>

    </div>
  </div>

</body>
</html>
      `,
    });

    console.log(
      `Booking email sent successfully for booking #${booking.id}`
    );

    return {
      sent: true,
    };

  } catch (error: any) {

    console.error(
      `Booking email failed for booking #${booking.id}:`,
      error
    );

    return {
      sent: false,
      reason:
        error?.message ||
        "Failed to send booking email",
    };
  }
}

function escapeHtml(value: any) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character]!)
  );
}