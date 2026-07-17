const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgymkey123';

// ========================================================
// AUTHENTICATION MIDDLEWARE
// ========================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.email !== 'admin@apex.com') {
      return res.status(403).json({ error: 'Admin or Owner access required' });
    }
    next();
  });
}

function requireOwner(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'owner' && req.user.email !== 'admin@apex.com') {
      return res.status(403).json({ error: 'Owner access required' });
    }
    next();
  });
}

// ========================================================
// AUTH ROUTES
// ========================================================

// Register
router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide all fields' });
  }

  try {
    const existing = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password, role, membership_status, membership_type) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'user', 'inactive', 'none']
    );

    const token = jwt.sign({ id: result.insertId, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({
      token,
      user: { id: result.insertId, name, email, role: 'user', membership_status: 'inactive', membership_type: 'none' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membership_status: user.membership_status,
        membership_type: user.membership_type
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Current User Info
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, email, role, membership_status, membership_type FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================================
// CLASS ROUTES
// ========================================================

// Get all classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await db.query('SELECT * FROM classes ORDER BY created_at DESC');
    res.json(classes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a class (Admin only)
router.post('/classes', requireAdmin, async (req, res) => {
  const { name, instructor, time, duration, capacity, category, description } = req.body;
  if (!name || !instructor || !time || !duration || !capacity || !category) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  try {
    const result = await db.query(
      'INSERT INTO classes (name, instructor, time, duration, capacity, booked_count, description, category) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
      [name, instructor, time, duration, parseInt(capacity), description || '', category]
    );
    res.status(201).json({ id: result.insertId, name, instructor, time, duration, capacity, booked_count: 0, description, category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a class (Admin only)
router.delete('/classes/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================================
// BOOKING ROUTES
// ========================================================

// Get bookings
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const allBookings = await db.query(`
        SELECT b.id, b.booking_date, b.created_at, u.name as user_name, u.email as user_email, c.name as class_name, c.instructor, c.time
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN classes c ON b.class_id = c.id
        ORDER BY b.created_at DESC
      `);
      return res.json(allBookings);
    } else {
      const myBookings = await db.query(`
        SELECT b.id, b.booking_date, b.created_at, c.name as class_name, c.instructor, c.time, c.duration, c.category
        FROM bookings b
        JOIN classes c ON b.class_id = c.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `, [req.user.id]);
      return res.json(myBookings);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Book a class
router.post('/bookings', authenticateToken, async (req, res) => {
  const { class_id, booking_date } = req.body;
  if (!class_id || !booking_date) {
    return res.status(400).json({ error: 'Please provide class_id and booking_date' });
  }

  try {
    // 1. Verify user membership status
    const users = await db.query('SELECT membership_status FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0 || users[0].membership_status !== 'active') {
      return res.status(403).json({ error: 'You need an active membership plan to book classes!' });
    }

    // 2. Verify class capacity
    const classes = await db.query('SELECT capacity, booked_count FROM classes WHERE id = ?', [class_id]);
    if (classes.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const { capacity, booked_count } = classes[0];
    if (booked_count >= capacity) {
      return res.status(400).json({ error: 'Class is fully booked!' });
    }

    // 3. Verify user hasn't already booked this class
    const existing = await db.query('SELECT * FROM bookings WHERE user_id = ? AND class_id = ?', [req.user.id, class_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already booked this class' });
    }

    // 4. Create booking
    await db.query('INSERT INTO bookings (user_id, class_id, booking_date) VALUES (?, ?, ?)', [req.user.id, class_id, booking_date]);

    // 5. Update booked count in class
    await db.query('UPDATE classes SET booked_count = booked_count + 1 WHERE id = ?', [class_id]);

    res.status(201).json({ message: 'Booking successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel a booking
router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Check ownership or admin
    const bookings = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    // Delete booking
    await db.query('DELETE FROM bookings WHERE id = ?', [bookingId]);

    // Update booked count
    await db.query('UPDATE classes SET booked_count = GREATEST(0, booked_count - 1) WHERE id = ?', [booking.class_id]);

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================================
// MEMBERSHIP ROUTES
// ========================================================

// Simulate Purchase
router.post('/membership/purchase', authenticateToken, async (req, res) => {
  const { membership_type } = req.body;
  if (!membership_type || !['basic', 'premium', 'elite'].includes(membership_type)) {
    return res.status(400).json({ error: 'Invalid membership type selection' });
  }

  try {
    await db.query(
      'UPDATE users SET membership_status = "active", membership_type = ? WHERE id = ?',
      [membership_type, req.user.id]
    );
    res.json({ message: 'Membership updated successfully!', membership_status: 'active', membership_type });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================================
// INQUIRY ROUTES
// ========================================================

// Submit inquiry
router.post('/inquiries', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please fill out all fields' });
  }

  try {
    await db.query('INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
    res.status(201).json({ message: 'Inquiry submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inquiries (Admin only)
router.get('/inquiries', requireAdmin, async (req, res) => {
  try {
    const inquiries = await db.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(inquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================================
// ADMIN ANALYTICS & STATS
// ========================================================

// Get Dashboard Stats (Admin only)
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const activeMembersCount = await db.query('SELECT COUNT(*) as count FROM users WHERE membership_status = "active" AND role = "user"');
    const classesCount = await db.query('SELECT COUNT(*) as count FROM classes');
    const bookingsCount = await db.query('SELECT COUNT(*) as count FROM bookings');
    const inquiriesCount = await db.query('SELECT COUNT(*) as count FROM inquiries WHERE status = "unread"');

    res.json({
      totalUsers: usersCount[0].count,
      activeMembers: activeMembersCount[0].count,
      totalClasses: classesCount[0].count,
      totalBookings: bookingsCount[0].count,
      unreadInquiries: inquiriesCount[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get User List (Admin only)
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, email, role, membership_status, membership_type, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update User (Owner only)
router.put('/admin/users/:id', requireOwner, async (req, res) => {
  const { role, membership_status, membership_type } = req.body;
  try {
    await db.query(
      'UPDATE users SET role = ?, membership_status = ?, membership_type = ? WHERE id = ?',
      [role, membership_status, membership_type, req.params.id]
    );
    res.json({ message: 'User updated successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create User/Staff (Owner only)
router.post('/admin/users', requireOwner, async (req, res) => {
  const { name, email, password, role, membership_status, membership_type } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  try {
    const existing = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password, role, membership_status, membership_type) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, membership_status || 'inactive', membership_type || 'none']
    );

    res.status(201).json({
      message: 'Account created successfully!',
      user: { id: result.insertId, name, email, role, membership_status, membership_type }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
