const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'aalq_secret_key_12984712';

app.use(cors());
app.use(express.json());

// Middleware: Authenticate User
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

// Helper: Seed initial bills for new users to demonstrate features
async function seedUserBills(userId) {
  try {
    const categories = await db.query('SELECT id, name FROM categories');
    const getCatId = (name) => categories.find(c => c.name === name)?.id || 12; // Other

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Bill 1: Electricity (Due in 2 days - Upcoming)
    const dueUpcoming = new Date();
    dueUpcoming.setDate(now.getDate() + 2);
    await db.query(
      'INSERT INTO bills (user_id, name, amount, category_id, due_date, recurrence, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, 'Electricity Bill', 1500.00, getCatId('Electricity'), dueUpcoming.toISOString().split('T')[0], 'Monthly', 'Unpaid', 'Monthly home electricity']
    );

    // Bill 2: Rent (Due 5 days ago - Overdue)
    const dueOverdue = new Date();
    dueOverdue.setDate(now.getDate() - 5);
    const overdueRes = await db.query(
      'INSERT INTO bills (user_id, name, amount, category_id, due_date, recurrence, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, 'House Rent', 12000.00, getCatId('Rent'), dueOverdue.toISOString().split('T')[0], 'Monthly', 'Overdue', 'Apartment rent']
    );
    const overdueId = overdueRes.insertId;

    // Bill 3: Internet (Paid today)
    const paidRes = await db.query(
      'INSERT INTO bills (user_id, name, amount, category_id, due_date, recurrence, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, 'Broadband Internet', 999.00, getCatId('Internet'), dateStr, 'Monthly', 'Paid', 'High-speed broadband']
    );
    const paidId = paidRes.insertId;

    // Insert payment for paid bill
    await db.query(
      'INSERT INTO payments (bill_id, user_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?)',
      [paidId, userId, 999.00, dateStr, 'UPI']
    );

    // Create overdue notification
    await db.query(
      'INSERT INTO notifications (user_id, bill_id, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
      [userId, overdueId, `House Rent bill of ₹12,000 is Overdue!`, 'Overdue', false]
    );

  } catch (err) {
    console.error('Error seeding user bills:', err);
  }
}

