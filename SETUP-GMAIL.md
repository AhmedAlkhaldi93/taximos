# Gmail setup

This version uses standard Nodemailer SMTP with Gmail.

## 1. Create/use a Gmail account
Use the Gmail address that should receive new bookings and send customer confirmations.

## 2. Enable 2-Step Verification
In the Google Account security settings, enable 2-Step Verification.

## 3. Create an App Password
Create a Google App Password for this website and copy the 16-character value. Do not use your normal Gmail password.

## 4. Configure `.env`
Copy `.env.example` to `.env` and set:

```env
BOOKING_EMAIL=yourgmail@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
```

Gmail documents `smtp.gmail.com` with port 587 and STARTTLS for SMTP.

## 5. Database
Set `DATABASE_URL` to your PostgreSQL/Neon connection string. The application automatically creates/migrates the required booking columns, including customer email and stops.

## 6. Stops
The booking form supports up to 5 intermediate stops in this exact order:

Pickup → Stop 1 → Stop 2 → Stop 3 → Stop 4 → Stop 5 → Destination

The selected stops are sent to Google Routes as `intermediates`, stored with the booking, displayed in the admin dashboard, and included in booking emails.
