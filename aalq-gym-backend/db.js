const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  ssl: (process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost')
    ? { rejectUnauthorized: false }
    : undefined,
};

let pool;
let isMySqlAvailable = false;

// In-memory fallback store for Vercel/Cloud deployments when MySQL is unreachable
const memoryDb = {
  users: [],
  classes: [],
  bookings: [],
  inquiries: [],
  autoId: { users: 1, classes: 1, bookings: 1, inquiries: 1 }
};

async function initDB() {
  const dbName = process.env.DB_NAME || 'apex_gym_db';

  try {
    // 1. Try MySQL connection
    const initConn = await mysql.createConnection({
      ...dbConfig,
      database: undefined,
      connectTimeout: 3000
    });
    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await initConn.end();

    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: process.env.VERCEL ? 2 : 10,
      queueLimit: 0
    });

    await createTables();
    await seedData();
    isMySqlAvailable = true;
    console.log(`Successfully connected & initialized MySQL database: ${dbName}`);
  } catch (error) {
    console.warn(`MySQL connection unavailable (${error.message}). Switching to fail-safe database mode.`);
    isMySqlAvailable = false;
    await seedMemoryDb();
  }
}

async function createTables() {
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
}

async function seedData() {
  const [admins] = await pool.query('SELECT * FROM users WHERE role = "admin"');
  if (admins.length === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role, membership_status, membership_type) VALUES (?, ?, ?, ?, ?, ?)',
      ['Gym Admin', 'admin@apex.com', adminHash, 'admin', 'active', 'elite']
    );
  }

  const [users] = await pool.query('SELECT * FROM users WHERE email = "user@apex.com"');
  if (users.length === 0) {
    const userHash = await bcrypt.hash('user123', 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role, membership_status, membership_type) VALUES (?, ?, ?, ?, ?, ?)',
      ['John Doe', 'user@apex.com', userHash, 'user', 'active', 'premium']
    );
  }

  const [classes] = await pool.query('SELECT * FROM classes');
  if (classes.length === 0) {
    const defaultClasses = [
      ['Morning Yoga Flow', 'Sarah Jenkins', 'Monday 08:00 AM', '60 mins', 15, 'Yoga', 'Start your day with a peaceful yoga sequence.'],
      ['Power Weightlifting', 'Marcus Sterling', 'Tuesday 06:00 PM', '75 mins', 12, 'Strength', 'High-intensity powerlifting sessions focusing on squat, bench, and deadlift.'],
      ['Cardio Blast', 'Elena Rostova', 'Wednesday 10:00 AM', '45 mins', 25, 'Cardio', 'Fast-paced aerobic and anaerobic cardio training.'],
      ['HIIT Conditioning', 'David Webb', 'Thursday 07:00 PM', '50 mins', 20, 'HIIT', 'Tabata-style intervals combining bodyweight exercises and kettlebells.']
    ];

    for (const c of defaultClasses) {
      await pool.query(
        'INSERT INTO classes (name, instructor, time, duration, capacity, category, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c
      );
    }
  }
}

async function seedMemoryDb() {
  if (memoryDb.users.length === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    memoryDb.users.push(
      { id: memoryDb.autoId.users++, name: 'Gym Admin', email: 'admin@apex.com', password: adminHash, role: 'admin', membership_status: 'active', membership_type: 'elite', created_at: new Date().toISOString() },
      { id: memoryDb.autoId.users++, name: 'John Doe', email: 'user@apex.com', password: userHash, role: 'user', membership_status: 'active', membership_type: 'premium', created_at: new Date().toISOString() }
    );

    const defaultClasses = [
      ['Morning Yoga Flow', 'Sarah Jenkins', 'Monday 08:00 AM', '60 mins', 15, 'Yoga', 'Start your day with a peaceful yoga sequence.'],
      ['Power Weightlifting', 'Marcus Sterling', 'Tuesday 06:00 PM', '75 mins', 12, 'Strength', 'High-intensity powerlifting sessions.'],
      ['Cardio Blast', 'Elena Rostova', 'Wednesday 10:00 AM', '45 mins', 25, 'Cardio', 'Fast-paced aerobic cardio training.'],
      ['HIIT Conditioning', 'David Webb', 'Thursday 07:00 PM', '50 mins', 20, 'HIIT', 'Tabata-style intervals.']
    ];

    for (const c of defaultClasses) {
      memoryDb.classes.push({
        id: memoryDb.autoId.classes++,
        name: c[0],
        instructor: c[1],
        time: c[2],
        duration: c[3],
        capacity: c[4],
        booked_count: 0,
        category: c[5],
        description: c[6],
        created_at: new Date().toISOString()
      });
    }
  }
}