// Generate notifications based on due dates
async function runNotificationEngine(userId) {
  try {
    const bills = await db.query('SELECT id, name, amount, due_date, status FROM bills WHERE user_id = ? AND status != "Paid"', [userId]);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const bill of bills) {
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let type = '';
      let message = '';

      if (diffDays === 0) {
        type = 'Due Today';
        message = `Your bill "${bill.name}" of ₹${bill.amount} is due today!`;
      } else if (diffDays === 1) {
        type = 'Upcoming';
        message = `Your bill "${bill.name}" of ₹${bill.amount} is due tomorrow!`;
      } else if (diffDays === 3) {
        type = 'Upcoming';
        message = `Your bill "${bill.name}" of ₹${bill.amount} is due in 3 days.`;
      } else if (diffDays === 7) {
        type = 'Upcoming';
        message = `Your bill "${bill.name}" of ₹${bill.amount} is due in 7 days.`;
      } else if (diffDays < 0) {
        type = 'Overdue';
        message = `Your bill "${bill.name}" of ₹${bill.amount} is overdue by ${Math.abs(diffDays)} days!`;
      }

      if (type) {
        // Prevent duplication
        const existing = await db.query(
          'SELECT id FROM notifications WHERE user_id = ? AND bill_id = ? AND type = ?',
          [userId, bill.id, type]
        );
        if (existing.length === 0) {
          await db.query(
            'INSERT INTO notifications (user_id, bill_id, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
            [userId, bill.id, message, type, false]
          );
        }
      }
    }
  } catch (err) {
    console.error('Error running notification engine:', err);
  }
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email.toLowerCase(), hashedPassword]
    );

    const userId = result.insertId;
    await seedUserBills(userId);

    const token = jwt.sign({ id: userId, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: userId, name, email: email.toLowerCase() }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  try {
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = users[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    await runNotificationEngine(user.id);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        currency: user.currency,
        language: user.language,
        theme: user.theme
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const users = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No user registered with this email.' });
    }
    res.json({ message: 'OTP sent to your registered email address.', otpCode: '123456' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (otp !== '123456') {
    return res.status(400).json({ error: 'Invalid OTP code.' });
  }

  try {
    const users = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, users[0].id]);
    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, email, currency, language, theme, notifications_enabled, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, currency, language, theme, notifications_enabled } = req.body;
  try {
    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (currency !== undefined) { fields.push('currency = ?'); values.push(currency); }
    if (language !== undefined) { fields.push('language = ?'); values.push(language); }
    if (theme !== undefined) { fields.push('theme = ?'); values.push(theme); }
    if (notifications_enabled !== undefined) { fields.push('notifications_enabled = ?'); values.push(notifications_enabled); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(req.user.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    
    const users = await db.query('SELECT id, name, email, currency, language, theme, notifications_enabled, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BILLS ROUTES
// ==========================================

app.get('/api/bills', authenticateToken, async (req, res) => {
  try {
    const bills = await db.query('SELECT * FROM bills WHERE user_id = ?', [req.user.id]);
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills', authenticateToken, async (req, res) => {
  const { name, amount, category_id, due_date, recurrence, status, description } = req.body;
  if (!name || !amount || !category_id || !due_date || !recurrence) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO bills (user_id, name, amount, category_id, due_date, recurrence, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, Number(amount), Number(category_id), due_date, recurrence, status || 'Unpaid', description || '']
    );

    const billId = result.insertId;

    if (status === 'Paid') {
      await db.query(
        'INSERT INTO payments (bill_id, user_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?)',
        [billId, req.user.id, Number(amount), due_date, 'UPI']
      );
    }

    await runNotificationEngine(req.user.id);
    const newBill = await db.query('SELECT * FROM bills WHERE id = ?', [billId]);
    res.status(201).json(newBill[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bills/:id', authenticateToken, async (req, res) => {
  const { name, amount, category_id, due_date, recurrence, status, description, payment_method } = req.body;
  try {
    const bills = await db.query('SELECT * FROM bills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const bill = bills[0];
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (amount !== undefined) { fields.push('amount = ?'); values.push(Number(amount)); }
    if (category_id !== undefined) { fields.push('category_id = ?'); values.push(Number(category_id)); }
    if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
    if (recurrence !== undefined) { fields.push('recurrence = ?'); values.push(recurrence); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }

    if (fields.length > 0) {
      values.push(req.params.id);
      await db.query(`UPDATE bills SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (status === 'Paid' && bill.status !== 'Paid') {
      await db.query(
        'INSERT INTO payments (bill_id, user_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?)',
        [bill.id, req.user.id, Number(amount || bill.amount), new Date().toISOString().split('T')[0], payment_method || 'UPI']
      );
    }

    await runNotificationEngine(req.user.id);
    const updated = await db.query('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bills/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM bills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Bill not found.' });
    res.json({ message: 'Bill deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const bills = await db.query('SELECT * FROM bills WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const bill = bills[0];
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    const result = await db.query(
      'INSERT INTO bills (user_id, name, amount, category_id, due_date, recurrence, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, `${bill.name} (Copy)`, bill.amount, bill.category_id, bill.due_date, bill.recurrence, 'Unpaid', bill.description]
    );

    const duplicated = await db.query('SELECT * FROM bills WHERE id = ?', [result.insertId]);
    res.status(201).json(duplicated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CATEGORIES
// ==========================================

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PAYMENTS HISTORY
// ==========================================

app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await db.query(
      'SELECT p.*, b.name as bill_name FROM payments p LEFT JOIN bills b ON p.bill_id = b.id WHERE p.user_id = ?',
      [req.user.id]
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.query('SELECT * FROM notifications WHERE user_id = ?', [req.user.id]);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const updated = await db.query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DASHBOARD & REPORTS SUMMARY
// ==========================================

app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const bills = await db.query('SELECT * FROM bills WHERE user_id = ?', [req.user.id]);
    const payments = await db.query('SELECT amount FROM payments WHERE user_id = ?', [req.user.id]);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let totalBills = bills.length;
    let dueToday = 0;
    let upcoming = 0;
    let overdue = 0;
    let paid = 0;
    let totalAmount = 0;

    for (const bill of bills) {
      totalAmount += Number(bill.amount);
      if (bill.status === 'Paid') {
        paid++;
      } else {
        const dueDate = new Date(bill.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate.getTime() === now.getTime()) {
          dueToday++;
        } else if (dueDate > now) {
          upcoming++;
        } else {
          overdue++;
          if (bill.status !== 'Overdue') {
            await db.query('UPDATE bills SET status = "Overdue" WHERE id = ?', [bill.id]);
          }
        }
      }
    }

    const spent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = bills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + Number(b.amount), 0);

    res.json({
      totalBills,
      dueToday,
      upcoming,
      overdue,
      paid,
      totalAmount,
      monthlySummary: { spent, pending }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/analytics', authenticateToken, async (req, res) => {
  try {
    const bills = await db.query('SELECT amount, category_id, status FROM bills WHERE user_id = ?', [req.user.id]);
    const categories = await db.query('SELECT * FROM categories');
    const payments = await db.query('SELECT amount, payment_date FROM payments WHERE user_id = ?', [req.user.id]);

    // Category-wise Breakdown
    const categoryBreakdown = {};
    categories.forEach(cat => {
      categoryBreakdown[cat.name] = 0;
    });

    bills.forEach(bill => {
      const cat = categories.find(c => c.id === bill.category_id);
      const catName = cat ? cat.name : 'Other';
      if (!categoryBreakdown[catName]) categoryBreakdown[catName] = 0;
      categoryBreakdown[catName] += Number(bill.amount);
    });

    // Paid vs Pending
    const paidTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingTotal = bills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + Number(b.amount), 0);

    // Monthly Expenses (last 6 months)
    const monthlyExpenses = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      
      const monthPayments = payments.filter(p => {
        const pDate = new Date(p.payment_date);
        return pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear();
      });

      const total = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      monthlyExpenses.push({ month: monthLabel, amount: total });
    }

    res.json({
      categoryBreakdown,
      paidVsPending: { paid: paidTotal, pending: pendingTotal },
      monthlyExpenses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize database connection on startup
db.initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Smart Bill Manager API running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database pool on startup:', err);
    process.exit(1);
  });
