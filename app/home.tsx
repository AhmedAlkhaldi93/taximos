"use client";

import { useEffect, useRef, useState } from "react";
import {
  CarFront,
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  Loader2,
  Globe2,
  CheckCircle2,
  Star,
  Send,
} from "lucide-react";

type S = Record<string, string>;

type P = {
  placeId: string;
  text: string;
  secondary: string;
};

type Lang = "nl" | "fr" | "en";

type Review = {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
};

const T: any = {
  nl: {
    calc: "Rit berekenen",
    book: "Reserveer nu",
    contact: "Contact",
    reviews: "Klantbeoordelingen",
    badge: "Eenvoudig reserveren, duidelijke prijs",
    from: "Ophaaladres",
    to: "Bestemming",
    placeholder: "Typ een adres of plaats...",
    calculate: "Afstand en prijs berekenen",
    distance: "Afstand",
    duration: "Geschatte reistijd",
    price: "Geschatte prijs",
    booking: "Reserveer je rit",
    name: "Naam",
    phone: "Telefoonnummer",
    date: "Datum en tijd",
    notes: "Opmerking",
    confirm: "Reservering versturen",
    success: "Reservering succesvol verzonden",
    required: "Kies eerst beide adressen en bereken de ritprijs.",
    powered: "Mogelijk gemaakt door Google",
    writeReview: "Laat een beoordeling achter",
    rating: "Beoordeling",
    comment: "Jouw feedback",
    reviewName: "Jouw naam",
    sendReview: "Beoordeling plaatsen",
    reviewSuccess: "Bedankt voor je feedback!",
    language: "Taal",
  },

  fr: {
    calc: "Calculer le trajet",
    book: "Réserver maintenant",
    contact: "Contact",
    reviews: "Avis clients",
    badge: "Réservation simple, prix transparent",
    from: "Adresse de départ",
    to: "Destination",
    placeholder: "Saisissez une adresse ou un lieu...",
    calculate: "Calculer distance et prix",
    distance: "Distance",
    duration: "Durée estimée",
    price: "Prix estimé",
    booking: "Réservez votre trajet",
    name: "Nom",
    phone: "Téléphone",
    date: "Date et heure",
    notes: "Remarque",
    confirm: "Envoyer la réservation",
    success: "Réservation envoyée avec succès",
    required: "Sélectionnez les deux adresses et calculez le trajet.",
    powered: "Propulsé par Google",
    writeReview: "Laissez un avis",
    rating: "Note",
    comment: "Votre avis",
    reviewName: "Votre nom",
    sendReview: "Publier l'avis",
    reviewSuccess: "Merci pour votre avis !",
    language: "Langue",
  },

  en: {
    calc: "Calculate trip",
    book: "Book now",
    contact: "Contact",
    reviews: "Customer reviews",
    badge: "Easy booking, clear pricing",
    from: "Pickup address",
    to: "Destination",
    placeholder: "Type an address or place...",
    calculate: "Calculate distance and price",
    distance: "Distance",
    duration: "Estimated time",
    price: "Estimated price",
    booking: "Book your trip",
    name: "Name",
    phone: "Phone number",
    date: "Date & time",
    notes: "Notes",
    confirm: "Send booking",
    success: "Booking sent successfully",
    required: "Select both addresses and calculate the trip.",
    powered: "Powered by Google",
    writeReview: "Leave a review",
    rating: "Rating",
    comment: "Your feedback",
    reviewName: "Your name",
    sendReview: "Post review",
    reviewSuccess: "Thank you for your feedback!",
    language: "Language",
  },
};

