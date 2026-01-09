import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Megaphone, Wallet, LogOut, ShoppingBag } from 'lucide-react';
import logo from '../assets/logo.png';

const PLAN_NAMES = {
    'MONTHLY': 'Standard Monthly',
    'SIX_MONTH': 'Value Half-Year',
    'YEARLY': 'Pro Annual'
};

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
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logo} alt="Leverage Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Leverage</span>
        </div>
        
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        
        {user?.role === 'GROUP_ADMIN' && (
            <NavItem to="/groups" icon={Users} label="My Groups" />
        )}
        
        <NavItem to="/wallet" icon={Wallet} label="Wallet" />

        {user?.role === 'BRAND' && (
            <>
                <NavItem to="/marketplace" icon={ShoppingBag} label="Marketplace" />
                <NavItem to="/campaigns" icon={Megaphone} label="My Campaigns" />
                
                {/* Subscription Badge in Sidebar */}
                <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current Plan</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                        {user.subscription?.active ? (PLAN_NAMES[user.subscription.plan_id] || 'Active Plan') : 'Free Tier'} 
                    </div>
                    <Link to="/subscription" style={{ fontSize: '0.75rem', color: 'white', textDecoration: 'underline', marginTop: '0.25rem', display: 'block' }}>Manage Sub</Link>
                </div>
            </>
        )}

        
        
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
