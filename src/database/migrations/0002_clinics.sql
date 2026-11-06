-- Migration 0002: Clinics, Memberships, Doctor Clinics, Holidays, Audit Logs

CREATE TABLE IF NOT EXISTS clinics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Dhaka',
  phone VARCHAR(30),
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_clinics_city (city),
  INDEX idx_clinics_lat_lng (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clinic_memberships (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  clinic_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_clinic_user (clinic_id, user_id),
  CONSTRAINT fk_memberships_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT,
  CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_clinics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_id BIGINT NOT NULL,
  clinic_id BIGINT NOT NULL,
  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  token_prefix VARCHAR(10) DEFAULT 'A',
  room_number VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_doctor_clinic (doctor_id, clinic_id),
  CONSTRAINT fk_doc_clinics_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_doc_clinics_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clinic_holidays (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  clinic_id BIGINT NOT NULL,
  holiday_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_clinic_holiday (clinic_id, holiday_date),
  CONSTRAINT fk_holidays_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,
  clinic_id BIGINT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  ip_address VARCHAR(45),
  metadata JSON,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_clinic (clinic_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
