# BookMyDiagno

A diagnostic test booking website. Patients can browse tests, find a nearby branch, book a slot and pay (demo online payment or pay at the branch). Staff run everything from an admin panel.

**Stack:** Next.js 16 (App Router) · TypeScript · MongoDB Atlas + Mongoose · Next.js Route Handlers · JWT session in an httpOnly cookie (`jose`) · `bcryptjs` · plain CSS · Vercel

---

## Features

**Public website**
- Home page with search, popular tests and packages, nearby branches, "How booking works", home collection info, About, FAQ, Contact and Privacy pages
- Test catalogue: search by name or code, filter by category or type, a detail page for each test, add to booking. Prices are shown in INR
- Branches: address, phone, opening hours, services, "Book at this branch" and "Get directions" (Google Maps)
- Nearby branches: location is requested only when the patient clicks **Use my location**. Branches are sorted by distance in km and the nearest is labelled. If the patient refuses, PIN code, city and name search still work. **Coordinates are never stored.**

**Patients**
- Register with name, phone, password and confirm password. Login, show/hide password and logout
- Phone numbers are validated and must be unique, and passwords are hashed with bcrypt (12 rounds). **No OTP**: the site states clearly that the phone number is not verified
- Booking wizard: tests → login → branch → date and time (live slot availability) → patient details → price breakdown → payment option
- Dashboard: upcoming, previous and cancelled bookings, full history, profile, and booking details with a printable receipt
- Cancellation is allowed up to `CANCELLATION_CUTOFF_HOURS` before the appointment. If the booking was already paid, it becomes *Refund pending*

**Demo payments (Razorpay-style)**
- Every screen shows "Demo Payment — No Real Money Charged". The site never asks for card details
- The server creates each payment attempt with its own reference and the amount it calculated
- Success, failure and cancellation can be simulated. A success is signed with an HMAC on the server and verified before the booking is marked paid. The browser's word is never trusted
- Each booking can be charged once at most, even after a double-click, a retry, or an online payment and a counter payment arriving at the same moment

**Admin panel** (`/admin`)
- Dashboard: every figure is calculated from MongoDB (see "Revenue definitions" below)
- Bookings: search by reference, name or phone; filter by date, branch, status, payment status or source; view details; change status (only allowed transitions); cancel with a reason; add internal notes; print the receipt; export CSV
- Walk-in (offline) bookings: find a registered patient or enter walk-in details, choose branch, tests and slot, and mark the booking as pending or paid with the actual method (cash, UPI, card or other)
- Record counter payments and refunds. Only admins can mark pay-at-branch bookings as paid
- Branches: add, edit, activate or deactivate. Deactivated branches are hidden from the public site but keep their history. New branches appear on the website immediately
- Tests and packages: add, edit, change prices, activate or deactivate, mark as popular. **Price changes never affect existing bookings** because each booking stores the price it was made at
- Patients: search, see booking history and contact details. Password hashes are never sent to the browser
- Reports: filter by date range or branch, see figures per branch and per day, and download CSV

## Revenue definitions

| Figure | Meaning |
|---|---|
| **Total booking value** | Sum of `totalAmount` for all bookings **except cancelled** |
| **Payments collected (net)** | Successful payments (demo online + recorded at counter) **minus refunds paid** |
| **Pending payments** | Amount still due on non-cancelled bookings. **Not revenue** |
| **Refunds due** | Money received on bookings that were later cancelled and has not been refunded yet |

Payment status (`PENDING / PAID / FAILED / REFUND_PENDING / REFUNDED`) is tracked separately from appointment status (`BOOKED → CONFIRMED → SAMPLE_COLLECTED → COMPLETED`, or `CANCELLED / NO_SHOW`).

## How data integrity is protected

- **Prices and totals** are always recalculated on the server from the database. Any total the browser sends is ignored
- **Slot capacity**: each booking claims a numbered seat (`0…capacity-1`) in its slot, protected by a unique index. Simultaneous bookings therefore cannot overfill a slot, and this does not depend on MongoDB transactions. Cancelling releases the seat
- **Double payments**: an idempotency key (`charge:<bookingId>`, protected by a unique index) means a booking can be charged only once, whether online or at the counter
- **Ownership**: every patient query filters by the logged-in patient's id. Another patient's booking returns 404
- **Auth**: httpOnly, SameSite=Lax session cookie, `Secure` in production. The user is reloaded from the database on every request, so deactivating an account takes effect immediately. All admin routes check the role on the server. Mutating requests from other origins are rejected (CSRF protection)
- **No admin self-registration**: admins can only be created with `npm run create-admin`

---

## Run locally

Requirements: Node.js 20.9 or newer, and a MongoDB database (a free Atlas cluster works fine).

```bash
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run create-admin            # creates the admin from ADMIN_* in .env.local
npm run seed:demo-tests         # OPTIONAL: starter tests with placeholder prices
npm run dev                     # http://localhost:3000
```

1. Admin panel: http://localhost:3000/admin/login
2. Go to **Branches → Add branch** and enter at least one real branch.

The code never seeds branches, because addresses and coordinates must be real.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas connection string including the database name, e.g. `…mongodb.net/bookmydiagno?retryWrites=true&w=majority` |
| `AUTH_SECRET` | ✅ | At least 32 random characters. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_NAME`, `ADMIN_PHONE`, `ADMIN_PASSWORD` | for `create-admin` only | Used by the setup script, never by the website. Remove `ADMIN_PASSWORD` after use |
| `CANCELLATION_CUTOFF_HOURS` | optional (2) | How long before the appointment patients can still cancel online |
| `PAY_AT_BRANCH_ENABLED` | optional (true) | Show the "Pay at branch" option |
| `BOOKING_WINDOW_DAYS` | optional (30) | How many days ahead patients can book |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public site URL, e.g. `https://bookmydiagno.vercel.app` |
| `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL` | optional | Shown in the footer and on the Contact page |

