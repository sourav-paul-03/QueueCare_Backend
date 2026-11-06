import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

describe('QueueCare Concurrency & State Machine Integration Tests', () => {
  let connection: mysql.Connection;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'queuecare',
    });
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  it('enforces double booking prevention via slot_lock unique constraint', async () => {
    const testDate = '2027-01-01 10:00:00.000';
    const doctorClinicId = 1;
    const patientId = 1;
    const userId = 1;

    // Clean up test slot if existing
    await connection.query(
      `DELETE FROM appointments WHERE doctor_clinic_id = ? AND start_at = ?`,
      [doctorClinicId, testDate],
    );

    // 1. First booking succeeds
    const [res1] = await connection.query<any>(
      `INSERT INTO appointments (doctor_clinic_id, patient_id, booked_by_user_id, start_at, end_at, status)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMED');`,
      [doctorClinicId, patientId, userId, testDate, '2027-01-01 10:15:00.000'],
    );
    expect(res1.insertId).toBeDefined();

    // 2. Second parallel booking on the same slot MUST fail with ER_DUP_ENTRY
    let errorCaught: any = null;
    try {
      await connection.query(
        `INSERT INTO appointments (doctor_clinic_id, patient_id, booked_by_user_id, start_at, end_at, status)
         VALUES (?, ?, ?, ?, ?, 'CONFIRMED');`,
        [doctorClinicId, patientId, userId, testDate, '2027-01-01 10:15:00.000'],
      );
    } catch (err) {
      errorCaught = err;
    }

    expect(errorCaught).not.toBeNull();
    expect(errorCaught.code).toBe('ER_DUP_ENTRY');

    // 3. Cancelling first appointment frees the slot lock (slot_lock becomes NULL)
    await connection.query(
      `UPDATE appointments SET status = 'CANCELLED' WHERE id = ?`,
      [res1.insertId],
    );

    // 4. Now booking the slot again succeeds!
    const [res3] = await connection.query<any>(
      `INSERT INTO appointments (doctor_clinic_id, patient_id, booked_by_user_id, start_at, end_at, status)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMED');`,
      [doctorClinicId, patientId, userId, testDate, '2027-01-01 10:15:00.000'],
    );
    expect(res3.insertId).toBeDefined();

    // Clean up
    await connection.query(
      `DELETE FROM appointments WHERE doctor_clinic_id = ? AND start_at = ?`,
      [doctorClinicId, testDate],
    );
  });

  it('guarantees atomic gap-free token issuance on queue_sessions', async () => {
    const queueDate = '2027-01-01';
    const doctorClinicId = 1;

    // Get or create session
    await connection.query(
      `INSERT INTO queue_sessions (doctor_clinic_id, queue_date, status, last_token_number, version)
       VALUES (?, ?, 'OPEN', 0, 1)
       ON DUPLICATE KEY UPDATE last_token_number = 0, version = 1;`,
      [doctorClinicId, queueDate],
    );

    const [sess] = await connection.query<any[]>(
      `SELECT id FROM queue_sessions WHERE doctor_clinic_id = ? AND queue_date = ?`,
      [doctorClinicId, queueDate],
    );
    const sessionId = sess[0].id;

    // Issue 5 consecutive tokens using atomic LAST_INSERT_ID counter
    const tokenNumbers: number[] = [];
    for (let i = 0; i < 5; i++) {
      await connection.query(
        `UPDATE queue_sessions
            SET last_token_number = LAST_INSERT_ID(last_token_number + 1),
                version = version + 1
          WHERE id = ?;`,
        [sessionId],
      );
      const [cnt] = await connection.query<any[]>(`SELECT LAST_INSERT_ID() AS token_number;`);
      tokenNumbers.push(cnt[0].token_number);
    }

    expect(tokenNumbers).toEqual([1, 2, 3, 4, 5]);

    // Clean up test session
    await connection.query(`DELETE FROM queue_sessions WHERE id = ?`, [sessionId]);
  });
});
