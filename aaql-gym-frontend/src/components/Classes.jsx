import React from 'react';
import './Home.css';
import './Classes.css';

export default function Classes({ category, classes, onBookClass }) {
  // Filter classes by specific category
  const filteredClasses = classes.filter(c => c.category.toLowerCase() === category.toLowerCase());

  const categoryDetails = {
    'Yoga': {
      image: '/yoga.png',
      tagline: 'MIND, BODY, AND SPIRIT ALIGNMENT',
      description: 'Find your balance, flexibility, and inner peace in our premium yoga studio. Enjoy restorative Hatha, dynamic Vinyasa, and meditative breathing exercises led by world-class certified instructors.'
    },
    'Strength': {
      image: '/strength.png',
      tagline: 'POWER, FORCE, AND MUSCLE BUILDING',
      description: 'Sculpt your physique and build raw power using our state-of-the-art power racks, free weights, and plate-loaded machines. Our coaches will guide you through progressive overload training.'
    },
    'Cardio': {
      image: '/cardio.png',
      tagline: 'ENDURANCE, STAMINA, AND CONDITIONING',
      description: 'Strengthen your cardiovascular health and power up your stamina. Work out on our top-of-the-line treadmills, air bikes, and rowing machines facing panoramic skyline views.'
    },
    'HIIT': {
      image: '/hiit.png',
      tagline: 'HIGH INTENSITY INTERVAL TRAINING',
      description: 'Ignite your metabolic rate and burn fat with high-intensity intervals. Combine kettlebells, battle ropes, slam balls, and sprint work in an high-energy, motivational group turf environment.'
    }
  };

  const currentCategory = categoryDetails[category] || categoryDetails['Strength'];

  const getGenderTag = (className, classId) => {
    const lowerName = className.toLowerCase();
    if (lowerName.includes("women") || lowerName.includes("female") || classId % 4 === 1) {
      return { 
        text: "Women's Only", 
        style: { background: 'rgba(236, 72, 153, 0.12)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.2)' } 
      };
    }
    if (lowerName.includes("men") || lowerName.includes("male") || classId % 4 === 2) {
      return { 
        text: "Men's Only", 
        style: { background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' } 
      };
    }
    return { 
      text: "Co-Ed", 
      style: { background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' } 
    };
  };

  return (
    <div className="category-page-container" style={{ minHeight: '90vh' }}>
      {/* CATEGORY HERO HEADER */}
      <div 
        className="category-hero" 
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(3, 7, 18, 0.4) 0%, rgba(3, 7, 18, 0.95) 100%), url(${currentCategory.image})`
        }}
      >
        <div className="category-hero-content">
          <span className="category-subtitle">{currentCategory.tagline}</span>
          <h1 className="category-title">{category.toUpperCase()} <span className="highlight-text">CLASSES</span></h1>
          <p className="category-desc">{currentCategory.description}</p>
        </div>
      </div>

      {/* CLASS SCHEDULE LIST */}
      <section className="section-container" style={{ paddingTop: '2rem' }}>
        <div className="section-header" style={{ textAlign: 'left', marginBottom: '3rem' }}>
          <span className="section-tag">AVAILABLE SLOTS</span>
          <h2>UPCOMING SCHEDULE FOR {category.toUpperCase()}</h2>
        </div>

        <div className="classes-grid">
          {filteredClasses.length === 0 ? (
            <p className="no-data" style={{ padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              No {category} classes are currently scheduled. Check back later or contact support!
            </p>
          ) : (
            filteredClasses.map(c => {
              const spotsLeft = c.capacity - c.booked_count;
              const genderTag = getGenderTag(c.name, c.id);
              return (
                <div key={c.id} className="glass-card class-card" style={{ padding: '2rem' }}>
                  <div className="class-header">
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="class-tag">{c.category}</span>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: '700', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '6px',
                        ...genderTag.style 
                      }}>
                        {genderTag.text}
                      </span>
                    </div>
                    <span className="class-spots" style={{ color: spotsLeft <= 3 ? '#ef4444' : 'var(--text-muted)' }}>
                      {spotsLeft} spots left
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', margin: '0.5rem 0' }}>{c.name}</h3>
                  <p className="class-trainer" style={{ fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                    Instructor: <strong style={{ color: '#fff' }}>{c.instructor}</strong>
                  </p>
                  <p className="class-description" style={{ lineHeight: '1.6', fontSize: '0.92rem' }}>{c.description}</p>
                  <div className="class-info-footer" style={{ marginTop: 'auto' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '0.2rem' }}>🕒 <strong>{c.time}</strong></span>
                      <span>⏳ {c.duration}</span>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => onBookClass(c.id)}
                    >
                      Book Slot
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>


    </div>
  );
}