Secrets (`MONGODB_URI`, `AUTH_SECRET`) must **never** have the `NEXT_PUBLIC_` prefix, because that would send them to the browser.

---

## Deploy: MongoDB Atlas + Vercel

### 1. Create the Atlas database
1. Sign in at https://cloud.mongodb.com and create a project named **BookMyDiagno**.
2. Click **Create** → choose **M0 (Free)** or a paid tier. For Indian users, pick the region **Mumbai (ap-south-1)**.
3. Name the cluster (e.g. `bookmydiagno`) and create it.

### 2. Configure access securely
1. **Database Access → Add New Database User**. Choose password authentication and generate a strong password. Give the user the role **Read and write to any database**. You can restrict it to the `bookmydiagno` database under *Specific Privileges*.
2. **Network Access → Add IP Address**. Vercel's serverless functions don't have fixed IP addresses, so you need **`0.0.0.0/0`** (allow from anywhere). Access is still protected by the database username and password. Atlas also offers Vercel integration and private endpoints on paid tiers.
3. Go to **Database → Connect → Drivers** and copy the connection string. Replace `<password>` and add the database name before the `?`:
   `mongodb+srv://bmd_app:<password>@cluster0.xxxxx.mongodb.net/bookmydiagno?retryWrites=true&w=majority`
   If the password contains special characters, URL-encode it.

### 3. Push the code to GitHub
```bash
git remote add origin https://github.com/Abhivorn-Technologies/bookmydiagno.git
git push -u origin main
```

### 4. Connect the repository to Vercel
1. Go to https://vercel.com/new and **import** the GitHub repository. You may need to grant the Vercel GitHub app access to the organisation.
2. The framework preset is detected as **Next.js**. Keep the default build command (`next build`) and output settings.

### 5. Set environment variables in Vercel
Open **Project → Settings → Environment Variables** and add `MONGODB_URI`, `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL`, plus any optional variables. Enable them for **Production** (and Preview if you want). Use a **separate database** (e.g. `bookmydiagno_staging`) for Preview, so test bookings don't mix with real ones.

After changing variables, redeploy: **Deployments → … → Redeploy**.

### 6. Deploy
Click **Deploy**. Every push to `main` deploys again automatically.

### 7. Create the first admin securely
Run this **from your own computer**, not on Vercel, pointing at the production database:
```bash
MONGODB_URI='mongodb+srv://…/bookmydiagno?…' \
ADMIN_NAME='Clinic Admin' ADMIN_PHONE=9XXXXXXXXX ADMIN_PASSWORD='a-strong-password-1' \
npm run create-admin
```
Running it again with the same phone resets that admin's password. Then clear the password from your shell history.

### 8. Test the production database connection
- Open `https://<your-domain>/api/tests`. It should return `{"ok":true,"data":{"tests":[…]}}`
- Log in at `/admin/login`. If it fails, open **Vercel → Project → Logs** and look for `MongoServerSelectionError`, which usually means the IP access list or connection string is wrong
- In Atlas, open **Collections**. The `users` collection should contain your admin

### 9. Verify booking and payment after deploying
1. **Admin:** add a real branch (with coordinates) and at least one test, then check that both appear on the public site.
2. **Patient:** register on a phone or in an incognito window, book a test with **Pay online**, click **Simulate failed payment**, then **Try paying again → Simulate successful payment**. The booking should show *Paid*.
3. Book again with **Pay at branch**. Back in the admin panel, open that booking → **Record payment received**. The dashboard's *Payments collected* should increase by that amount.
4. Cancel the paid booking as the patient. The admin should see it as *Refund pending*. Record the refund.
5. Check that the dashboard totals match these actions.

### Automated acceptance check (optional)
`scripts/acceptance.mjs` runs 62 end-to-end checks against a running server: registration, login and logout, branch search and nearby sorting, booking, slot capacity under concurrent requests, all three demo payment outcomes, double-payment protection, patient privacy, offline bookings and payments, refunds, status rules, price snapshots, dashboard totals, CSV export and branch deactivation.

It **creates test records**, so point it at a local or staging database only:
```bash
npm run build && npm start   # in one terminal
BASE_URL=http://localhost:3000 ADMIN_PHONE=… ADMIN_PASSWORD=… npm run acceptance
```
Unit tests: `npm test`.

---

## Project structure
```
src/
  app/
    (site)/            public website, booking flow, patient dashboard
    admin/login/       staff sign-in
    admin/(panel)/     protected admin pages
    api/               route handlers (auth, tests, branches, bookings, payments, admin/*)
  components/          UI (admin/ for admin-only components)
  lib/                 mongodb, auth, booking, payments, stats, validation, time (IST), geo
  models/              User, Branch, DiagnosticTest, Appointment, Payment, SlotSeat, OnceLock
  types/
scripts/               create-admin, seed-demo-tests, acceptance
tests/                 unit tests (vitest)
```

## Not included in this version (outside the ₹10,000 scope)
- **OTP phone verification.** `phoneVerified` exists on the model, so an SMS provider (e.g. MSG91) can be added later
- **Real Razorpay integration.** Replace `mockGatewayCapture` in `src/lib/payments.ts` with Razorpay Orders and webhook signature verification. Refunds would then go through the Razorpay API instead of being recorded manually
- **Uploading and delivering test reports**, and SMS, WhatsApp or email notifications
- **Separate receptionist role.** All staff currently use admin accounts
- **Rescheduling.** Patients cancel and book again
- **Per-branch pricing and test availability.** All active tests are offered at every branch
- **Forgot-password flow.** Needs OTP/SMS to be secure, so it ships together with OTP verification
