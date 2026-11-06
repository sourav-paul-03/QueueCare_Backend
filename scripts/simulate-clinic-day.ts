import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function simulateClinicDays() {
  console.log('🚀 [QueueCare Simulator] Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'queuecare',
  });

  try {
    const doctorClinicId = 1;
    const tokenPrefix = 'A';

    // Verify patient and doctor clinic exist
    const [patientRows] = await connection.query<any[]>(`SELECT id, user_id FROM patients LIMIT 1`);
    if (patientRows.length === 0) {
      console.error('No patients found. Run seed script first.');
      return;
    }
    const patientId = patientRows[0].id;
    const bookerUserId = patientRows[0].user_id;

    console.log('⏳ Generating 30 days of realistic clinic operations history...');

    const today = new Date();

    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().slice(0, 10);

      // Skip Fridays (weekend in BD clinic schedule)
      if (date.getDay() === 5) continue;

      // 1. Create or get session
      await connection.query(
        `INSERT INTO queue_sessions (doctor_clinic_id, queue_date, status, last_token_number, version)
         VALUES (?, ?, 'CLOSED', 0, 1)
         ON DUPLICATE KEY UPDATE status = 'CLOSED';`,
        [doctorClinicId, dateStr],
      );

      const [sessRows] = await connection.query<any[]>(
        `SELECT id FROM queue_sessions WHERE doctor_clinic_id = ? AND queue_date = ?`,
        [doctorClinicId, dateStr],
      );
      const sessionId = sessRows[0].id;

      // Reset tokens for clean simulation if already run
      await connection.query(`DELETE FROM queue_events WHERE queue_token_id IN (SELECT id FROM queue_tokens WHERE queue_session_id = ?)`, [sessionId]);
      await connection.query(`DELETE FROM queue_tokens WHERE queue_session_id = ?`, [sessionId]);

      // Simulate 25 to 35 patients per day
      const patientCount = 28 + Math.floor(Math.random() * 7);
      let sessionClock = new Date(`${dateStr}T09:00:00Z`).getTime();

      let completedCount = 0;
      let cancelledCount = 0;
      let noShowCount = 0;
      let totalWaitSeconds = 0;
      let totalConsultSeconds = 0;

      for (let i = 1; i <= patientCount; i++) {
        const isWalkIn = i % 3 === 0;
        const isEmergency = i === 7 || i === 18;
        const priority = isEmergency ? 10 : 0;

        const checkInTime = new Date(sessionClock);
        const consultDurationMinutes = 10 + Math.floor(Math.random() * 8); // 10-17 mins
        const waitDurationMinutes = 5 + Math.floor(Math.random() * 20); // 5-25 mins

        const calledTime = new Date(checkInTime.getTime() + waitDurationMinutes * 60 * 1000);
        const startedTime = new Date(calledTime.getTime() + 1 * 60 * 1000);
        const completedTime = new Date(startedTime.getTime() + consultDurationMinutes * 60 * 1000);

        // Random outcomes: 85% completed, 10% no-show, 5% cancelled
        const rand = Math.random();
        let status = 'COMPLETED';
        if (rand < 0.05) {
          status = 'CANCELLED';
          cancelledCount++;
        } else if (rand < 0.15) {
          status = 'NO_SHOW';
          noShowCount++;
        } else {
          status = 'COMPLETED';
          completedCount++;
          totalWaitSeconds += waitDurationMinutes * 60;
          totalConsultSeconds += consultDurationMinutes * 60;
        }

        // Insert token
        const [tokRes] = await connection.query<any>(
          `INSERT INTO queue_tokens (queue_session_id, token_number, token_prefix, priority, effective_time, status, is_walk_in, checked_in_at, called_at, started_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            sessionId,
            i,
            tokenPrefix,
            priority,
            checkInTime,
            status,
            isWalkIn,
            checkInTime,
            status !== 'CANCELLED' ? calledTime : null,
            status === 'COMPLETED' ? startedTime : null,
            status === 'COMPLETED' ? completedTime : null,
          ],
        );
        const tokenId = tokRes.insertId;

        // Write sequential events
        await connection.query(
          `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
           VALUES (?, NULL, 'BOOKED', 'CREATED', ?)`,
          [tokenId, checkInTime],
        );
        await connection.query(
          `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
           VALUES (?, 'BOOKED', 'WAITING', 'CHECKED_IN', ?)`,
          [tokenId, checkInTime],
        );

        if (status === 'COMPLETED') {
          await connection.query(
            `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
             VALUES (?, 'WAITING', 'CALLED', 'CALLED', ?)`,
            [tokenId, calledTime],
          );
          await connection.query(
            `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
             VALUES (?, 'CALLED', 'IN_CONSULTATION', 'STARTED', ?)`,
            [tokenId, startedTime],
          );
          await connection.query(
            `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
             VALUES (?, 'IN_CONSULTATION', 'COMPLETED', 'COMPLETED', ?)`,
            [tokenId, completedTime],
          );
        } else if (status === 'NO_SHOW') {
          await connection.query(
            `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
             VALUES (?, 'WAITING', 'NO_SHOW', 'NO_SHOW', ?)`,
            [tokenId, calledTime],
          );
        } else if (status === 'CANCELLED') {
          await connection.query(
            `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type, created_at)
             VALUES (?, 'WAITING', 'CANCELLED', 'CANCELLED', ?)`,
            [tokenId, checkInTime],
          );
        }

        sessionClock = completedTime.getTime() + 2 * 60 * 1000;
      }

      // Update session last token and version
      await connection.query(
        `UPDATE queue_sessions SET last_token_number = ?, version = ? WHERE id = ?`,
        [patientCount, patientCount * 3, sessionId],
      );

      // Write daily summary stats
      const avgWait = completedCount > 0 ? (totalWaitSeconds / completedCount / 60).toFixed(2) : '0.00';
      const avgConsult = completedCount > 0 ? (totalConsultSeconds / completedCount / 60).toFixed(2) : '0.00';

      await connection.query(
        `INSERT INTO daily_doctor_stats (doctor_clinic_id, stat_date, total_tokens, completed_count, cancelled_count, no_show_count, avg_wait_minutes, avg_consult_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           total_tokens = VALUES(total_tokens),
           completed_count = VALUES(completed_count),
           cancelled_count = VALUES(cancelled_count),
           no_show_count = VALUES(no_show_count),
           avg_wait_minutes = VALUES(avg_wait_minutes),
           avg_consult_minutes = VALUES(avg_consult_minutes);`,
        [doctorClinicId, dateStr, patientCount, completedCount, cancelledCount, noShowCount, avgWait, avgConsult],
      );
    }

    console.log('🎉 [QueueCare Simulator] 30 Days of realistic clinic data simulated successfully!');
  } catch (err) {
    console.error('❌ Simulation error:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

simulateClinicDays();
