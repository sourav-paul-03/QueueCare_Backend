# 🏥 QueueCare Backend Engine

QueueCare is a high-concurrency, real-time healthcare queue management and appointment booking engine built with **NestJS**, **MySQL 8.4 LTS**, **TypeORM**, and **Socket.IO**.

---

## 🏗️ Architecture & Core Features

- **Strict Schema Contract:** Designed according to DBML schema contract in `docs/db/queuecare.dbml`.
- **Deadlock-Free Lock Ordering:** Every multi-entity transaction follows strict hierarchy: `queue_sessions` ➔ `appointments` ➔ `queue_tokens`.
- **Double-Booking Prevention:** Guaranteed by MySQL generated virtual column `slot_lock` and unique index `uq_active_slot (doctor_clinic_id, start_at, slot_lock)`.
- **Atomic Gap-Free Token Counter:** Uses `UPDATE queue_sessions SET last_token_number = LAST_INSERT_ID(last_token_number + 1), version = version + 1 WHERE id = ?; SELECT LAST_INSERT_ID();`.
- **Optimistic Concurrency Control:** `callNext` verifies client version against session version to prevent race conditions.
- **Append-Only Audit & Events:** `queue_events` and `appointment_status_history` are strictly append-only.
- **Real-Time WebSocket Gateway:** Powered by `@nestjs/platform-socket.io` and Socket.IO for doctor consoles, patient live views, and TV waiting room displays.
- **Dynamic Wait-Time Estimator:** Heuristic engine estimating wait times dynamically based on doctor consult velocity and priority queue depth.

---

## 📦 Tech Stack & Packages

- **Node.js:** `v22.15.0+`
- **Framework:** NestJS `v11.0.11`
- **Database:** MySQL `8.4 LTS` (Native SQL Migrations 0001–0007)
- **ORM:** TypeORM `v0.3.21` with `mysql2` `v3.12.0`
- **Real-Time Gateway:** Socket.IO `v4.8.1` (`@nestjs/platform-socket.io`)
- **Authentication & Security:** `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`
- **Validation:** `class-validator`, `class-transformer`
- **Testing:** Jest `v29.7.0`

---

## 🚀 Quick Start

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```env
PORT=4000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=queuecare
JWT_SECRET=queuecare_super_secret_jwt_key_2026_dev_mode
CORS_ORIGIN=http://localhost:3000
```

### 2. Run Migrations & Seed
```bash
# Execute native SQL migrations (0001 through 0007)
npm run migrate

# Seed specialties, demo clinic, doctor, and accounts
npm run seed
```

### 3. Run Realistic 30-Day Clinic Simulator
```bash
npm run simulate
```

### 4. Run Concurrency & State Machine Tests
```bash
npm test
```

### 5. Start Development Server
```bash
npm run start:dev
```
API runs on `http://localhost:4000/api/v1`
Health check: `http://localhost:4000/api/v1/health`

---

## 🔑 Demo Credentials
- **Password for all accounts:** `QueueCare123!`
  - `admin@queuecare.com` (SUPER_ADMIN)
  - `clinicadmin@queuecare.com` (CLINIC_ADMIN)
  - `doctor@queuecare.com` (DOCTOR - Dr. Sarah Ahmed, Cardiology)
  - `patient@queuecare.com` (PATIENT - Rahim Chowdhury)

---

## 📡 Key API Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - Password login
- `POST /api/v1/auth/otp/request` - Request OTP code
- `POST /api/v1/auth/otp/verify` - Verify OTP and login
- `POST /api/v1/auth/refresh` - Rotate refresh token
- `GET  /api/v1/search/doctors` - Keyword, specialty, and geolocation distance search
- `GET  /api/v1/schedules/slots?doctorClinicId=1&date=YYYY-MM-DD` - Dynamic slot generator
- `POST /api/v1/appointments/book` - Atomic booking with concurrency slot lock
- `POST /api/v1/appointments/:id/cancel` - Cancel appointment & release slot
- `GET  /api/v1/queue/state/:doctorClinicId` - Current queue session state
- `POST /api/v1/queue/check-in` - Check in booked patient
- `POST /api/v1/queue/walk-in` - Direct walk-in check-in
- `POST /api/v1/queue/call-next` - Call next patient (optimistic lock protected)
- `POST /api/v1/queue/start` - Start consultation
- `POST /api/v1/queue/complete` - Complete consultation
- `POST /api/v1/queue/skip` - Skip patient
- `POST /api/v1/queue/reinstate` - Reinstate skipped patient
- `GET  /api/v1/wait-time/token/:tokenId` - Get dynamic estimated wait time
- `POST /api/v1/reviews` - Submit review (completed appointments only)
- `GET  /api/v1/analytics/clinic/:clinicId` - Clinic executive dashboard stats
