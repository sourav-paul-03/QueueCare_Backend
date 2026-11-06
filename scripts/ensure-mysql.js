const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MYSQL_HOST = process.env.DB_HOST || '127.0.0.1';
const MYSQL_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const MYSQLD_EXE = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe';
const DATA_DIR = 'D:\\QueueCare\\mysql_data';

function checkConnection(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function main() {
  const isRunning = await checkConnection(MYSQL_HOST, MYSQL_PORT);
  if (isRunning) {
    console.log(`✅ [MySQL Check] Database is already running and ready on ${MYSQL_HOST}:${MYSQL_PORT}`);
    return;
  }

  console.log(`⏳ [MySQL Check] MySQL is not running on port ${MYSQL_PORT}. Starting MySQL Server 8.4 in background...`);

  if (!fs.existsSync(MYSQLD_EXE)) {
    console.warn(`⚠️ [MySQL Check] mysqld executable not found at: ${MYSQLD_EXE}`);
    console.warn('Please ensure MySQL 8.4 is installed or start your MySQL service.');
    return;
  }

  // Spawn detached process
  const child = spawn(
    MYSQLD_EXE,
    [`--datadir=${DATA_DIR}`, `--port=${MYSQL_PORT}`, '--console'],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }
  );
  child.unref();

  // Poll until ready
  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const ready = await checkConnection(MYSQL_HOST, MYSQL_PORT);
    if (ready) {
      console.log(`🚀 [MySQL Check] MySQL Server 8.4 started successfully and is ready on port ${MYSQL_PORT}!`);
      return;
    }
  }

  console.warn('⚠️ [MySQL Check] MySQL was triggered but did not respond within 15 seconds. Please check logs.');
}

main().catch((err) => {
  console.error('Error ensuring MySQL is running:', err);
});
