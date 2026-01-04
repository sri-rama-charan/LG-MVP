import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="header">Dashboard</h1>
      <div className="card">
        <h2>Welcome back, {user?.name}</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          You are logged in as a <strong style={{color: 'var(--accent-secondary)'}}>{user?.role}</strong>.
        </p>
        
        <div className="grid" style={{ marginTop: '2rem' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Status</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>Active</div>
          </div>
          <div className="card" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Notifications</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
