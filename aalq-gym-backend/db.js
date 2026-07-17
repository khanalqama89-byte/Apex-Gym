const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

let pool;

async function initDB() {
  try {
    const dbName = process.env.DB_NAME || 'apex_gym_db';

    // Skip database creation check on Aiven/Production cloud DBs to prevent permission errors
    if (process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost') {
      console.log('Cloud database environment detected, connecting directly to pool...');
    } else {
      // 1. Connect without database to check/create it (only for local development)
      const tempConnection = await mysql.createConnection(dbConfig);
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await tempConnection.end();
    }

    // 2. Create the final connection pool with the database specified
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`Connected to MySQL database: ${dbName}`);

    // 3. Create Tables
    await createTables();

    // 4. Seed Data
    await seedData();

  } catch (error) {
    console.error('Error initializing MySQL database:', error);
    process.exit(1);
  }
}

async function createTables() {
  // Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      membership_status VARCHAR(20) DEFAULT 'inactive',
      membership_type VARCHAR(50) DEFAULT 'none',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Classes Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      instructor VARCHAR(100) NOT NULL,
      time VARCHAR(50) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      capacity INT DEFAULT 20,
      booked_count INT DEFAULT 0,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bookings Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      class_id INT NOT NULL,
      booking_date VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
  `);

  // Inquiries Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'unread',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables verified/created successfully.');
}

async function seedData() {
  // Seed Admin if not exists
  const [admins] = await pool.query('SELECT * FROM users WHERE role = "admin"');
  if (admins.length === 0) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role, membership_status, membership_type) VALUES (?, ?, ?, ?, ?, ?)',
      ['Gym Admin', 'admin@apex.com', adminPasswordHash, 'admin', 'active', 'elite']
    );
    console.log('Seeded default Admin User (admin@apex.com / admin123)');
  }

  // Seed standard User if not exists
  const [users] = await pool.query('SELECT * FROM users WHERE email = "user@apex.com"');
  if (users.length === 0) {
    const userPasswordHash = await bcrypt.hash('user123', 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role, membership_status, membership_type) VALUES (?, ?, ?, ?, ?, ?)',
      ['John Doe', 'user@apex.com', userPasswordHash, 'user', 'active', 'premium']
    );
    console.log('Seeded default test User (user@apex.com / user123)');
  }

  // Seed default Classes if empty
  const [classes] = await pool.query('SELECT * FROM classes');
  if (classes.length === 0) {
    const defaultClasses = [
      ['Morning Yoga Flow', 'Sarah Jenkins', 'Monday 08:00 AM', '60 mins', 15, 'Yoga', 'Start your day with a peaceful yoga sequence designed to improve flexibility and mindfulness.'],
      ['Power Weightlifting', 'Marcus Sterling', 'Tuesday 06:00 PM', '75 mins', 12, 'Strength', 'High-intensity powerlifting sessions focusing on squat, bench, and deadlift techniques.'],
      ['Cardio Blast', 'Elena Rostova', 'Wednesday 10:00 AM', '45 mins', 25, 'Cardio', 'Fast-paced aerobic and anaerobic cardio training to boost your stamina and burn calories.'],
      ['HIIT Conditioning', 'David Webb', 'Thursday 07:00 PM', '50 mins', 20, 'HIIT', 'Tabata-style intervals combining bodyweight exercises, kettlebell swings, and high-intensity moves.']
    ];

    for (const c of defaultClasses) {
      await pool.query(
        'INSERT INTO classes (name, instructor, time, duration, capacity, category, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c
      );
    }
    console.log('Seeded default gym classes.');
  }
}

async function query(sql, params) {
  if (!pool) {
    throw new Error('Database connection pool not initialized. Call initDB first.');
  }
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = {
  initDB,
  query,
};
