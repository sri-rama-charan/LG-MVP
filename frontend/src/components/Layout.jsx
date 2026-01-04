import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Megaphone, Wallet, LogOut, ShoppingBag } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className={`nav-item ${location.pathname === to ? 'active' : ''}`}>
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="layout">
      <div className="sidebar">
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent-primary)', borderRadius: '8px' }} />
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Leverage</span>
        </div>
        
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        
        {user?.role === 'GROUP_ADMIN' && (
            <NavItem to="/groups" icon={Users} label="My Groups" />
        )}

        {user?.role === 'BRAND' && (
            <>
                <NavItem to="/marketplace" icon={ShoppingBag} label="Marketplace" />
                <NavItem to="/campaigns" icon={Megaphone} label="My Campaigns" />
            </>
        )}

        <NavItem to="/wallet" icon={Wallet} label="Wallet" />
        
        <div style={{ marginTop: 'auto' }}>
            <button className="nav-item" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <LogOut size={20} />
                <span>Logout</span>
            </button>
        </div>
      </div>
      
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
