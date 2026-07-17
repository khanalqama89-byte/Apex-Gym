import React, { useState } from 'react';
import './Home.css'; // Reuse CSS styling for pricing plans

export default function Memberships({ user, onPurchaseMembership }) {
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'

  const pricingPlans = [
    {
      id: 'basic',
      name: 'Essential Fit',
      priceMonthly: 29,
      priceYearly: 22,
      features: ['Access to Gym Floor', 'Locker Room access', '1 Free Trainer Session', 'Free WiFi'],
      popular: false,
    },
    {
      id: 'premium',
      name: 'Elite Athlete',
      priceMonthly: 59,
      priceYearly: 45,
      features: ['24/7 Access', 'Unlimited Group Classes', '5 Personal Trainer Sessions', 'Sauna & Steam Bath', 'Apex Nutrition Guide'],
      popular: true,
    },
    {
      id: 'elite',
      name: 'Titanium VIP',
      priceMonthly: 99,
      priceYearly: 75,
      features: ['All Premium features', 'Unlimited Personal Training', 'Custom Meal Plans', 'Complimentary Gym Kit', 'VIP Lounge Access', 'Recovery Therapy access'],
      popular: false,
    }
  ];

  return (
    <section className="section-container" style={{ minHeight: '80vh', paddingTop: '6rem' }}>
      <div className="section-header">
        <span className="section-tag">MEMBERSHIP ACCESS</span>
        <h2>UNLEASH POTENTIAL WITH OUR PLANS</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Select the package that fits your lifestyle and fitness objectives.</p>
        <div className="billing-toggle" style={{ marginTop: '2rem' }}>
          <button 
            className={`toggle-btn ${billingPeriod === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`toggle-btn ${billingPeriod === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingPeriod('yearly')}
          >
            Yearly (Save 25%)
          </button>
        </div>
      </div>

      <div className="plans-grid">
        {pricingPlans.map((plan) => {
          const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const isCurrentPlan = user && user.membership_type === plan.id;
          return (
            <div key={plan.id} className={`glass-card plan-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <span className="popular-badge">Most Popular</span>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="currency">$</span>
                <span className="price-num">{price}</span>
                <span className="period">/mo</span>
              </div>
              <p className="plan-desc">Billed {billingPeriod === 'monthly' ? 'monthly' : 'annually'}</p>
              <ul className="plan-features">
                {plan.features.map((f, index) => (
                  <li key={index}><span className="check-icon">✓</span> {f}</li>
                ))}
              </ul>
              <button 
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} plan-btn`}
                onClick={() => onPurchaseMembership(plan.id)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? 'Current Active Plan' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
