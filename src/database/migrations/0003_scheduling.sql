-- Migration 0003: Doctor Schedules, Breaks, Exceptions

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_clinic_id BIGINT NOT NULL,
  day_of_week SMALLINT NOT NULL, -- 0 (Sunday) to 6 (Saturday)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INT NOT NULL DEFAULT 15, -- in minutes
  max_patients INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_schedules_doc_clinic FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE RESTRICT,
  INDEX idx_schedule_lookup (doctor_clinic_id, day_of_week, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_breaks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_schedule_id BIGINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description VARCHAR(100),
  CONSTRAINT fk_breaks_schedule FOREIGN KEY (doctor_schedule_id) REFERENCES doctor_schedules(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_clinic_id BIGINT NOT NULL,
  exception_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  reason VARCHAR(255),
  CONSTRAINT fk_exceptions_doc_clinic FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE RESTRICT,
  INDEX idx_exception_lookup (doctor_clinic_id, exception_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
