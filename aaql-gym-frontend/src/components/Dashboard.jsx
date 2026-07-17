import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { API_BASE_URL } from '../config';

export default function Dashboard({ user, token, triggerToast, setActiveTab }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setBookings(data);
      } else {
        triggerToast(data.error || 'Failed to fetch bookings', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error connecting to backend', 'error');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBookings();
    }
  }, [token]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this class booking?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast('Booking cancelled successfully', 'success');
        setBookings(bookings.filter(b => b.id !== bookingId));
      } else {
        triggerToast(data.error || 'Cancellation failed', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server communication failure', 'error');
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <h1>Welcome Back, <span className="highlight-name">{user.name}</span></h1>
        <p>Monitor your active classes, check-in, and manage your plan details.</p>
      </div>

      <div className="dashboard-grid">
        {/* MEMBERSHIP STATUS CARD */}
        <div className="glass-card status-card">
          <h3>Your Membership</h3>
          <div className="status-indicator">
            <span className={`badge ${user.membership_status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
              {user.membership_status === 'active' ? 'Active' : 'No Active Plan'}
            </span>
            {user.membership_status === 'active' && (
              <span className="membership-type">{user.membership_type.toUpperCase()} PLAN</span>
            )}
          </div>

          {user.membership_status === 'active' ? (
            <div className="qr-section">
              <p className="qr-desc">Scan QR Code at gym entrance to check-in:</p>
              <div className="qr-code-box">
                <div className="qr-mock">
                  <div className="qr-corner top-left"></div>
                  <div className="qr-corner top-right"></div>
                  <div className="qr-corner bottom-left"></div>
                  <div className="qr-corner bottom-right"></div>
                  <div className="qr-center-logo">⚡</div>
                  <span className="qr-label">APEX SCAN</span>
                </div>
              </div>
              <p className="qr-id">Member ID: AP-{user.id.toString().padStart(5, '0')}</p>
            </div>
          ) : (
            <div className="inactive-prompt">
              <p>You do not have an active subscription plan right now. Purchase one to book group classes.</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('home')}>
                Browse Plans
              </button>
            </div>
          )}
        </div>

        {/* ACCOUNT PARAMETERS CARD */}
        <div className="glass-card profile-details-card">
          <h3>Profile Overview</h3>
          <div className="profile-row">
            <span className="label">Registered Name:</span>
            <span className="val">{user.name}</span>
          </div>
          <div className="profile-row">
            <span className="label">Email Address:</span>
            <span className="val">{user.email}</span>
          </div>
          <div className="profile-row">
            <span className="label">Account Role:</span>
            <span className="val">{user.role === 'admin' ? 'Gym Administrator' : 'Gym Member'}</span>
          </div>
          
          <div className="motivation-section">
            <p className="quote">"The only bad workout is the one that didn't happen."</p>
            <p className="author">- Apex Physiques Team</p>
          </div>
        </div>
      </div>

      {/* BOOKED CLASSES LIST */}
      <div className="glass-card bookings-section-card">
        <h3>My Booked Classes</h3>
        
        {loadingBookings ? (
          <p className="loading-text">Loading your scheduled sessions...</p>
        ) : bookings.length === 0 ? (
          <div className="no-bookings">
            <p>You have not booked any classes yet.</p>
            <button className="btn btn-secondary" onClick={() => setActiveTab('home')}>
              Explore Schedules
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Class Title</th>
                  <th>Category</th>
                  <th>Coach</th>
                  <th>Timing</th>
                  <th>Duration</th>
                  <th style={{textAlign: 'right'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.class_name}</strong></td>
                    <td><span className="class-tag-simple">{b.category}</span></td>
                    <td>{b.instructor}</td>
                    <td>{b.time}</td>
                    <td>{b.duration}</td>
                    <td style={{textAlign: 'right'}}>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelBooking(b.id)}
                      >
                        Cancel
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
  );
}
