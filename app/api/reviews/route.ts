import { NextRequest, NextResponse } from "next/server";

import {
  createReview,
  listReviews,
} from "@/lib/db";

export async function GET() {
  const reviews = await listReviews(true);

  return NextResponse.json(
    {
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
  try {
    const b = await req.json();

    const name = String(b.name || "").trim();
    const comment = String(b.comment || "").trim();
    const rating = Number(b.rating);

    if (
      !name ||
      !comment ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter your name, rating and review.",
        },
        {
          status: 400,
        }
      );
    }

    const id = await createReview(
      name,
      rating,
      comment
    );

    return NextResponse.json({
      ok: true,
      id,
    });
  } catch (error: any) {
    console.error("REVIEW ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not save review.",
      },
      {
        status: 500,
      }
    );
  }
}