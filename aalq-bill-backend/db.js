const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  ssl: (process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost')
    ? { rejectUnauthorized: false }
    : undefined,
};

const DB_NAME = process.env.DB_NAME || 'aalq_bill_db';
const dbFilePath = path.join(__dirname, 'database.json');
let pool;
let useJSONDb = false;

// Helpers for JSON-file-based database fallback
function readJSON() {
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify({
      users: [],
      bills: [],
      payments: [],
      notifications: [],
      categories: [
        { id: 1, name: "Electricity" },
        { id: 2, name: "Water" },
        { id: 3, name: "Gas" },
        { id: 4, name: "Internet" },
        { id: 5, name: "Mobile" },
        { id: 6, name: "Rent" },
        { id: 7, name: "EMI" },
        { id: 8, name: "Credit Card" },
        { id: 9, name: "Insurance" },
        { id: 10, name: "OTT" },
        { id: 11, name: "Education" },
        { id: 12, name: "Other" }
      ]
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
}

function writeJSON(data) {
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
}

// In-memory query simulation for JSON database
async function jsonQuery(sql, params = []) {
  const data = readJSON();
  const sqlClean = sql.replace(/\s+/g, ' ').trim();

  if (/^SELECT .* FROM categories/i.test(sqlClean)) {
    return data.categories;
  }
  if (/^SELECT COUNT\(\*\) as count FROM categories/i.test(sqlClean)) {
    return [{ count: data.categories.length }];
  }
  if (/^INSERT INTO categories/i.test(sqlClean)) {
    return { insertId: 0 };
  }
  if (/^SELECT .* FROM users WHERE email = \?/i.test(sqlClean)) {
    const email = params[0].toLowerCase();
    return data.users.filter(u => u.email === email);
  }
  if (/^SELECT .* FROM users WHERE id = \?/i.test(sqlClean)) {
    const id = Number(params[0]);
    return data.users.filter(u => u.id === id);
  }
  if (/^INSERT INTO users/i.test(sqlClean)) {
    const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const user = {
      id: newId,
      name: params[0],
      email: params[1],
      password: params[2],
      currency: 'INR',
      language: 'en',
      theme: 'dark',
      notifications_enabled: true,
      created_at: new Date().toISOString()
    };
    data.users.push(user);
    writeJSON(data);
    return { insertId: newId };
  }
  if (/^UPDATE users SET/i.test(sqlClean)) {
    const userId = Number(params[params.length - 1]);
    const user = data.users.find(u => u.id === userId);
    if (user) {
      const setPart = sqlClean.match(/SET (.*) WHERE/i)[1];
      const fields = setPart.split(',').map(f => f.split('=')[0].trim());
      fields.forEach((field, idx) => {
        user[field] = params[idx];
      });
      writeJSON(data);
    }
    return { affectedRows: 1 };
  }
  if (/^SELECT \* FROM bills WHERE user_id = \?/i.test(sqlClean)) {
    const userId = Number(params[0]);
    return data.bills.filter(b => b.user_id === userId);
  }
  if (/^SELECT \* FROM bills WHERE id = \? AND user_id = \?/i.test(sqlClean)) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    return data.bills.filter(b => b.id === id && b.user_id === userId);
  }
  if (/^SELECT \* FROM bills WHERE id = \?/i.test(sqlClean)) {
    const id = Number(params[0]);
    return data.bills.filter(b => b.id === id);
  }
  if (/^INSERT INTO bills/i.test(sqlClean)) {
    const newId = data.bills.length > 0 ? Math.max(...data.bills.map(b => b.id)) + 1 : 1;
    const bill = {
      id: newId,
      user_id: Number(params[0]),
      name: params[1],
      amount: Number(params[2]),
      category_id: Number(params[3]),
      due_date: params[4],
      recurrence: params[5],
      status: params[6],
      description: params[7],
      created_at: new Date().toISOString()
    };
    data.bills.push(bill);
    writeJSON(data);
    return { insertId: newId };
  }
  if (/^UPDATE bills SET status = "Overdue" WHERE id = \?/i.test(sqlClean)) {
    const id = Number(params[0]);
    const bill = data.bills.find(b => b.id === id);
    if (bill) {
      bill.status = 'Overdue';
      writeJSON(data);
    }
    return { affectedRows: 1 };
  }
  if (/^UPDATE bills SET/i.test(sqlClean)) {
    const billId = Number(params[params.length - 1]);
    const bill = data.bills.find(b => b.id === billId);
    if (bill) {
      const setPart = sqlClean.match(/SET (.*) WHERE/i)[1];
      const fields = setPart.split(',').map(f => f.split('=')[0].trim());
      fields.forEach((field, idx) => {
        bill[field] = params[idx];
      });
      writeJSON(data);
    }
    return { affectedRows: 1 };
  }
  if (/^DELETE FROM bills WHERE id = \? AND user_id = \?/i.test(sqlClean)) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const initialLen = data.bills.length;
    data.bills = data.bills.filter(b => !(b.id === id && b.user_id === userId));
    writeJSON(data);
    return { affectedRows: initialLen - data.bills.length };
  }
  if (/^INSERT INTO payments/i.test(sqlClean)) {
    const newId = data.payments.length > 0 ? Math.max(...data.payments.map(p => p.id)) + 1 : 1;
    const p = {
      id: newId,
      bill_id: Number(params[0]),
      user_id: Number(params[1]),
      amount: Number(params[2]),
      payment_date: params[3],
      method: params[4],
      created_at: new Date().toISOString()
    };
    data.payments.push(p);
    writeJSON(data);
    return { insertId: newId };
  }
  if (/^SELECT p\.\*, b\.name as bill_name/i.test(sqlClean)) {
    const userId = Number(params[0]);
    const userPayments = data.payments.filter(p => p.user_id === userId);
    return userPayments.map(p => {
      const bill = data.bills.find(b => b.id === p.bill_id);
      return {
        ...p,
        bill_name: bill ? bill.name : 'Unknown Bill'
      };
    });
  }
  if (/^SELECT amount FROM payments WHERE user_id = \?/i.test(sqlClean)) {
    const userId = Number(params[0]);
    return data.payments.filter(p => p.user_id === userId).map(p => ({ amount: p.amount }));
  }
  if (/^SELECT amount, payment_date FROM payments WHERE user_id = \?/i.test(sqlClean)) {
    const userId = Number(params[0]);
    return data.payments.filter(p => p.user_id === userId).map(p => ({ amount: p.amount, payment_date: p.payment_date }));
  }
  if (/^SELECT \* FROM notifications WHERE user_id = \?/i.test(sqlClean)) {
    const userId = Number(params[0]);
    return data.notifications.filter(n => n.user_id === userId);
  }
  if (/^SELECT id FROM notifications WHERE user_id = \? AND bill_id = \? AND type = \?/i.test(sqlClean)) {
    const userId = Number(params[0]);
    const billId = Number(params[1]);
    const type = params[2];
    return data.notifications.filter(n => n.user_id === userId && n.bill_id === billId && n.type === type).map(n => ({ id: n.id }));
  }
  if (/^INSERT INTO notifications/i.test(sqlClean)) {
    const newId = data.notifications.length > 0 ? Math.max(...data.notifications.map(n => n.id)) + 1 : 1;
    const n = {
      id: newId,
      user_id: Number(params[0]),
      bill_id: Number(params[1]),
      message: params[2],
      type: params[3],
      is_read: params[4] === true || params[4] === 1 || params[4] === 'true',
      created_at: new Date().toISOString()
    };
    data.notifications.push(n);
    writeJSON(data);
    return { insertId: newId };
  }
  if (/^UPDATE notifications SET is_read = TRUE WHERE id = \? AND user_id = \?/i.test(sqlClean)) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const notif = data.notifications.find(n => n.id === id && n.user_id === userId);
    if (notif) {
      notif.is_read = true;
      writeJSON(data);
    }
    return { affectedRows: 1 };
  }
  if (/^UPDATE notifications SET is_read = TRUE WHERE user_id = \?/i.test(sqlClean)) {
    const userId = Number(params[0]);
    data.notifications.filter(n => n.user_id === userId).forEach(n => {
      n.is_read = true;
    });
    writeJSON(data);
    return { affectedRows: 1 };
  }

  console.warn("UNHANDLED SQL QUERY FALLBACK:", sqlClean, params);
  return [];
}

