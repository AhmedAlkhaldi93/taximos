import { NextRequest, NextResponse } from "next/server";
import {
  createBooking,
  getSettings,
  listBookings,
} from "@/lib/db";
import { sendBookingEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    for (const k of [
      "name",
      "phone",
      "pickup",
      "destination",
      "distance_km",
      "duration_min",
      "price",
    ]) {
      if (
        b[k] === undefined ||
        b[k] === null ||
        b[k] === ""
      ) {
        return NextResponse.json(
          {
            error: `Missing required field: ${k}`,
          },
          { status: 400 }
        );
      }
    }

    const id = await createBooking({
      customer_name: String(b.name),
      phone: String(b.phone),
      pickup: String(b.pickup),
      destination: String(b.destination),
      distance_km: Number(b.distance_km),
      duration_min: Number(b.duration_min),
      price: Number(b.price),
      scheduled_at: b.scheduled_at || "",
      notes: b.notes || "",
    });

    const bookings = await listBookings();

    const booking = bookings.find(
      (x: any) => x.id === id
    );

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking was created but could not be loaded.",
        },
        { status: 500 }
      );
    }

    let emailResult: any = {
      sent: false,
      reason: "Not attempted",
    };

    try {
      const settings = await getSettings();

      emailResult = await sendBookingEmail({
        ...booking,
        currency:
          process.env.CURRENCY ||
          settings.currency ||
          "€",
      });

      console.log(
        "========== BOOKING EMAIL RESULT =========="
      );
      console.log(emailResult);
      console.log(
        "=========================================="
      );
    } catch (error: any) {
      console.error(
        "========== BOOKING EMAIL ERROR =========="
      );
      console.error(error);
      console.error(
        "========================================="
      );

      emailResult = {
        sent: false,
        reason:
          error?.message ||
          "Unknown email error",
      };
    }

    return NextResponse.json({
      ok: true,
      id,
      emailSent: Boolean(emailResult.sent),
      emailReason: emailResult.reason || null,
    });
  } catch (error: any) {
    console.error("BOOKING ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Booking could not be saved.",
      },
      { status: 500 }
    );
  }
}