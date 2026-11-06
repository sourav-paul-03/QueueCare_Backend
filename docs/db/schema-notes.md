# QueueCare Schema Notes & Invariants

This file specifies constraints, invariants, concurrency rules, and trigger logic that DBML cannot express directly.

## 1. Concurrency & Locking
- **Lock Ordering:** Every transaction touching multiple entities MUST acquire locks strictly in this order:
  `queue_sessions` -> `appointments` -> `queue_tokens`. Never reverse order (guarantees deadlock freedom).
- **Double-Booking Guard:** `appointments.slot_lock` is a generated virtual column defined as:
  ```sql
  slot_lock TINYINT GENERATED ALWAYS AS (
    CASE WHEN status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS') THEN 1 ELSE NULL END
  ) STORED
  ```
  The unique key `uq_active_slot (doctor_clinic_id, start_at, slot_lock)` allows multiple cancelled or no-show appointments for the same slot while preventing concurrent or overlapping active bookings.
- **Atomic Token Counter:**
  ```sql
  UPDATE queue_sessions
     SET last_token_number = LAST_INSERT_ID(last_token_number + 1),
         version = version + 1
   WHERE id = ?;
  SELECT LAST_INSERT_ID() AS token_number;
  ```
- **Optimistic Concurrency on Session:**
  When calling `call-next` or modifying queue session state, pass the client's observed `version`. If `version` does not match, return HTTP 409 Conflict.

## 2. Integrity & Deletion Rules
- **No Hard Deletes:** All foreign keys specify `ON DELETE RESTRICT`. Users, appointments, tokens, and events are never hard-deleted.
- **Append-Only History:**
  - `appointment_status_history` is append-only.
  - `queue_events` is append-only.
  No `UPDATE` or `DELETE` statements are ever permitted on these tables.
- **User Identity Check:**
  Users must provide at least one valid identity (`phone` OR `email`).

## 3. Queue State Machine Synchronizations
- When `queue_tokens` transitions to:
  - `WAITING` -> `appointments.status` becomes `CHECKED_IN`
  - `IN_CONSULTATION` -> `appointments.status` becomes `IN_PROGRESS`
  - `COMPLETED` -> `appointments.status` becomes `COMPLETED`
  - `NO_SHOW` -> `appointments.status` becomes `NO_SHOW`
  - `CANCELLED` -> `appointments.status` becomes `CANCELLED`
