import { NextRequest, NextResponse } from "next/server";

import {
  getSettings,
  listBookings,
  updateSettings,
  updateBookingStatus,
  getDashboardStats,
  listReviews,
  setReviewApproval,
  deleteReview,
} from "@/lib/db";

import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const settings = await getSettings();
  const bookings = await listBookings();
  const stats = await getDashboardStats();
  const reviews = await listReviews(false);

  return NextResponse.json(
    {
      settings,
      bookings,
      stats,
      reviews,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const b = await req.json();

    if (b.settings) {
      await updateSettings(b.settings);
    }

    if (b.bookingId && b.status) {
      await updateBookingStatus(
        Number(b.bookingId),
        String(b.status)
      );
    }

    if (
      b.reviewId &&
      b.reviewAction === "approve"
    ) {
      await setReviewApproval(
        Number(b.reviewId),
        true
      );
    }

    if (
      b.reviewId &&
      b.reviewAction === "hide"
    ) {
      await setReviewApproval(
        Number(b.reviewId),
        false
      );
    }

    if (
      b.reviewId &&
      b.reviewAction === "delete"
    ) {
      await deleteReview(
        Number(b.reviewId)
      );
    }

    const stats = await getDashboardStats();

    return NextResponse.json(
      {
        ok: true,
        stats,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Request failed",
      },
      {
        status: 400,
      }
    );
  }
}