async function query(sql, params = []) {
  if (isMySqlAvailable && pool) {
    try {
      const [results] = await pool.query(sql, params);
      return results;
    } catch (err) {
      console.warn(`MySQL query failed (${err.message}). Falling back to memory store.`);
      isMySqlAvailable = false;
      await seedMemoryDb();
    }
  }

  // Handle in-memory query evaluation
  return handleMemoryQuery(sql, params);
}

function handleMemoryQuery(sql, params) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');
  const upperSql = cleanSql.toUpperCase();

  // 1. SELECT COUNT(*)
  if (upperSql.includes('COUNT(*)')) {
    if (upperSql.includes('FROM USERS WHERE ROLE = "USER"')) {
      const count = memoryDb.users.filter(u => u.role === 'user').length;
      return [{ count }];
    }
    if (upperSql.includes('FROM USERS WHERE MEMBERSHIP_STATUS = "ACTIVE"')) {
      const count = memoryDb.users.filter(u => u.membership_status === 'active' && u.role === 'user').length;
      return [{ count }];
    }
    if (upperSql.includes('FROM CLASSES')) {
      return [{ count: memoryDb.classes.length }];
    }
    if (upperSql.includes('FROM BOOKINGS')) {
      return [{ count: memoryDb.bookings.length }];
    }
    if (upperSql.includes('FROM INQUIRIES')) {
      const count = memoryDb.inquiries.filter(i => i.status === 'unread').length;
      return [{ count }];
    }
  }

  // 2. USERS Queries
  if (upperSql.includes('FROM USERS')) {
    if (upperSql.startsWith('SELECT * FROM USERS WHERE EMAIL = ?')) {
      return memoryDb.users.filter(u => u.email.toLowerCase() === (params[0] || '').toLowerCase());
    }
    if (upperSql.startsWith('SELECT * FROM USERS WHERE ROLE = "ADMIN"')) {
      return memoryDb.users.filter(u => u.role === 'admin');
    }
    if (upperSql.startsWith('SELECT ID, NAME, EMAIL, ROLE')) {
      if (upperSql.includes('WHERE ID = ?')) {
        return memoryDb.users.filter(u => u.id === Number(params[0]));
      }
      return [...memoryDb.users].reverse();
    }
    if (upperSql.startsWith('SELECT MEMBERSHIP_STATUS FROM USERS WHERE ID = ?')) {
      return memoryDb.users.filter(u => u.id === Number(params[0])).map(u => ({ membership_status: u.membership_status }));
    }
  }

  // 3. INSERT INTO USERS
  if (upperSql.startsWith('INSERT INTO USERS')) {
    const newUser = {
      id: memoryDb.autoId.users++,
      name: params[0],
      email: params[1],
      password: params[2],
      role: params[3] || 'user',
      membership_status: params[4] || 'inactive',
      membership_type: params[5] || 'none',
      created_at: new Date().toISOString()
    };
    memoryDb.users.push(newUser);
    return { insertId: newUser.id, affectedRows: 1 };
  }

  // 4. UPDATE USERS
  if (upperSql.startsWith('UPDATE USERS')) {
    if (upperSql.includes('SET MEMBERSHIP_STATUS = ?, MEMBERSHIP_TYPE = ? WHERE ID = ?')) {
      const user = memoryDb.users.find(u => u.id === Number(params[2]));
      if (user) {
        user.membership_status = params[0];
        user.membership_type = params[1];
      }
      return { affectedRows: user ? 1 : 0 };
    }
    if (upperSql.includes('SET ROLE = ? WHERE ID = ?')) {
      const user = memoryDb.users.find(u => u.id === Number(params[1]));
      if (user) {
        user.role = params[0];
      }
      return { affectedRows: user ? 1 : 0 };
    }
  }

  // 5. CLASSES Queries
  if (upperSql.includes('FROM CLASSES')) {
    if (upperSql.startsWith('SELECT * FROM CLASSES')) {
      return [...memoryDb.classes].reverse();
    }
    if (upperSql.startsWith('SELECT CAPACITY, BOOKED_COUNT FROM CLASSES WHERE ID = ?')) {
      return memoryDb.classes.filter(c => c.id === Number(params[0])).map(c => ({ capacity: c.capacity, booked_count: c.booked_count }));
    }
  }

  if (upperSql.startsWith('INSERT INTO CLASSES')) {
    const newClass = {
      id: memoryDb.autoId.classes++,
      name: params[0],
      instructor: params[1],
      time: params[2],
      duration: params[3],
      capacity: Number(params[4]),
      category: params[5],
      description: params[6],
      booked_count: 0,
      created_at: new Date().toISOString()
    };
    memoryDb.classes.push(newClass);
    return { insertId: newClass.id, affectedRows: 1 };
  }

  if (upperSql.startsWith('DELETE FROM CLASSES WHERE ID = ?')) {
    const idx = memoryDb.classes.findIndex(c => c.id === Number(params[0]));
    if (idx !== -1) memoryDb.classes.splice(idx, 1);
    return { affectedRows: idx !== -1 ? 1 : 0 };
  }

  if (upperSql.includes('UPDATE CLASSES SET BOOKED_COUNT')) {
    const cls = memoryDb.classes.find(c => c.id === Number(params[0]));
    if (cls) {
      if (upperSql.includes('BOOKED_COUNT + 1')) cls.booked_count += 1;
      if (upperSql.includes('BOOKED_COUNT - 1')) cls.booked_count = Math.max(0, cls.booked_count - 1);
    }
    return { affectedRows: cls ? 1 : 0 };
  }

  // 6. BOOKINGS Queries
  if (upperSql.includes('FROM BOOKINGS')) {
    if (upperSql.startsWith('SELECT * FROM BOOKINGS WHERE USER_ID = ? AND CLASS_ID = ?')) {
      return memoryDb.bookings.filter(b => b.user_id === Number(params[0]) && b.class_id === Number(params[1]));
    }
    if (upperSql.startsWith('SELECT * FROM BOOKINGS WHERE ID = ?')) {
      return memoryDb.bookings.filter(b => b.id === Number(params[0]));
    }
    if (upperSql.includes('SELECT B.ID, B.BOOKING_DATE')) {
      return memoryDb.bookings.map(b => {
        const u = memoryDb.users.find(x => x.id === b.user_id) || {};
        const c = memoryDb.classes.find(x => x.id === b.class_id) || {};
        return {
          id: b.id,
          user_id: b.user_id,
          class_id: b.class_id,
          booking_date: b.booking_date,
          user_name: u.name,
          user_email: u.email,
          class_name: c.name,
          instructor: c.instructor,
          class_time: c.time
        };
      }).filter(item => {
        if (upperSql.includes('WHERE B.USER_ID = ?')) return item.user_id === Number(params[0]);
        return true;
      });
    }
  }

  if (upperSql.startsWith('INSERT INTO BOOKINGS')) {
    const newBooking = {
      id: memoryDb.autoId.bookings++,
      user_id: Number(params[0]),
      class_id: Number(params[1]),
      booking_date: params[2],
      created_at: new Date().toISOString()
    };
    memoryDb.bookings.push(newBooking);
    return { insertId: newBooking.id, affectedRows: 1 };
  }

  if (upperSql.startsWith('DELETE FROM BOOKINGS WHERE ID = ?')) {
    const idx = memoryDb.bookings.findIndex(b => b.id === Number(params[0]));
    if (idx !== -1) memoryDb.bookings.splice(idx, 1);
    return { affectedRows: idx !== -1 ? 1 : 0 };
  }

  // 7. INQUIRIES Queries
  if (upperSql.includes('FROM INQUIRIES')) {
    if (upperSql.startsWith('SELECT * FROM INQUIRIES')) {
      return [...memoryDb.inquiries].reverse();
    }
  }

  if (upperSql.startsWith('INSERT INTO INQUIRIES')) {
    const newInquiry = {
      id: memoryDb.autoId.inquiries++,
      name: params[0],
      email: params[1],
      message: params[2],
      status: 'unread',
      created_at: new Date().toISOString()
    };
    memoryDb.inquiries.push(newInquiry);
    return { insertId: newInquiry.id, affectedRows: 1 };
  }

  return [];
}

module.exports = {
  initDB,
  query,
};
