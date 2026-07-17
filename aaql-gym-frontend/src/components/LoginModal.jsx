import React, { useState, useEffect } from 'react';
import './LoginModal.css';
import { API_BASE_URL } from '../config';

export default function LoginModal({ isOpen, onClose, onAuthSuccess, triggerToast, portalType }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Default to sign-in whenever portal type changes
  useEffect(() => {
    setIsRegister(false);
  }, [portalType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      triggerToast('Please fill out all fields.', 'error');
      return;
    }

    setLoading(true);
    const endpoint = isRegister ? 'register' : 'login';
    const bodyData = isRegister ? { name, email, password } : { email, password };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await response.json();

      if (response.ok) {
        // PORTAL ROLE BOUNDARY VALIDATION
        if (!isRegister) {
          if (portalType === 'member' && data.user.role === 'admin') {
            triggerToast('Administrator accounts must log in via the Staff Portal!', 'error');
            setLoading(false);
            return;
          }
          if (portalType === 'staff' && data.user.role !== 'admin') {
            triggerToast('Access Denied. Member accounts must log in via Member Sign In.', 'error');
            setLoading(false);
            return;
          }
        }

        triggerToast(isRegister ? 'Account created successfully!' : 'Welcome back!', 'success');
        onAuthSuccess(data.token, data.user);
        onClose();
        setName('');
        setEmail('');
        setPassword('');
      } else {
        triggerToast(data.error || 'Authentication failed', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Unable to reach auth server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isStaff = portalType === 'staff';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-container animate-fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <h2>
          {isStaff 
            ? 'Staff & Owner Portal' 
            : isRegister 
              ? 'Join the Elite' 
              : 'Member Sign In'
          }
        </h2>
        <p className="modal-subtitle" style={{ color: isStaff ? '#60a5fa' : 'var(--text-muted)' }}>
          {isStaff 
            ? 'Authorized personnel only. Access gym registries and class schedules.' 
            : isRegister 
              ? 'Create your Apex account to begin training.' 
              : 'Enter credentials to access your trainer schedule.'
          }
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          {isRegister && !isStaff && (
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder={isStaff ? "staff@apex.com" : "name@domain.com"}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className={`btn modal-submit-btn ${isStaff ? 'btn-secondary' : 'btn-primary'}`} 
            style={{ width: '100%', marginTop: '1.5rem', background: isStaff ? '#2563eb' : undefined }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : isStaff ? 'Secure Staff Login' : 'Sign In'}
          </button>
        </form>

        {!isStaff && (
          <div className="modal-footer">
            <p>
              {isRegister ? 'Already have an account?' : 'New to Apex Physiques?'}
              <button className="toggle-mode-btn" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? 'Sign In' : 'Register Now'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
