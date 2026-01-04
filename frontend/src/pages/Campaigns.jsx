import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Play } from 'lucide-react';

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    if (user?._id) {
        fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    const res = await api.get(`/campaigns?user_id=${user._id}`);
    setCampaigns(res.data);
  };
  
  const handleLaunch = async (id) => {
      await api.post(`/campaigns/${id}/launch`);
      fetchCampaigns();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="header" style={{ marginBottom: 0 }}>My Campaigns</h1>
        <div/> 
      </div>

      <div className="grid">
        {campaigns.map(c => {
           const estimatedTotal = c.budget_max ? Math.floor(c.budget_max / c.cost_per_msg) : 0;
           const progress = estimatedTotal > 0 ? Math.min((c.stats.sent / estimatedTotal) * 100, 100) : 0;

           return (
          <div key={c._id} className="card">
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{c.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{c.content}</p>
            
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    <span>Progress</span>
                    <span>{c.stats.sent} sent</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.5s' }} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivered</div>
                    <div style={{ fontWeight: 600, color: 'var(--success)' }}>{c.stats.delivered}</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Failed</div>
                    <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{c.stats.failed}</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: 'var(--accent-secondary)',
                    fontSize: '0.75rem'
                }}>
                    {c.status}
                </span>
                {c.status === 'DRAFT' && (
                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleLaunch(c._id)}>
                        <Play size={12} style={{ marginRight: '0.25rem' }} /> Launch
                    </button>
                )}
            </div>
          </div>
        )})}
      </div>

    </div>
  );
}