export default function Home({ settings: s }: { settings: S }) {
  const [lang, setLang] = useState<Lang>("nl");

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");

  const [pp, setPp] = useState<P | null>(null);
  const [dp, setDp] = useState<P | null>(null);

  const [ps, setPs] = useState<P[]>([]);
  const [ds, setDs] = useState<P[]>([]);

  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [price, setPrice] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);

  const [reviewForm, setReviewForm] = useState({
    name: "",
    rating: 5,
    comment: "",
  });

  const [reviewMsg, setReviewMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    scheduled_at: "",
    notes: "",
  });

  const t = T[lang];
  const accent = s.accentColor || "#facc15";

  const pickupTimer = useRef<NodeJS.Timeout | null>(null);
  const destinationTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => {});
  }, []);

  function searchAddress(value: string, type: "pickup" | "destination") {
    if (type === "pickup") {
      setPickup(value);
      setPp(null);
    } else {
      setDestination(value);
      setDp(null);
    }

    const timer =
      type === "pickup" ? pickupTimer.current : destinationTimer.current;

    if (timer) {
      clearTimeout(timer);
    }

    const newTimer = setTimeout(async () => {
      if (value.trim().length < 2) {
        if (type === "pickup") {
          setPs([]);
        } else {
          setDs([]);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(value)}`
        );

        const data = await response.json();

        if (!response.ok) {
          setMsg(data.error || "Google Places error");
          return;
        }

        if (type === "pickup") {
          setPs(data.suggestions || []);
        } else {
          setDs(data.suggestions || []);
        }
      } catch {
        setMsg("Could not search for the address.");
      }
    }, 300);

    if (type === "pickup") {
      pickupTimer.current = newTimer;
    } else {
      destinationTimer.current = newTimer;
    }
  }

  async function calculate() {
    if (!pp || !dp) {
      setMsg(t.required);
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: pp.placeId,
          destination: dp.placeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Route calculation failed");
      }

      const calculatedDistance = Number(data.distanceKm || 0);
      const calculatedDuration = Number(data.durationMin || 0);

      setDistance(calculatedDistance);
      setDuration(calculatedDuration);

      const baseFare = Number(s.baseFare || 4);
      const perKm = Number(s.perKm || 1.4);
      const minFare = Number(s.minFare || 6);

      const calculatedPrice = Math.max(
        minFare,
        baseFare + calculatedDistance * perKm
      );

      setPrice(calculatedPrice);
    } catch (error: any) {
      setMsg(error.message || "Route error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (pp && dp) {
      calculate();
    }
  }, [pp, dp]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!pp || !dp || price === null) {
      setMsg(t.required);
      return;
    }

    if (!form.name.trim() || !form.phone.trim() || !form.scheduled_at) {
      setMsg(
        lang === "nl"
          ? "Vul naam, telefoonnummer en datum/tijd in."
          : lang === "fr"
          ? "Veuillez remplir le nom, le téléphone et la date/heure."
          : "Please fill in name, phone number and date/time."
      );
      return;
    }

    setSending(true);
    setMsg("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          pickup,
          destination,
          distance_km: distance,
          duration_min: duration,
          price,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Booking error");
      }

      setMsg(`${t.success} #${data.id}`);

      setForm({
        name: "",
        phone: "",
        scheduled_at: "",
        notes: "",
      });
    } catch (error: any) {
      setMsg(error.message || "Booking error");
    } finally {
      setSending(false);
    }
  }

  async function sendReview(e: React.FormEvent) {
    e.preventDefault();

    setReviewMsg("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setReviewMsg(data.error || "Could not save review");
        return;
      }

      setReviewMsg(t.reviewSuccess);

      setReviewForm({
        name: "",
        rating: 5,
        comment: "",
      });

      const reviewsResponse = await fetch("/api/reviews");
      const reviewsData = await reviewsResponse.json();

      setReviews(reviewsData.reviews || []);
    } catch {
      setReviewMsg("Could not save review");
    }
  }

  const hasContact = Boolean(
    s.phone || s.whatsapp || s.email || s.address
  );

  return (
    <main
      style={{ "--accent": accent } as React.CSSProperties}
      dir="ltr"
      className="min-h-screen bg-white text-gray-900"
    >
      <nav className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#" className="flex items-center gap-3">
            {s.logoUrl ? (
              <img
                src={s.logoUrl}
                className="h-10 w-10 rounded-xl object-cover"
                alt={s.siteName || "Logo"}
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-900 text-white">
                <CarFront size={22} />
              </div>
            )}

            <div>
              <b>{s.siteName}</b>

              {s.tagline && (
                <div className="text-xs text-gray-500">
                  {s.tagline}
                </div>
              )}
            </div>
          </a>

          <div className="hidden items-center gap-6 text-sm md:flex">
            <a href="#booking">{t.book}</a>

            {reviews.length > 0 && (
              <a href="#reviews">{t.reviews}</a>
            )}

            {hasContact && (
              <a href="#contact">{t.contact}</a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Globe2 size={16} />

            <select
              value={lang}
              onChange={(e) =>
                setLang(e.target.value as Lang)
              }
              className="rounded-xl border bg-white px-2 py-2 text-sm"
            >
              <option value="nl">Nederlands</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </nav>

      <section className="bg-gray-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              <ShieldCheck size={16} />
              {t.badge}
            </div>

            {s.heroTitle && (
              <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-6xl">
                {s.heroTitle}
              </h1>
            )}

            {s.heroText && (
              <p className="mt-5 max-w-xl text-lg leading-8 text-gray-300">
                {s.heroText}
              </p>
            )}
          </div>

          <div
            id="booking"
            className="rounded-[32px] bg-white p-5 text-gray-900 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-500">
                  {t.calc}
                </div>

                <h2 className="text-2xl font-black">
                  {t.booking}
                </h2>
              </div>

              <CarFront />
            </div>

            <Location
              label={t.from}
              value={pickup}
              suggestions={ps}
              placeholder={t.placeholder}
              onChange={(value) =>
                searchAddress(value, "pickup")
              }
              onPick={(place) => {
                setPp(place);
                setPickup(place.text);
                setPs([]);
              }}
            />

            <Location
              label={t.to}
              value={destination}
              suggestions={ds}
              placeholder={t.placeholder}
              onChange={(value) =>
                searchAddress(value, "destination")
              }
              onPick={(place) => {
                setDp(place);
                setDestination(place.text);
                setDs([]);
              }}
            />

            <div className="grid gap-3 md:grid-cols-3">
              <Info
                label={t.distance}
                value={
                  distance
                    ? `${distance.toFixed(1)} km`
                    : "—"
                }
              />

              <Info
                label={t.duration}
                value={
                  duration
                    ? `${Math.round(duration)} min`
                    : "—"
                }
              />

              <Info
                label={t.price}
                value={
                  price !== null
                    ? `${price.toFixed(2)} ${
                        s.currency || "€"
                      }`
                    : "—"
                }
              />
            </div>

            <button
              type="button"
              onClick={calculate}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 py-4 font-black text-white disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <MapPin size={18} />
              )}

              {t.calculate}
            </button>

            <form
              onSubmit={submit}
              className="mt-5 border-t pt-5"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label={t.name}
                  value={form.name}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      name: value,
                    })
                  }
                />

                <Field
                  label={t.phone}
                  value={form.phone}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      phone: value,
                    })
                  }
                />

                <Field
                  label={t.date}
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      scheduled_at: value,
                    })
                  }
                />

                <Field
                  label={t.notes}
                  value={form.notes}
                  required={false}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      notes: value,
                    })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 font-black text-gray-950 disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}

                {sending ? "..." : t.confirm}
              </button>
            </form>

            {msg && (
              <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-sm">
                {msg}
              </div>
            )}

            <div className="mt-3 text-center text-[10px] text-gray-400">
              {t.powered}
            </div>
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section
          id="reviews"
          className="mx-auto max-w-7xl px-5 py-16"
        >
          <div className="mb-8">
            <p className="font-bold text-yellow-600">
              {t.reviews}
            </p>

            <h2 className="mt-2 text-4xl font-black">
              {t.reviews}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-3xl bg-white p-6 shadow"
              >
                <div className="flex gap-1 text-yellow-500">
                  {Array.from(
                    { length: 5 },
                    (_, index) => (
                      <Star
                        key={index}
                        size={17}
                        fill={
                          index < review.rating
                            ? "currentColor"
                            : "none"
                        }
                      />
                    )
                  )}
                </div>

                <p className="mt-4 leading-7 text-gray-700">
                  “{review.comment}”
                </p>

                <div className="mt-5 font-black">
                  {review.customer_name}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="bg-gray-100">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="font-bold text-yellow-600">
                {t.writeReview}
              </p>

              <h2 className="mt-2 text-4xl font-black">
                {t.writeReview}
              </h2>
            </div>

            <form
              onSubmit={sendReview}
              className="rounded-3xl bg-white p-6 shadow"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={t.reviewName}
                  value={reviewForm.name}
                  onChange={(value) =>
                    setReviewForm({
                      ...reviewForm,
                      name: value,
                    })
                  }
                />

                <label>
                  <span className="mb-2 block text-sm font-bold">
                    {t.rating}
                  </span>

                  <select
                    value={reviewForm.rating}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        rating: Number(
                          e.target.value
                        ),
                      })
                    }
                    className="w-full rounded-2xl border bg-gray-50 px-4 py-3"
                  >
                    {[5, 4, 3, 2, 1].map((number) => (
                      <option
                        key={number}
                        value={number}
                      >
                        {"★".repeat(number)} ({number}/5)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold">
                  {t.comment}
                </span>

                <textarea
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      comment: e.target.value,
                    })
                  }
                  rows={5}
                  required
                  className="w-full rounded-2xl border bg-gray-50 px-4 py-3"
                />
              </label>

              <button
                type="submit"
                className="mt-4 flex items-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 font-bold text-white"
              >
                <Send size={17} />
                {t.sendReview}
              </button>

              {reviewMsg && (
                <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-sm">
                  {reviewMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {hasContact && (
        <section
          id="contact"
          className="mx-auto max-w-7xl px-5 py-14"
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {s.phone && (
              <Contact
                icon={<Phone />}
                title="Phone"
                text={s.phone}
                href={`tel:${s.phone}`}
              />
            )}

            {s.whatsapp && (
              <Contact
                icon={<MessageCircle />}
                title="WhatsApp"
                text={`+${String(s.whatsapp).replace(/\D/g, "")}`}
                href={`https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}`}
              />
            )}
            {s.email && (
              <Contact
                icon={<Send />}
                title="Email"
                text={s.email}
                href={`mailto:${s.email}`}
              />
            )}

            {s.address && (
              <Contact
                icon={<MapPin />}
                title="Address"
                text={s.address}
              />
            )}
          </div>
        </section>
      )}

      {(s.footerText || s.email) && (
        <footer className="bg-gray-950 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-9 text-sm text-gray-400">
            {s.footerText && (
              <span>{s.footerText}</span>
            )}

            {s.email && (
              <span>{s.email}</span>
            )}
          </div>
        </footer>
      )}
    </main>
  );
}

function Location({
  label,
  value,
  suggestions,
  placeholder,
  onChange,
  onPick,
}: {
  label: string;
  value: string;
  suggestions: P[];
  placeholder: string;
  onChange: (value: string) => void;
  onPick: (place: P) => void;
}) {
  return (
    <div className="relative mb-4">
      <label className="mb-2 block text-sm font-bold">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <MapPin
          size={18}
          className="text-gray-400"
        />

        <input
          className="w-full bg-transparent py-1 outline-none"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="absolute right-0 left-0 z-20 mt-2 overflow-hidden rounded-2xl border bg-white shadow-2xl">
          {suggestions.map((place) => (
            <button
              type="button"
              key={place.placeId}
              onClick={() => onPick(place)}
              className="flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-gray-50"
            >
              <MapPin
                size={17}
                className="mt-1 shrink-0 text-gray-400"
              />

              <span>
                <b className="block">
                  {place.text}
                </b>

                <small className="text-gray-500">
                  {place.secondary}
                </small>
              </span>
            </button>
          ))}

          <div className="px-4 py-2 text-[10px] text-gray-400">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>

      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none"
      />
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="text-xs text-gray-500">
        {label}
      </div>

      <div className="mt-1 font-black">
        {value}
      </div>
    </div>
  );
}

function Contact({
  icon,
  title,
  text,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-3xl bg-white p-6 shadow">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gray-100">
        {icon}
      </div>

      <div className="text-sm text-gray-500">
        {title}
      </div>

      <b>{text}</b>
    </div>
  );

  return href ? (
    <a href={href}>{content}</a>
  ) : (
    content
  );
}