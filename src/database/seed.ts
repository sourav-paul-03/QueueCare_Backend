import * as mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('🌱 [QueueCare Seeder] Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'queuecare',
  });

  try {
    const passwordHash = await bcrypt.hash('QueueCare123!', 10);

    // 1. Specialties
    const specialties = [
      ['Cardiology', 'Heart and cardiovascular care'],
      ['Dermatology', 'Skin, hair, and nail health'],
      ['Pediatrics', 'Children and infant care'],
      ['General Medicine', 'General diagnosis and primary care'],
      ['Orthopedics', 'Bones and joint disorders'],
      ['Neurology', 'Brain and nervous system'],
      ['Gynecology & Obstetrics', 'Women health and maternity'],
      ['ENT (Otolaryngology)', 'Ear, nose, and throat treatment'],
      ['Ophthalmology', 'Eye and vision diagnostics'],
      ['Psychiatry', 'Mental wellness and psychiatry'],
    ];

    for (const [name, desc] of specialties) {
      await connection.query(
        `INSERT INTO specialties (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [name, desc],
      );
    }
    console.log('✅ Specialties seeded');

    // 2. Super Admin User
    await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'SUPER_ADMIN', true)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)`,
      ['System Administrator', 'admin@queuecare.com', '+8801700000001', passwordHash],
    );

    // 3. Clinic Admin User
    await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'CLINIC_ADMIN', true)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)`,
      ['Apex Care Admin', 'clinicadmin@queuecare.com', '+8801700000002', passwordHash],
    );

    // 4. Doctor User
    await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'DOCTOR', true)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)`,
      ['Dr. Sarah Ahmed, MD', 'doctor@queuecare.com', '+8801700000003', passwordHash],
    );
    const [docUserRows] = await connection.query<any[]>(`SELECT id FROM users WHERE email = 'doctor@queuecare.com'`);
    const docUserId = docUserRows[0].id;

    // Doctor Profile
    await connection.query(
      `INSERT INTO doctors (user_id, license_number, bio, experience_years, consultation_fee)
       VALUES (?, 'BMDC-DOC-89421', 'Senior Interventional Cardiologist with 12+ years of clinical excellence.', 12, 1200.00)
       ON DUPLICATE KEY UPDATE license_number = VALUES(license_number), consultation_fee = VALUES(consultation_fee)`,
      [docUserId],
    );
    const [docRows] = await connection.query<any[]>(`SELECT id FROM doctors WHERE user_id = ?`, [docUserId]);
    const doctorId = docRows[0].id;

    const [cardioRows] = await connection.query<any[]>(`SELECT id FROM specialties WHERE name = 'Cardiology'`);
    if (cardioRows.length > 0) {
      await connection.query(
        `INSERT IGNORE INTO doctor_specialties (doctor_id, specialty_id, is_primary) VALUES (?, ?, true)`,
        [doctorId, cardioRows[0].id],
      );
    }

    // 5. Patient User
    await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'PATIENT', true)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)`,
      ['Rahim Chowdhury', 'patient@queuecare.com', '+8801700000004', passwordHash],
    );
    const [patientUserRows] = await connection.query<any[]>(`SELECT id FROM users WHERE email = 'patient@queuecare.com'`);
    const patientUserId = patientUserRows[0].id;

    await connection.query(
      `INSERT INTO patients (user_id, dob, gender, blood_group, emergency_contact, address)
       VALUES (?, '1992-05-14', 'Male', 'O+', '+8801799999999', 'House 42, Road 11, Dhanmondi, Dhaka')
       ON DUPLICATE KEY UPDATE gender = VALUES(gender), blood_group = VALUES(blood_group)`,
      [patientUserId],
    );

    // 6. Clinics
    await connection.query(
      `INSERT INTO clinics (id, name, address, city, latitude, longitude, timezone, phone, email, is_active)
       VALUES (1, 'Square Medical Complex', '18/F Bir Uttam Qazi Nuruzzaman Sarak, Panthapath', 'Dhaka', 23.75330000, 90.38710000, 'Asia/Dhaka', '+88028144400', 'care@squarehospital.com', true)
       ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address)`,
    );

    await connection.query(
      `INSERT INTO clinics (id, name, address, city, latitude, longitude, timezone, phone, email, is_active)
       VALUES (2, 'Evercare Health Hub', 'Plot 81, Block E, Bashundhara R/A', 'Dhaka', 23.80950000, 90.43120000, 'Asia/Dhaka', '+88028431661', 'info@evercare.com', true)
       ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address)`,
    );

    // 7. Clinic Membership for Clinic Admin
    const [clinicAdminRows] = await connection.query<any[]>(`SELECT id FROM users WHERE email = 'clinicadmin@queuecare.com'`);
    if (clinicAdminRows.length > 0) {
      await connection.query(
        `INSERT INTO clinic_memberships (clinic_id, user_id, role, is_active)
         VALUES (1, ?, 'CLINIC_ADMIN', true)
         ON DUPLICATE KEY UPDATE role = VALUES(role)`,
        [clinicAdminRows[0].id],
      );
    }

    // 8. Doctor Clinic Affiliation
    await connection.query(
      `INSERT INTO doctor_clinics (id, doctor_id, clinic_id, consultation_fee, token_prefix, room_number, is_active)
       VALUES (1, ?, 1, 1200.00, 'A', 'Room 304', true)
       ON DUPLICATE KEY UPDATE consultation_fee = VALUES(consultation_fee), room_number = VALUES(room_number)`,
      [doctorId],
    );

    // 9. Doctor Schedules (Sunday to Thursday in BD, days 0, 1, 2, 3, 4)
    for (let day = 0; day <= 4; day++) {
      await connection.query(
        `INSERT INTO doctor_schedules (doctor_clinic_id, day_of_week, start_time, end_time, slot_duration, max_patients, is_active)
         VALUES (1, ?, '09:00:00', '17:00:00', 15, 30, true)
         ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time)`,
        [day],
      );
    }

    console.log('🎉 [QueueCare Seeder] Core seed data injected successfully!');
    console.log('Default credentials for all seeded demo accounts:');
    console.log('Password: QueueCare123!');
    console.log('- admin@queuecare.com (SUPER_ADMIN)');
    console.log('- clinicadmin@queuecare.com (CLINIC_ADMIN)');
    console.log('- doctor@queuecare.com (DOCTOR)');
    console.log('- patient@queuecare.com (PATIENT)');
  } catch (error) {
    console.error('❌ Seeder error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
