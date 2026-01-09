import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
  CreditCard, LayoutDashboard, Users, TrendingUp, 
  PlusCircle, Wallet, ArrowRight, ShieldCheck, 
  BarChart3, BadgeCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PLAN_NAMES = {
    'MONTHLY': 'Standard Monthly',
    'SIX_MONTH': 'Value Half-Year',
    'YEARLY': 'Pro Annual'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchStats();
  }, [user]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading dashboard...</div>;

  // Inline Styles for "Premium" look without Tailwind
  const styles = {
      container: {
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2rem',
      },
      header: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
      },
      title: {
          fontSize: '1.875rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
          margin: 0
      },
      subtitle: {
          color: 'var(--text-secondary)',
          margin: 0
      },
      actionBtn: {
          backgroundColor: 'white',
          color: 'black',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          border: 'none',
          cursor: 'pointer'
      },
      grid: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
      },
      card: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column'
      },
      cardHeader: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
      },
      iconBox: (color) => ({
          padding: '0.75rem',
          borderRadius: '9999px',
          backgroundColor: `${color}1A`, // 10% opacity hex
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
      }),
      statsLabel: {
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.25rem'
      },
      statsValue: {
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)'
      },
      sectionTitle: {
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '1rem'
      },
      listContainer: {
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
      },
      listItem: {
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background-color 0.2s'
      },
      listItemHover: {
          backgroundColor: 'var(--bg-tertiary)'
      },
      statusBadge: (color) => ({
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: `${color}1A`,
          color: color,
          textTransform: 'uppercase'
      })
  };

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <div>
           <h1 style={styles.title}>
             Hello, {user?.name} 👋
           </h1>
           <p style={styles.subtitle}>
             Here's what's happening with your {user.role === 'BRAND' ? 'campaigns' : 'groups'} today.
           </p>
        </div>
        <div>
            {user.role === 'BRAND' ? (
                 <Link to="/campaigns" style={styles.actionBtn}>
                    <PlusCircle size={18} /> New Campaign
                 </Link>
            ) : (
                 <Link to="/groups" style={styles.actionBtn}>
                    <PlusCircle size={18} /> Register Group
                 </Link>
            )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.grid}>
         {/* Common: Wallet */}
         <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div style={styles.iconBox('white')}> {/* White Icon */}
                    <Wallet size={24} />
                </div>
                {user.role === 'BRAND' ? (
                    <Link to="/wallet" className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', background: 'var(--bg-tertiary)', color: 'white', textDecoration: 'none' }}>Top up</Link>
                ) : (
                    <Link to="/wallet" className="btn" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', background: 'var(--bg-tertiary)', color: 'white', textDecoration: 'none' }}>Withdraw</Link>
                )}
            </div>
            <div style={styles.statsLabel}>Total Balance</div>
            <div style={styles.statsValue}>
                {stats?.currency === 'INR' ? '₹' : '$'}{(stats?.walletBalance / 100).toLocaleString()}
            </div>
         </div>

         {/* Role Specific Cards */}
         {user.role === 'BRAND' ? (
             <>
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox('white')}>
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div style={styles.statsLabel}>Active Campaigns</div>
                    <div style={styles.statsValue}>{stats?.brand?.activeCampaigns || 0}</div>
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox('white')}>
                            <ShieldCheck size={24} />
                        </div>
                        <Link to="/subscription" style={{ fontSize: '0.8rem', color: '#4ade80', textDecoration: 'none' }}>Upgrade</Link>
                    </div>
                    <div style={styles.statsLabel}>Subscription</div>
                    <div style={{...styles.statsValue, fontSize: '1.25rem', textTransform: 'uppercase'}}>
                        {user.subscription?.active ? (PLAN_NAMES[user.subscription.plan_id] || 'Active Plan') : 'Free Tier'}
                    </div>
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox('white')}>
                            <BarChart3 size={24} />
                        </div>
                    </div>
                    <div style={styles.statsLabel}>Total Spend</div>
                    <div style={styles.statsValue}>₹{(stats?.brand?.totalSpend / 100)?.toLocaleString() || 0}</div>
                </div>
             </>
         ) : (
             <>
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox('white')}> 
                            <Users size={24} />
                        </div>
                    </div>
                    <div style={styles.statsLabel}>Total Reach</div>
                    <div style={styles.statsValue}>{stats?.groupAdmin?.totalReach?.toLocaleString() || 0}</div>
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox('white')}>
                            <LayoutDashboard size={24} />
                        </div>
                    </div>
                    <div style={styles.statsLabel}>Managed Groups</div>
                    <div style={styles.statsValue}>{stats?.groupAdmin?.totalGroups || 0}</div>
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox('white')}>
                            <BadgeCheck size={24} />
                        </div>
                    </div>
                    <div style={styles.statsLabel}>Verified Groups</div>
                    <div style={styles.statsValue}>{stats?.groupAdmin?.verifiedGroups || 0}</div>
                </div>
             </>
         )}
      </div>

      {/* Recent Activity Section */}
      <h2 style={styles.sectionTitle}>
        {user.role === 'BRAND' ? 'Recent Campaigns' : 'Top Performing Groups'}
      </h2>
      
      <div style={styles.listContainer}>
        {user.role === 'BRAND' ? (
           stats?.recentActivity?.length > 0 ? (
             <div>
               {stats.recentActivity.map((campaign, idx) => (
                 <div key={campaign._id} 
                      style={{...styles.listItem, borderBottom: idx === stats.recentActivity.length - 1 ? 'none' : '1px solid var(--border)'}}>
                    <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{campaign.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(campaign.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={styles.statusBadge(
                            campaign.status === 'ACTIVE' ? '#22c55e' : 
                            campaign.status === 'COMPLETED' ? '#3b82f6' : '#6b7280'
                        )}>
                            {campaign.status}
                        </span>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>₹{campaign.cost?.toLocaleString()}</div>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No campaigns yet. <Link to="/campaigns" style={{ color: 'var(--accent-primary)' }}>Create your first one.</Link>
             </div>
           )
        ) : (
           stats?.topGroups?.length > 0 ? (
             <div>
                {stats.topGroups.map((group, idx) => (
                    <div key={idx} 
                         style={{...styles.listItem, borderBottom: idx === stats.topGroups.length - 1 ? 'none' : '1px solid var(--border)'}}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem'
                            }}>
                                #{idx + 1}
                            </div>
                            <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{group.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {group.category?.toLowerCase() || 'general'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Users size={16} />
                            <span style={{ fontSize: '0.9rem' }}>{group.memberCount} members</span>
                        </div>
                    </div>
                ))}
             </div>
           ) : (
             <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No groups added. <Link to="/groups" style={{ color: 'var(--accent-primary)' }}>Register a group.</Link>
             </div>
           )
        )}
      </div>

    </div>
  );
}
