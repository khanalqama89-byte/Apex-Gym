import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { API_BASE_URL } from '../config';

export default function AdminDashboard({ user, token, triggerToast, classes, fetchClasses }) {
  // Stats State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMembers: 0,
    totalClasses: 0,
    totalBookings: 0,
    unreadInquiries: 0
  });

  // Lists State
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);

  // Class Form State
  const [className, setClassName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [category, setCategory] = useState('Yoga');
  const [description, setDescription] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);

  // Create User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserStatus, setNewUserStatus] = useState('inactive');
  const [newUserPlan, setNewUserPlan] = useState('none');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      triggerToast('Please complete all account fields.', 'error');
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          membership_status: newUserStatus,
          membership_type: newUserPlan
        })
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast(`Successfully created ${newUserRole === 'admin' ? 'Staff' : 'Member'} account!`, 'success');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
        setNewUserStatus('inactive');
        setNewUserPlan('none');
        fetchAdminData(); // Refresh registry
      } else {
        triggerToast(data.error || 'Failed to create account', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server connection error', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const isOwner = user && (user.role === 'owner' || user.email === 'admin@apex.com');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // 2. Fetch Users
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      if (usersRes.ok) setUsers(usersData);

      // 3. Fetch Bookings
      const bookingsRes = await fetch(`${API_BASE_URL}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bookingsData = await bookingsRes.json();
      if (bookingsRes.ok) setBookings(bookingsData);

      // 4. Fetch Inquiries
      const inquiriesRes = await fetch(`${API_BASE_URL}/api/inquiries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const inquiriesData = await inquiriesRes.json();
      if (inquiriesRes.ok) setInquiries(inquiriesData);

    } catch (err) {
      console.error(err);
      triggerToast('Error loading admin control panel data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  // Handle user edit
  const handleUserChange = async (userId, updatedFields) => {
    const userToUpdate = users.find(u => u.id === userId);
    const updatedUser = { ...userToUpdate, ...updatedFields };

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: updatedUser.role,
          membership_status: updatedUser.membership_status,
          membership_type: updatedUser.membership_type
        })
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast('User details updated successfully!', 'success');
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
        fetchAdminData();
      } else {
        triggerToast(data.error || 'Failed to update user', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server communication failure', 'error');
    }
  };

  // Create new class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!className || !instructor || !time || !duration || !capacity) {
      triggerToast('Please complete all class fields.', 'error');
      return;
    }

    setIsAddingClass(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: className,
          instructor,
          time,
          duration,
          capacity: parseInt(capacity),
          category,
          description
        })
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast('New gym class successfully created!', 'success');
        setClassName('');
        setInstructor('');
        setTime('');
        setDuration('');
        setCapacity('20');
        setDescription('');
        fetchClasses();
        fetchAdminData();
      } else {
        triggerToast(data.error || 'Failed to create class', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server connection error', 'error');
    } finally {
      setIsAddingClass(false);
    }
  };

  // Delete a class
  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Delete this class? This will also remove any bookings associated with it!')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast('Class deleted', 'success');
        fetchClasses();
        fetchAdminData();
      } else {
        triggerToast(data.error || 'Failed to delete class', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server connection error', 'error');
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <p className="loading-text">Retrieving admin analytics and records...</p>
      </div>
    );
  }

  return (
    <div className="admin-container animate-fade-in">
      <div className="admin-header">
        <h1>Administrator Dashboard</h1>
        <p>Overview of gym members, schedule logs, booking lists, and customer inquiries.</p>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <h3>Total Users</h3>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="glass-card stat-card">
          <h3>Active Subscribers</h3>
          <div className="stat-value text-accent">{stats.activeMembers}</div>
        </div>
        <div className="glass-card stat-card">
          <h3>Total Classes</h3>
          <div className="stat-value">{stats.totalClasses}</div>
        </div>
        <div className="glass-card stat-card">
          <h3>Active Bookings</h3>
          <div className="stat-value">{stats.totalBookings}</div>
        </div>
        <div className="glass-card stat-card">
          <h3>Open Inquiries</h3>
          <div className="stat-value text-accent">{stats.unreadInquiries}</div>
        </div>
      </div>

      <div className="admin-split-layout">
        {/* COLUMN 1: FORMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* CREATE CLASS FORM */}
          <div className="glass-card form-section-card">
            <h3>Schedule New Class</h3>
            <form onSubmit={handleCreateClass} style={{marginTop: '1.5rem'}}>
              <div className="form-group">
                <label>Class Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  placeholder="e.g. HIIT Power Core"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <select 
                    className="form-control"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="Yoga">Yoga</option>
                    <option value="Strength">Strength</option>
                    <option value="Cardio">Cardio</option>
                    <option value="HIIT">HIIT</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Instructor</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={instructor}
                    onChange={e => setInstructor(e.target.value)}
                    placeholder="e.g. Coach David"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Timing Slot</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    placeholder="e.g. Friday 05:00 PM"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="e.g. 60 mins"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  placeholder="20"
                />
              </div>

              <div className="form-group">
                <label>Class Description</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Write description details..."
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isAddingClass}>
                {isAddingClass ? 'Creating...' : 'Create Class'}
              </button>
            </form>
          </div>

          {/* CREATE STAFF/USER ACCOUNT (OWNER ONLY) */}
          {isOwner && (
            <div className="glass-card form-section-card">
              <h3>Create Gym Account (Staff & Members)</h3>
              <form onSubmit={handleCreateUser} style={{marginTop: '1.5rem'}}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="e.g. Trainer Mike"
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="e.g. mike@apex.com"
                  />
                </div>

                <div className="form-group">
                  <label>Initial Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    placeholder="e.g. secret123"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Account Role</label>
                    <select 
                      className="form-control"
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value)}
                    >
                      <option value="user">User (Member)</option>
                      <option value="admin">Admin (Staff/Owner)</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>Subscription Status</label>
                    <select 
                      className="form-control"
                      value={newUserStatus}
                      onChange={e => setNewUserStatus(e.target.value)}
                      disabled={newUserRole === 'admin'}
                    >
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>

                {newUserRole === 'user' && (
                  <div className="form-group">
                    <label>Membership Level</label>
                    <select 
                      className="form-control"
                      value={newUserPlan}
                      onChange={e => setNewUserPlan(e.target.value)}
                    >
                      <option value="none">None</option>
                      <option value="basic">Basic (Essential Fit)</option>
                      <option value="premium">Premium (Elite Athlete)</option>
                      <option value="elite">Elite (Titanium VIP)</option>
                    </select>
                  </div>
                )}

                <button type="submit" className="btn btn-secondary w-full" style={{ background: '#2563eb' }} disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* COLUMN 2: MANAGE CLASSES */}
        <div className="glass-card list-section-card" style={{ height: 'fit-content' }}>
          <h3>Manage Scheduled Classes</h3>
          <div className="class-table-scroller" style={{marginTop: '1.5rem'}}>
            {classes.length === 0 ? (
              <p>No classes scheduled yet.</p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Coach</th>
                      <th>Time Slot</th>
                      <th>Bookings</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong><br/><small style={{color: 'var(--text-muted)'}}>{c.category}</small></td>
                        <td>{c.instructor}</td>
                        <td>{c.time}</td>
                        <td>{c.booked_count}/{c.capacity}</td>
                        <td>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteClass(c.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* USER LIST CONFIGURATION */}
      <div className="glass-card admin-table-section">
        <h3>User Account Registry & Membership Control</h3>
        <div className="table-container" style={{marginTop: '1.5rem'}}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Membership</th>
                <th>Subscription Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <select 
                      className="table-select"
                      value={u.role}
                      onChange={e => handleUserChange(u.id, { role: e.target.value })}
                      disabled={!isOwner}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className="table-select"
                      value={u.membership_type}
                      onChange={e => handleUserChange(u.id, { membership_type: e.target.value })}
                      disabled={!isOwner}
                    >
                      <option value="none">None</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="elite">Elite</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className="table-select"
                      value={u.membership_status}
                      onChange={e => handleUserChange(u.id, { membership_status: e.target.value })}
                      disabled={!isOwner}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GLOBAL BOOKING HISTORY */}
      <div className="glass-card admin-table-section">
        <h3>Global Member Booking Logs</h3>
        <div className="table-container" style={{marginTop: '1.5rem'}}>
          {bookings.length === 0 ? (
            <p className="no-data">No bookings registered on the system yet.</p>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Member Name</th>
                  <th>Member Email</th>
                  <th>Class Title</th>
                  <th>Class Instructor</th>
                  <th>Time Slot</th>
                  <th>Booked On</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td><strong>{b.user_name}</strong></td>
                    <td>{b.user_email}</td>
                    <td>{b.class_name}</td>
                    <td>{b.instructor}</td>
                    <td>{b.time}</td>
                    <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* USER INQUIRIES LOG */}
      <div className="glass-card admin-table-section">
        <h3>User Inquiries & Messages</h3>
        <div className="table-container" style={{marginTop: '1.5rem'}}>
          {inquiries.length === 0 ? (
            <p className="no-data">No user inquiries registered.</p>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Inquiry ID</th>
                  <th>Sender</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inq => (
                  <tr key={inq.id}>
                    <td>#{inq.id}</td>
                    <td><strong>{inq.name}</strong></td>
                    <td>{inq.email}</td>
                    <td>{inq.message}</td>
                    <td>{new Date(inq.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
