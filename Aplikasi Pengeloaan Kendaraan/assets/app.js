/* =========================================================
   Vehicle Rental System — Shared App Logic
   Handles auth, localStorage persistence, and seed data
   ========================================================= */

const STORAGE_KEY = 'vrs_data_v1';
const SESSION_KEY = 'vrs_session_v1';

// =========================================================
// Seed data — pre-populated demo content
// =========================================================
const SEED_DATA = {
  users: [
    { id: 1, username: 'admin', password: 'admin123', fullname: 'Admin Demo', role: 'admin', email: 'admin@school.demo' },
    { id: 2, username: 'user', password: 'user123', fullname: 'Sarah Wijaya', role: 'user', email: 'sarah@school.demo' },
    { id: 3, username: 'teacher', password: 'teacher123', fullname: 'Budi Santoso', role: 'user', email: 'budi@school.demo' }
  ],
  vehicles: [
    {
      id: 1,
      type: 'avanza',
      name: 'Toyota Avanza',
      plate: 'B 1234 ABC',
      seats: 7,
      year: 2021,
      status: 'available',
      icon: '🚗',
      description: 'Compact MPV, ideal for small group transport and short trips.'
    },
    {
      id: 2,
      type: 'avanza',
      name: 'Toyota Avanza',
      plate: 'B 5678 DEF',
      seats: 7,
      year: 2022,
      status: 'available',
      icon: '🚗',
      description: 'Compact MPV, ideal for small group transport and short trips.'
    },
    {
      id: 3,
      type: 'apv',
      name: 'Suzuki APV',
      plate: 'B 9012 GHI',
      seats: 8,
      year: 2020,
      status: 'available',
      icon: '🚙',
      description: 'Family-sized MPV with extra cargo space for school equipment.'
    },
    {
      id: 4,
      type: 'minibus20',
      name: 'Mini Bus 20-Seat',
      plate: 'B 3456 JKL',
      seats: 20,
      year: 2019,
      status: 'available',
      icon: '🚐',
      description: 'Mid-size bus suitable for class field trips and small events.'
    },
    {
      id: 5,
      type: 'minibus45',
      name: 'Mini Bus 45-Seat',
      plate: 'B 7890 MNO',
      seats: 45,
      year: 2021,
      status: 'maintenance',
      icon: '🚌',
      description: 'Large bus for full-class trips, sports tournaments, and major events.'
    },
    {
      id: 6,
      type: 'minibus45',
      name: 'Mini Bus 45-Seat',
      plate: 'B 1122 PQR',
      seats: 45,
      year: 2023,
      status: 'available',
      icon: '🚌',
      description: 'Large bus for full-class trips, sports tournaments, and major events.'
    }
  ],
  requests: [
    {
      id: 1001,
      userId: 2,
      requesterName: 'Sarah Wijaya',
      phone: '081234567890',
      schoolUnit: 'sma',
      vehicleId: 4,
      vehicleType: 'minibus20',
      requestDate: '2026-05-15',
      address: '123 Sudirman Street, Central Jakarta',
      standbyLocation: 'Main School Parking Lot',
      standbyTime: '07:00',
      activity: 'Grade 11 Science Field Trip to Bogor Botanical Gardens',
      participants: 18,
      startTime: '07:30',
      endTime: '17:00',
      notes: 'Need air conditioning. Two teachers will accompany.',
      status: 'approved',
      createdAt: '2026-05-01T10:30:00Z',
      reviewedAt: '2026-05-02T08:15:00Z',
      reviewedBy: 1,
      reviewNote: 'Approved. Ensure return by 17:30.'
    },
    {
      id: 1002,
      userId: 3,
      requesterName: 'Budi Santoso',
      phone: '081298765432',
      schoolUnit: 'smp',
      vehicleId: 1,
      vehicleType: 'avanza',
      requestDate: '2026-05-20',
      address: '45 Thamrin Avenue, Central Jakarta',
      standbyLocation: 'East Gate',
      standbyTime: '08:00',
      activity: 'Inter-school Mathematics Olympiad — Team Transport',
      participants: 5,
      startTime: '08:30',
      endTime: '15:00',
      notes: '',
      status: 'pending',
      createdAt: '2026-05-07T14:22:00Z',
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: ''
    },
    {
      id: 1003,
      userId: 2,
      requesterName: 'Sarah Wijaya',
      phone: '081234567890',
      schoolUnit: 'sd',
      vehicleId: 6,
      vehicleType: 'minibus45',
      requestDate: '2026-04-28',
      address: 'Ancol Dreamland, North Jakarta',
      standbyLocation: 'Front Gate',
      standbyTime: '08:00',
      activity: 'Grade 5 End-of-Semester Outing',
      participants: 42,
      startTime: '08:30',
      endTime: '16:30',
      notes: 'Will need to make a brief stop at Pluit for lunch pickup.',
      status: 'approved',
      createdAt: '2026-04-20T11:00:00Z',
      reviewedAt: '2026-04-21T09:30:00Z',
      reviewedBy: 1,
      reviewNote: 'Approved with the noted lunch stop.'
    },
    {
      id: 1004,
      userId: 3,
      requesterName: 'Budi Santoso',
      phone: '081298765432',
      schoolUnit: 'tk',
      vehicleId: 3,
      vehicleType: 'apv',
      requestDate: '2026-05-25',
      address: 'Local Pediatric Clinic, Kelapa Gading',
      standbyLocation: 'Side Entrance',
      standbyTime: '09:00',
      activity: 'Health Check-up for Kindergarten Students',
      participants: 6,
      startTime: '09:30',
      endTime: '12:30',
      notes: 'Small group of students plus 2 caretakers.',
      status: 'rejected',
      createdAt: '2026-05-08T16:00:00Z',
      reviewedAt: '2026-05-09T08:00:00Z',
      reviewedBy: 1,
      reviewNote: 'APV unavailable on this date — already booked. Please rebook with Avanza or different date.'
    }
  ]
};

