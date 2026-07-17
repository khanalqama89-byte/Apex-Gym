import React, { useState } from 'react';
import './Home.css'; // Reuse CSS styling for contact grids and map wrapper
import { API_BASE_URL } from '../config';

export default function Contact({ triggerToast }) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      triggerToast('Please complete all form fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }),
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast('Message sent! Our trainers will contact you shortly.', 'success');
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        triggerToast(data.error || 'Failed to send inquiry.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server connection failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-container" style={{ minHeight: '80vh', paddingTop: '6rem' }}>
      <div className="contact-grid">
        <div className="contact-info">
          <span className="section-tag font-bold">VISIT OUR CLUB</span>
          <h2>APEX PHYSIQUES GYM</h2>
          <p className="contact-desc">
            Come see us today and start your training with our coaches in a motivating and premium environment.
          </p>
          <div className="info-items">
            <div className="info-item">
              <span className="info-icon">📍</span>
              <div>
                <h4>Location Address</h4>
                <p>742 Neon Boulevard, Suite 500, Cyber City, NY 10001</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📞</span>
              <div>
                <h4>Phone Number</h4>
                <p>+1 (555) 739-7497</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">✉</span>
              <div>
                <h4>Email Support</h4>
                <p>info@apexphysiques.com</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">🕒</span>
              <div>
                <h4>Working Hours & Timing</h4>
                <p>Mon - Fri: 24 Hours | Sat - Sun: 06:00 AM - 10:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card contact-form-card">
          <h3>Get in Touch</h3>
          <p style={{marginBottom: '1.5rem'}}>Have questions? Drop us a line.</p>
          <form onSubmit={handleContactSubmit}>
            <div className="form-group">
              <label>Your Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. john@example.com"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea 
                rows="4" 
                className="form-control" 
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Write your questions..."
              ></textarea>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{width: '100%'}}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

      {/* MAP PLACEHOLDER */}
      <div className="map-wrapper glass-card">
        <div className="map-indicator">
          <span className="pulse-dot"></span>
          <div>
            <strong>Apex Physiques HQ</strong>
            <p>742 Neon Boulevard, Cyber City</p>
          </div>
        </div>
        <div className="futuristic-map">
          <div className="map-grid-lines"></div>
          <div className="map-road-1"></div>
          <div className="map-road-2"></div>
          <div className="map-pin">📍</div>
        </div>
      </div>
    </section>
  );
}
