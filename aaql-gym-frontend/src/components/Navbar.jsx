import React, { useState } from 'react';
import './Navbar.css';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, openLoginModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const categories = ['yoga', 'strength', 'cardio', 'hiit'];

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  const handleActionClick = (portalType) => {
    openLoginModal(portalType);
    setIsOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => handleNavClick('home')}>
          <span className="logo-icon">⚡</span>
          <span className="logo-text">APEX <span className="highlight">PHYSIQUES</span></span>
        </div>

        {/* Hamburger Menu Toggle Button */}
        <button 
          className={`burger-btn ${isOpen ? 'open' : ''}`} 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          <span className="burger-bar"></span>
          <span className="burger-bar"></span>
          <span className="burger-bar"></span>
        </button>

        <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <li>
            <button 
              className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              Home
            </button>
          </li>

          <li>
            <button 
              className={`nav-link ${activeTab === 'memberships' ? 'active' : ''}`}
              onClick={() => handleNavClick('memberships')}
            >
              Access Plans
            </button>
          </li>

          {categories.map((cat) => (
            <li key={cat}>
              <button 
                className={`nav-link ${activeTab === cat ? 'active' : ''}`}
                onClick={() => handleNavClick(cat)}
                style={{ textTransform: 'capitalize' }}
              >
                {cat}
              </button>
            </li>
          ))}

          <li>
            <button 
              className={`nav-link ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => handleNavClick('contact')}
            >
              Contact
            </button>
          </li>
          
          {user && (
            <li>
              <button 
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                My Dashboard
              </button>
            </li>
          )}
          
          {user && (user.role === 'admin' || user.role === 'owner') && (
            <li>
              <button 
                className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => handleNavClick('admin')}
              >
                Staff Control
              </button>
            </li>
          )}

          {/* Inline Action Buttons inside mobile menu for simple layout */}
          <li className="mobile-only-actions">
            {user ? (
              <button className="btn btn-secondary w-full" onClick={handleLogoutClick}>
                Logout
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <button 
                  className="nav-link w-full text-center" 
                  onClick={() => handleActionClick('staff')}
                  style={{ border: '1px solid var(--border)', background: 'transparent' }}
                >
                  Staff Login
                </button>
                <button 
                  className="btn btn-primary w-full" 
                  onClick={() => handleActionClick('member')}
                >
                  Member Sign In
                </button>
              </div>
            )}
          </li>
        </ul>

        {/* Desktop actions (hidden on mobile) */}
        <div className="navbar-actions">
          {user ? (
            <div className="user-badge-container">
              <span className="user-greeting">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogoutClick}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="nav-link" 
                onClick={() => handleActionClick('staff')}
                style={{ fontSize: '0.88rem', border: '1px solid var(--border)', background: 'transparent' }}
              >
                Staff Login
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => handleActionClick('member')}
              >
                Member Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
