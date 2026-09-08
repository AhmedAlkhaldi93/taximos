# Taxi Booking Platform v4

- Nederlands default + Français + English.
- Google Places Autocomplete + Routes.
- Booking dashboard with statuses and revenue based only on completed rides.
- Customer reviews with rating, moderation and deletion.
- New booking email notifications via SMTP.
- Optional contact elements are omitted when their settings are empty.

## Environment
Copy `.env.example` to `.env.local` and configure Google, admin, and SMTP values.
For Gmail, use an App Password for `SMTP_PASSWORD`.

## Run
npm install
npm run dev

Admin: /admin


## Stops / tussenstops
- The booking form places stops visually between pickup and destination.
- Up to 5 stops can be added.
- Each stop must be selected from Google Places suggestions.
- The route is calculated in the exact order: pickup -> stop 1 -> stop 2 -> ... -> destination.
- Distance, duration and estimated price are recalculated after a stop is selected or removed.
