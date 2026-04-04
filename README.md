# 🌙 Chandrastamam Indicator v2

A Vedic astrology web app: enter phone + DOB + birth time → get Rasi, Nakshatra & Chandrastamam dates → receive SMS alerts. Includes a full Google-authenticated admin dashboard.

---

## Features

| Feature | Details |
|---|---|
| User form | Phone, Name, Date of Birth, Birth Time |
| Vedic chart | Rasi, Nakshatra, Pada, Moon degree (Lahiri ayanamsa) |
| Chandrastamam dates | 3 months ahead, automatically calculated |
| SMS alert | Sends personalised schedule via Twilio |
| Firebase DB | All users saved to Firestore |
| Admin login | Google Sign-In (Gmail only) |
| Admin panel | View users · Send SMS to all · Promote/remove admins |

---

## Project Structure

```
chandrastamam/
├── frontend/                  ← React + Vite (deploy to Vercel)
│   ├── src/
│   │   ├── App.jsx            Router (/ and /admin)
│   │   ├── UserPage.jsx       User form + results + SMS
│   │   ├── AdminPage.jsx      Admin dashboard
│   │   ├── firebase.js        Firebase config + DB helpers
│   │   ├── vedic.js           Vedic astrology calculations
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   └── package.json
│
├── backend/                   ← Node.js + Express (deploy to Render)
│   ├── server.js              /api/send-sms + /api/send-sms-bulk
│   ├── package.json
│   └── .env.example
│
├── firestore.rules            Firestore security rules
└── README.md
```

---

## Setup (Step by Step)

### 1. Firebase Project

1. Go to https://console.firebase.google.com → Create project
2. **Firestore**: Build → Firestore Database → Create (test mode)
3. **Google Auth**: Build → Authentication → Sign-in method → Google → Enable
4. **Web config**: Project Settings → Your apps → Add Web app → copy the config object

### 2. Configure Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
npm install
npm run dev
```

**.env.local** values to fill in:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_SUPER_ADMIN_EMAIL=yourgmail@gmail.com   ← you get instant super-admin access
VITE_API_URL=http://localhost:3001
```

### 3. Twilio SMS

1. Sign up at https://twilio.com (free trial ~$15 credit)
2. Get: Account SID, Auth Token, phone number
3. Free trial: verify recipient numbers at Twilio console → Verified Caller IDs

### 4. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with Twilio credentials
npm install
npm run dev     # runs on :3001
```

---

## Deployment (All Free)

### Frontend → Vercel

1. Push to GitHub
2. vercel.com → New Project → Import repo → Root Dir: `frontend`
3. Add all `.env.local` variables in Vercel's Environment Variables
4. Deploy

### Backend → Render

1. render.com → New Web Service → Root Dir: `backend`
2. Build: `npm install` | Start: `npm start`
3. Add env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
4. Deploy → copy your Render URL
5. Update `VITE_API_URL` in Vercel to your Render URL and redeploy frontend

---

## Admin System

- **Super Admin**: the Gmail in `VITE_SUPER_ADMIN_EMAIL` — works instantly, no DB needed
- **Other Admins**: Super admin promotes via Admin panel → Admins tab
- **URL**: go to `/admin` → Sign in with Google

### Admin can:
- View all registered users in a table
- Send personalised SMS to every user at once
- Promote any Gmail address to admin
- Remove admin privileges from promoted admins

---

## Firestore Security Rules

Edit `firestore.rules`: replace `${YOUR_SUPER_ADMIN_EMAIL}` with your Gmail, then:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

---

## Astrology Notes

- Vedic (Sidereal) zodiac with Lahiri ayanamsa
- Moon moves 13.176°/day — birth time shifts Nakshatra by up to 13°
- Chandrastamam = Moon in 8th Rasi from Janma Rasi (~2.3 days each occurrence)
- Calculations from J2000.0 epoch (simplified orbital mechanics)

---

## Tech Stack

| Layer | Tech | Free Hosting |
|---|---|---|
| Frontend | React 18 + Vite | Vercel |
| Backend | Node.js + Express | Render |
| Database | Firebase Firestore | Firebase Spark |
| Auth | Firebase Google OAuth | Firebase Spark |
| SMS | Twilio | Free trial |