async function initDB() {
  try {
    // Try to connect to MySQL first
    console.log("Connecting to MySQL Database...");
    const connection = await mysql.createConnection(dbConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connection.end();

    pool = mysql.createPool({
      ...dbConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`Connected to MySQL database: ${DB_NAME}`);
    await createTables();
    await seedCategories();

  } catch (error) {
    console.warn('MySQL unavailable. Falling back to local JSON database (database.json). Error:', error.message);
    useJSONDb = true;
    // Verify JSON file exists
    readJSON();
  }
}

async function createTables() {
  if (useJSONDb) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      language VARCHAR(10) DEFAULT 'en',
      theme VARCHAR(20) DEFAULT 'dark',
      notifications_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      category_id INT NOT NULL,
      due_date DATE NOT NULL,
      recurrence VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'Unpaid',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bill_id INT NOT NULL,
      user_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_date DATE NOT NULL,
      method VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bill_id INT NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );
  `);

  console.log('MySQL tables verified/created successfully.');
}

async function seedCategories() {
  if (useJSONDb) return;
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM categories');
  if (rows[0].count === 0) {
    const defaultCats = [
      'Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 
      'Rent', 'EMI', 'Credit Card', 'Insurance', 'OTT', 
      'Education', 'Other'
    ];
    for (const cat of defaultCats) {
      await pool.query('INSERT INTO categories (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name', [cat]);
    }
    console.log('Seeded default categories.');
  }
}

async function query(sql, params) {
  if (useJSONDb) {
    return jsonQuery(sql, params);
  }
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB first.');
  }
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = {
  initDB,
  query,
};
