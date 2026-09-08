import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, intermediates = [] } = await req.json();
    if (!origin || !destination) {
      return NextResponse.json({ error: "Selecteer beide adressen." }, { status: 400 });
    }

    const key = process.env.GOOGLE_ROUTES_API_KEY;
    if (!key) return NextResponse.json({ error: "GOOGLE_ROUTES_API_KEY ontbreekt" }, { status: 500 });

    // Google Routes uses `intermediates` in the exact order supplied:
    // pickup -> stop 1 -> stop 2 -> ... -> destination.
    const safeIntermediates = Array.isArray(intermediates)
      ? intermediates
          .filter((x: any) => x?.placeId)
          .slice(0, 5)
          .map((x: any) => ({ placeId: String(x.placeId) }))
      : [];

    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { placeId: origin },
        destination: { placeId: destination },
        intermediates: safeIntermediates,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        languageCode: "nl",
      }),
    });

    const d = await r.json();
    if (!r.ok || !d.routes?.[0]) {
      return NextResponse.json({ error: d.error?.message || "Route kon niet worden berekend." }, { status: r.status || 400 });
    }

    const rt = d.routes[0];
    const sec = parseFloat(String(rt.duration || "0").replace("s", ""));
    return NextResponse.json({
      distanceKm: (rt.distanceMeters || 0) / 1000,
      durationMin: sec / 60,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Route kon niet worden berekend." }, { status: 400 });
  }
}
