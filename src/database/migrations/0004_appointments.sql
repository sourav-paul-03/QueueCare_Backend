-- Migration 0004: Appointments, Concurrency Slot Lock, Status History, and Reviews

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_clinic_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  booked_by_user_id BIGINT NOT NULL,
  start_at DATETIME(3) NOT NULL,
  end_at DATETIME(3) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(100) UNIQUE,
  slot_lock TINYINT GENERATED ALWAYS AS (
    CASE WHEN status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS') THEN 1 ELSE NULL END
  ) STORED,
  notes TEXT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_appointments_doc_clinic FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_booker FOREIGN KEY (booked_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_active_slot (doctor_clinic_id, start_at, slot_lock),
  INDEX idx_appointments_lookup (doctor_clinic_id, start_at, status),
  INDEX idx_appointments_patient (patient_id, start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  changed_by_user_id BIGINT,
  reason VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hist_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_hist_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_hist_appointment (appointment_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT NOT NULL UNIQUE,
  rating SMALLINT NOT NULL,
  comment TEXT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
