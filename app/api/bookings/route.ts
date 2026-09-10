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

    if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email))) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (
      b.passengers === undefined ||
      b.passengers === null ||
      b.passengers === "" ||
      !Number.isInteger(Number(b.passengers)) ||
      Number(b.passengers) < 1
    ) {
      return NextResponse.json({ error: "Number of passengers must be a positive whole number." }, { status: 400 });
    }

    if (Array.isArray(b.stops) && b.stops.length > 5) {
      return NextResponse.json({ error: "A maximum of 5 stops is allowed." }, { status: 400 });
    }

    if (Array.isArray(b.stop_place_ids) && Array.isArray(b.stops) && b.stop_place_ids.length !== b.stops.length) {
      return NextResponse.json({ error: "Each stop must have a selected Google place." }, { status: 400 });
    }

    for (const k of [
      "name",
      "phone",
      "email",
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
      customer_email: String(b.email),
      passengers: Number(b.passengers),
      pickup: String(b.pickup),
      destination: String(b.destination),
      stops: Array.isArray(b.stops) ? b.stops.map(String) : [],
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