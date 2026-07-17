import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Memberships from './components/Memberships';
import Classes from './components/Classes';
import Contact from './components/Contact';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import LoginModal from './components/LoginModal';
import { API_BASE_URL } from './config';

const dummyClasses = [
  // Yoga
  {
    id: 101,
    name: 'Morning Yoga Flow',
    instructor: 'Sarah Jenkins',
    time: 'Monday 08:00 AM',
    duration: '60 mins',
    capacity: 15,
    booked_count: 5,
    category: 'Yoga',
    description: 'Start your day with a peaceful yoga sequence designed to improve flexibility and mindfulness.'
  },
  {
    id: 102,
    name: 'Restorative Vinyasa',
    instructor: 'Clara Oswald',
    time: 'Wednesday 04:00 PM',
    duration: '60 mins',
    capacity: 12,
    booked_count: 8,
    category: 'Yoga',
    description: 'Decompress and flow with rhythmic breath control and steady poses targeting deep muscle stretch.'
  },
  {
    id: 103,
    name: 'Sunset Hatha & Meditation',
    instructor: 'Sarah Jenkins',
    time: 'Friday 06:30 PM',
    duration: '45 mins',
    capacity: 20,
    booked_count: 18,
    category: 'Yoga',
    description: 'Unwind your week with relaxing Hatha postures and deep breathing mindfulness meditation.'
  },
  // Strength
  {
    id: 201,
    name: 'Power Weightlifting',
    instructor: 'Marcus Sterling',
    time: 'Tuesday 06:00 PM',
    duration: '75 mins',
    capacity: 12,
    booked_count: 10,
    category: 'Strength',
    description: 'High-intensity powerlifting sessions focusing on squat, bench, and deadlift techniques.'
  },
  {
    id: 202,
    name: 'Hypertrophy Conditioning',
    instructor: 'Leon Kennedy',
    time: 'Thursday 05:00 PM',
    duration: '60 mins',
    capacity: 15,
    booked_count: 12,
    category: 'Strength',
    description: 'Focused resistance training targeting muscle growth, form refinement, and core stability.'
  },
  {
    id: 203,
    name: 'Full Body Barbell',
    instructor: 'Marcus Sterling',
    time: 'Saturday 10:00 AM',
    duration: '60 mins',
    capacity: 10,
    booked_count: 6,
    category: 'Strength',
    description: 'Compound barbell movements covering squat, overhead presses, and lunges to test absolute power.'
  },
  // Cardio
  {
    id: 301,
    name: 'Cardio Blast',
    instructor: 'Elena Rostova',
    time: 'Wednesday 10:00 AM',
    duration: '45 mins',
    capacity: 25,
    booked_count: 15,
    category: 'Cardio',
    description: 'Fast-paced aerobic and anaerobic cardio training to boost your stamina and burn calories.'
  },
  {
    id: 302,
    name: 'Spin Cycle Sprint',
    instructor: 'Alex Mercer',
    time: 'Thursday 08:00 AM',
    duration: '45 mins',
    capacity: 18,
    booked_count: 14,
    category: 'Cardio',
    description: 'High energy indoor spinning classes designed to push cardiovascular thresholds.'
  },
  {
    id: 303,
    name: 'Endurance Treadmill Flow',
    instructor: 'Elena Rostova',
    time: 'Saturday 09:00 AM',
    duration: '50 mins',
    capacity: 20,
    booked_count: 8,
    category: 'Cardio',
    description: 'Interval running and incline sprints to optimize oxygen intake and core leg stamina.'
  },
  // HIIT
  {
    id: 401,
    name: 'HIIT Conditioning',
    instructor: 'David Webb',
    time: 'Thursday 07:00 PM',
    duration: '50 mins',
    capacity: 20,
    booked_count: 14,
    category: 'HIIT',
    description: 'Tabata-style intervals combining bodyweight exercises, kettlebell swings, and high-intensity moves.'
  },
  {
    id: 402,
    name: 'Metabolic Overdrive',
    instructor: 'David Webb',
    time: 'Tuesday 09:30 AM',
    duration: '45 mins',
    capacity: 15,
    booked_count: 9,
    category: 'HIIT',
    description: 'Fast circuit rounds on turf using battle ropes, medicine balls, and intense plyometrics.'
  },
  {
    id: 403,
    name: 'Core Crusher HIIT',
    instructor: 'Jill Valentine',
    time: 'Saturday 11:30 AM',
    duration: '30 mins',
    capacity: 25,
    booked_count: 21,
    category: 'HIIT',
    description: 'Explosive abdominal core conditioning intervals combined with high heart rate cardio finishes.'
  }
];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [classes, setClasses] = useState(dummyClasses);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPortal, setLoginPortal] = useState('member'); // 'member' | 'staff'
  
  // Toast notifications state
  const [toast, setToast] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load user session from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('apex_gym_token');
    const savedUser = localStorage.getItem('apex_gym_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`);
      const data = await response.json();
      if (response.ok && data && data.length > 0) {
        setClasses(data);
      }
    } catch (err) {
      console.warn("Could not load database classes. Running with local fallback schedules.", err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenLoginModal = (portalType = 'member') => {
    setLoginPortal(portalType);
    setIsLoginOpen(true);
  };

  const handleAuthSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('apex_gym_token', newToken);
    localStorage.setItem('apex_gym_user', JSON.stringify(newUser));
    triggerToast(`Successfully logged in as ${newUser.name}`);
    if (newUser.role === 'admin' || newUser.role === 'owner') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('apex_gym_token');
    localStorage.removeItem('apex_gym_user');
    setActiveTab('home');
    triggerToast('Logged out successfully.');
  };

  const handleBookClass = async (classId) => {
    if (!user) {
      triggerToast('Please sign in to book class slots!', 'error');
      handleOpenLoginModal('member');
      return;
    }

    if (user.membership_status !== 'active') {
      triggerToast('You need an active membership plan to book sessions. Please purchase one below!', 'error');
      setActiveTab('memberships');
      return;
    }

    // Support offline/local booking simulation for dummy classes
    if (classId >= 100) {
      setClasses(prev => prev.map(c => {
        if (c.id === classId) {
          if (c.booked_count >= c.capacity) {
            triggerToast('Class is already fully booked!', 'error');
            return c;
          }
          triggerToast('Class booked successfully (Simulation Mode)!', 'success');
          return { ...c, booked_count: c.booked_count + 1 };
        }
        return c;
      }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId,
          booking_date: new Date().toLocaleDateString()
        })
      });
      const data = await response.json();

      if (response.ok) {
        triggerToast('Class booked successfully!', 'success');
        fetchClasses(); // reload available counts
      } else {
        triggerToast(data.error || 'Failed to book slot', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error connecting to reservation system', 'error');
    }
  };

  const handlePurchaseMembership = async (planId) => {
    if (!user) {
      triggerToast('Please login to subscribe to a membership plan!', 'error');
      handleOpenLoginModal('member');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/membership/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ membership_type: planId })
      });
      const data = await response.json();

      if (response.ok) {
        triggerToast(`Successfully purchased ${planId.toUpperCase()} membership!`, 'success');
        
        // Update user state locally
        const updatedUser = { 
          ...user, 
          membership_status: data.membership_status, 
          membership_type: data.membership_type 
        };
        setUser(updatedUser);
        localStorage.setItem('apex_gym_user', JSON.stringify(updatedUser));
        setActiveTab('dashboard');
      } else {
        triggerToast(data.error || 'Plan purchase failed', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error purchasing membership plan', 'error');
    }
  };

  const categories = ['yoga', 'strength', 'cardio', 'hiit'];

  return (
    <div className="app-container">
      {/* Toast Alert */}
      {toast && (
        <div className="alert-toast" style={{
          borderLeftColor: toast.type === 'error' ? '#ef4444' : '#10b981'
        }}>
          <span>{toast.type === 'error' ? '❌' : '⚡'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        openLoginModal={handleOpenLoginModal}
      />

      <main className="main-content">
        {activeTab === 'home' && (
          <Home setActiveTab={setActiveTab} />
        )}

        {activeTab === 'memberships' && (
          <Memberships 
            user={user} 
            onPurchaseMembership={handlePurchaseMembership} 
          />
        )}

        {categories.includes(activeTab) && (
          <Classes 
            category={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            classes={classes} 
            onBookClass={handleBookClass} 
          />
        )}

        {activeTab === 'contact' && (
          <Contact triggerToast={triggerToast} />
        )}

        {activeTab === 'dashboard' && user && (
          <Dashboard 
            user={user} 
            token={token} 
            triggerToast={triggerToast}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'admin' && user && (user.role === 'admin' || user.role === 'owner') && (
          <AdminDashboard 
            user={user}
            token={token} 
            triggerToast={triggerToast} 
            classes={classes}
            fetchClasses={fetchClasses}
          />
        )}
      </main>

      <footer className="gym-footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} APEX PHYSIQUES. All Rights Reserved.</p>
          <div className="footer-links">
            <button onClick={() => setActiveTab('memberships')} className="footer-link-btn">Memberships</button>
            <button onClick={() => setActiveTab('yoga')} className="footer-link-btn">Yoga</button>
            <button onClick={() => setActiveTab('strength')} className="footer-link-btn">Strength</button>
            <button onClick={() => setActiveTab('cardio')} className="footer-link-btn">Cardio</button>
            <button onClick={() => setActiveTab('hiit')} className="footer-link-btn">HIIT</button>
            <button onClick={() => setActiveTab('contact')} className="footer-link-btn">Hours & Directions</button>
          </div>
        </div>
      </footer>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onAuthSuccess={handleAuthSuccess}
        triggerToast={triggerToast}
        portalType={loginPortal}
      />
    </div>
  );
}

export default App;
