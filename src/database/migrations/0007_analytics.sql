-- Migration 0007: Analytics, Daily Doctor Stats, and Hourly Load Stats

CREATE TABLE IF NOT EXISTS daily_doctor_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_clinic_id BIGINT NOT NULL,
  stat_date DATE NOT NULL,
  total_tokens INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  cancelled_count INT NOT NULL DEFAULT 0,
  no_show_count INT NOT NULL DEFAULT 0,
  avg_wait_minutes DECIMAL(5,2) DEFAULT 0.00,
  avg_consult_minutes DECIMAL(5,2) DEFAULT 0.00,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_doctor_stat_date (doctor_clinic_id, stat_date),
  CONSTRAINT fk_daily_stats_doc_clinic FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hourly_load_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_clinic_id BIGINT NOT NULL,
  stat_date DATE NOT NULL,
  hour_of_day SMALLINT NOT NULL,
  check_in_count INT NOT NULL DEFAULT 0,
  called_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_hourly_stat (doctor_clinic_id, stat_date, hour_of_day),
  CONSTRAINT fk_hourly_stats_doc_clinic FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
