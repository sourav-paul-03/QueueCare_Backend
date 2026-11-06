-- Migration 0005: Queue Sessions, Tokens, Event Log, and Wait Estimates

CREATE TABLE IF NOT EXISTS queue_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_clinic_id BIGINT NOT NULL,
  queue_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, PAUSED, CLOSED
  last_token_number INT NOT NULL DEFAULT 0,
  current_token_id BIGINT,
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_session_date (doctor_clinic_id, queue_date),
  CONSTRAINT fk_sessions_doc_clinic FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queue_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  queue_session_id BIGINT NOT NULL,
  appointment_id BIGINT,
  token_number INT NOT NULL,
  token_prefix VARCHAR(10) DEFAULT 'A',
  priority INT NOT NULL DEFAULT 0, -- Higher number = higher priority (e.g. 10 for emergency)
  effective_time DATETIME(3),
  status VARCHAR(30) NOT NULL DEFAULT 'BOOKED', -- BOOKED, WAITING, CALLED, IN_CONSULTATION, COMPLETED, SKIPPED, NO_SHOW, CANCELLED
  is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at DATETIME(3),
  called_at DATETIME(3),
  started_at DATETIME(3),
  completed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_session_token (queue_session_id, token_number),
  CONSTRAINT fk_tokens_session FOREIGN KEY (queue_session_id) REFERENCES queue_sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tokens_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  INDEX idx_token_status (queue_session_id, status, priority, effective_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queue_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  queue_token_id BIGINT NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  event_type VARCHAR(30) NOT NULL, -- CREATED, CHECKED_IN, CALLED, RECALLED, STARTED, COMPLETED, SKIPPED, REINSTATED, NO_SHOW, CANCELLED
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_events_token FOREIGN KEY (queue_token_id) REFERENCES queue_tokens(id) ON DELETE RESTRICT,
  INDEX idx_events_token (queue_token_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wait_estimate_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  queue_token_id BIGINT NOT NULL,
  estimated_wait_minutes INT NOT NULL,
  actual_wait_minutes INT,
  model_type VARCHAR(20) NOT NULL DEFAULT 'HEURISTIC',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_wait_logs_token FOREIGN KEY (queue_token_id) REFERENCES queue_tokens(id) ON DELETE RESTRICT,
  INDEX idx_wait_logs_token (queue_token_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
