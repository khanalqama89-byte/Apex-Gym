import React from 'react';
import './Home.css';

export default function Home({ setActiveTab }) {
  return (
    <div className="home-container">
      {/* HERO SECTION */}
      <header className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content animate-fade-in">
          <span className="hero-subtitle">REDEFINE YOUR LIMITS</span>
          <h1 className="hero-title">SCULPT YOUR <span className="highlight-text">ULTIMATE</span> PHYSIQUE</h1>
          <p className="hero-desc">
            At Apex Physiques, we combine state-of-the-art equipment, world-class trainers, and custom recovery tools to unlock your body's full potential.
          </p>
          <div className="hero-actions">
            <button onClick={() => setActiveTab('memberships')} className="btn btn-primary">Choose Plan</button>
            <button onClick={() => setActiveTab('yoga')} className="btn btn-secondary">View Schedule</button>
          </div>
        </div>
      </header>

      {/* STATS STRIP */}
      <section className="stats-strip">
        <div className="stat-item" onClick={() => setActiveTab('memberships')} style={{ cursor: 'pointer' }}>
          <h3>15,000+</h3>
          <p>Active Members</p>
        </div>
        <div className="stat-item" onClick={() => setActiveTab('strength')} style={{ cursor: 'pointer' }}>
          <h3>50+</h3>
          <p>Certified Trainers</p>
        </div>
        <div className="stat-item" onClick={() => setActiveTab('strength')} style={{ cursor: 'pointer' }}>
          <h3>120+</h3>
          <p>Modern Equipments</p>
        </div>
        <div className="stat-item" onClick={() => setActiveTab('contact')} style={{ cursor: 'pointer' }}>
          <h3>24/7</h3>
          <p>Gym Open hours</p>
        </div>
      </section>

      {/* NEW: MEN & WOMEN INCLUSIVE SECTION */}
      <section className="section-container coed-section">
        <div className="coed-grid">
          
          <div className="coed-content">
            <span className="section-tag">FOR BOTH MEN & WOMEN</span>
            <h2 className="coed-title">
              TRAINING DESIGNED FOR <span className="highlight-text">EVERYONE</span>
            </h2>
            <p className="coed-desc">
              At Apex Physiques, we believe fitness is universal. Our facilities and coaching programs are fully customized to support the fitness ambitions of both **men and women**. 
            </p>
            <div className="coed-list">
              <div className="coed-list-item">
                <span className="coed-icon">⚡</span>
                <div>
                  <h4>Co-Ed & Focused Classes</h4>
                  <p>Participate in vibrant co-ed fitness communities or choose specialized targeted gender programs.</p>
                </div>
              </div>
              <div className="coed-list-item">
                <span className="coed-icon">🔒</span>
                <div>
                  <h4>Premium Locker Rooms & Amenities</h4>
                  <p>Separate, secure, and luxury changing rooms, steam baths, and personal care spaces for men and women.</p>
                </div>
              </div>
              <div className="coed-list-item">
                <span className="coed-icon">🏋️‍♀️</span>
                <div>
                  <h4>Elite Male & Female Trainers</h4>
                  <p>Access our diverse team of certified trainers specializing in bodybuilding, weight management, and prenatal fitness.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="coed-image-wrapper">
            <div className="glass-card coed-image-card">
              <img 
                src="/gym_coed.png" 
                alt="Men and Women training together at Apex" 
                className="coed-image"
              />
            </div>
            <div className="accent-border-deco"></div>
          </div>

        </div>
      </section>

      {/* INTRODUCTORY BRAND STATEMENT */}
      <section className="section-container bg-offset brand-statement-section">
        <span className="section-tag">WELCOME TO THE APEX</span>
        <h2 className="brand-title">WHERE CHAMPIONS ARE FORGED</h2>
        <p className="brand-desc">
          Apex Physiques is more than just a gym. It is a premium training facility dedicated to optimal human performance. Whether you're looking to build strength, increase cardiorespiratory endurance, master yoga, or push yourself to new heights in high-intensity training, our custom facilities and expert trainers are here to guide your evolution.
        </p>
        <div className="brand-actions">
          <button onClick={() => setActiveTab('strength')} className="btn btn-primary">Browse Classes</button>
          <button onClick={() => setActiveTab('contact')} className="btn btn-secondary">Find Our Gym</button>
        </div>
      </section>
    </div>
  );
}