// =========================================================
// Data persistence layer
// =========================================================
const DB = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.save(SEED_DATA);
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      this.save(SEED_DATA);
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
  },
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
    return this.load();
  }
};

// =========================================================
// Authentication
// =========================================================
const Auth = {
  login(username, password) {
    const data = DB.load();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (!user) return null;
    const session = { id: user.id, username: user.username, fullname: user.fullname, role: user.role, email: user.email };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },
  current() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  },
  require(role = null) {
    const user = this.current();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === 'admin' ? 'admin.html' : 'catalog.html';
      return null;
    }
    return user;
  }
};

// =========================================================
// Helpers
// =========================================================
const fmt = {
  date(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  dateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  time(t) {
    if (!t) return '—';
    return t;
  },
  unit(u) {
    return ({ tk: 'Kindergarten', sd: 'Elementary', smp: 'Middle School', sma: 'High School', smk: 'Vocational' })[u] || u.toUpperCase();
  },
  vehicleType(t) {
    return ({ avanza: 'Toyota Avanza', apv: 'Suzuki APV', minibus20: 'Mini Bus 20-Seat', minibus45: 'Mini Bus 45-Seat' })[t] || t;
  },
  status(s) {
    return ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' })[s] || s;
  }
};

const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// =========================================================
// Sidebar rendering (used across authenticated pages)
// =========================================================
function renderSidebar(activePage) {
  const user = Auth.current();
  if (!user) return '';

  const adminLinks = [
    { id: 'admin', href: 'admin.html', label: 'Dashboard', icon: '📊' },
    { id: 'admin-requests', href: 'admin.html#requests', label: 'All Requests', icon: '📋' },
    { id: 'catalog', href: 'catalog.html', label: 'Vehicles', icon: '🚗' }
  ];
  const userLinks = [
    { id: 'catalog', href: 'catalog.html', label: 'Browse Vehicles', icon: '🚗' },
    { id: 'request', href: 'request.html', label: 'New Request', icon: '➕' },
    { id: 'my-requests', href: 'my-requests.html', label: 'My Requests', icon: '📋' }
  ];

  const links = user.role === 'admin' ? adminLinks : userLinks;
  const initials = user.fullname.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="logo">
          <div class="logo-mark">V</div>
          <div>
            <div>VRS</div>
          </div>
        </div>
        <div class="logo-sub">Vehicle Rental System</div>
      </div>
      <div class="sidebar-section">${user.role === 'admin' ? 'Administration' : 'Menu'}</div>
      <ul class="sidebar-nav">
        ${links.map(l => `
          <li><a href="${l.href}" class="${activePage === l.id ? 'active' : ''}">
            <span class="icon">${l.icon}</span> ${l.label}
          </a></li>
        `).join('')}
      </ul>
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(user.fullname)}</div>
            <div class="user-role">${user.role}</div>
          </div>
          <button class="logout-btn" onclick="Auth.logout()" title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>`;
}

function renderMobileHeader(title) {
  return `
    <div class="mobile-header">
      <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open'); document.querySelector('.sidebar-overlay').classList.toggle('show')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div style="font-weight:600;">${title || 'VRS'}</div>
    </div>
    <div class="sidebar-overlay" onclick="document.querySelector('.sidebar').classList.remove('open'); this.classList.remove('show')"></div>
  `;
}

// =========================================================
// Demo banner
// =========================================================
function renderDemoBanner() {
  return `<div class="demo-banner">
    🎭 Demo Mode — All data stored locally in your browser. Original built in PHP + MySQL (2022). 
    <a href="#" onclick="if(confirm('Reset all demo data to original seed?')){DB.reset();location.reload();}return false;">Reset demo data</a>
  </div>`;
}
