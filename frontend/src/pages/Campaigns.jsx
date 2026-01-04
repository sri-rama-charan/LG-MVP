import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Play, Plus, X, Search, Check, Clock } from 'lucide-react';

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [costEstimate, setCostEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    scheduleType: 'immediate', // 'immediate' or 'scheduled'
    scheduled_at: '',
    budget_max: ''
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    state: '',
    language: '',
    interest: '',
    profession: ''
  });

  useEffect(() => {
    if (user?._id) {
        fetchCampaigns();
        fetchWallet();
    }
  }, [user]);

  useEffect(() => {
    if (showCreateModal) {
      fetchAvailableGroups();
    }
  }, [showCreateModal]);

  useEffect(() => {
    filterGroups();
  }, [availableGroups, filters]);

  useEffect(() => {
    if (selectedGroupIds.length > 0) {
      estimateCost();
    } else {
      setCostEstimate(null);
    }
  }, [selectedGroupIds]);

  const fetchCampaigns = async () => {
    const res = await api.get(`/campaigns?user_id=${user._id}`);
    setCampaigns(res.data);
  };

  const fetchWallet = async () => {
    try {
      const res = await api.get(`/wallet?user_id=${user._id}`);
      setWallet(res.data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  };

  const fetchAvailableGroups = async () => {
    try {
      const res = await api.get('/groups/available');
      setAvailableGroups(res.data);
      setFilteredGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const filterGroups = () => {
    let temp = availableGroups;
    
    if (filters.search) {
      temp = temp.filter(g => g.name.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.city) {
      temp = temp.filter(g => g.tags?.city?.toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (filters.state) {
      temp = temp.filter(g => g.tags?.state?.toLowerCase().includes(filters.state.toLowerCase()));
    }
    if (filters.language) {
      temp = temp.filter(g => g.tags?.language?.toLowerCase().includes(filters.language.toLowerCase()));
    }
    if (filters.interest) {
      temp = temp.filter(g => g.tags?.interest?.toLowerCase().includes(filters.interest.toLowerCase()));
    }
    if (filters.profession) {
      temp = temp.filter(g => g.tags?.profession?.toLowerCase().includes(filters.profession.toLowerCase()));
    }
    
    setFilteredGroups(temp);
  };

  const estimateCost = async () => {
    if (selectedGroupIds.length === 0) return;
    setLoadingEstimate(true);
    try {
      const res = await api.get(`/campaigns/estimate-cost?selected_group_ids=${selectedGroupIds.join(',')}`);
      setCostEstimate(res.data);
    } catch (err) {
      console.error('Failed to estimate cost:', err);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const toggleGroupSelection = (groupId) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (selectedGroupIds.length === 0) {
      alert('Please select at least one group');
      return;
    }

    if (!formData.content.trim()) {
      alert('Please enter campaign content');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        content: formData.content,
        selected_group_ids: selectedGroupIds,
        user_id: user._id
      };

      if (formData.scheduleType === 'scheduled' && formData.scheduled_at) {
        payload.scheduled_at = formData.scheduled_at;
      }

      if (formData.budget_max) {
        payload.budget_max = Math.round(parseFloat(formData.budget_max) * 100); // Convert to cents
      }

      await api.post('/campaigns', payload);
      setShowCreateModal(false);
      resetForm();
      fetchCampaigns();
      fetchWallet();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      scheduleType: 'immediate',
      scheduled_at: '',
      budget_max: ''
    });
    setSelectedGroupIds([]);
    setFilters({
      search: '',
      city: '',
      state: '',
      language: '',
      interest: '',
      profession: ''
    });
    setCostEstimate(null);
  };
  
  const handleLaunch = async (id) => {
      try {
        await api.post(`/campaigns/${id}/launch`);
        fetchCampaigns();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to launch campaign');
      }
  };

  // Get minimum datetime for scheduling (current time)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // At least 1 minute in future
    return now.toISOString().slice(0, 16);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="header" style={{ marginBottom: 0 }}>My Campaigns</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: '0.5rem' }} /> New Campaign
        </button>
      </div>

      <div className="grid">
        {campaigns.map(c => {
           const estimatedTotal = c.budget_max ? Math.floor(c.budget_max / c.cost_per_msg) : 0;
           const progress = estimatedTotal > 0 ? Math.min((c.stats.sent / estimatedTotal) * 100, 100) : 0;

           return (
          <div key={c._id} className="card">
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{c.name}</h3>
            {c.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>{c.description}</p>
            )}
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
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleLaunch(c._id)}>
                        <Play size={12} style={{ marginRight: '0.25rem' }} /> {c.status === 'SCHEDULED' ? 'Launch Now' : 'Launch'}
                    </button>
                )}
                {c.status === 'SCHEDULED' && c.scheduled_at && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Scheduled: {new Date(c.scheduled_at).toLocaleString()}
                  </div>
                )}
            </div>
          </div>
        )})}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="card" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Create New Campaign</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {/* Basic Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Campaign Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Campaign Name *</label>
                    <input 
                      type="text" 
                      className="input" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</label>
                    <textarea 
                      className="input" 
                      rows={2}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of the campaign"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Message Content *</label>
                    <textarea 
                      className="input" 
                      rows={4}
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      placeholder="Enter the message to send to group members"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Group Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Target Groups *</h3>
                
                {/* Filters */}
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-primary)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input 
                        className="input" 
                        placeholder="Search groups..." 
                        style={{ paddingLeft: '2.5rem' }}
                        value={filters.search}
                        onChange={e => setFilters({...filters, search: e.target.value})}
                      />
                    </div>
                    <input 
                      className="input" 
                      placeholder="City" 
                      value={filters.city}
                      onChange={e => setFilters({...filters, city: e.target.value})}
                    />
                    <input 
                      className="input" 
                      placeholder="State" 
                      value={filters.state}
                      onChange={e => setFilters({...filters, state: e.target.value})}
                    />
                    <input 
                      className="input" 
                      placeholder="Language" 
                      value={filters.language}
                      onChange={e => setFilters({...filters, language: e.target.value})}
                    />
                    <input 
                      className="input" 
                      placeholder="Interest" 
                      value={filters.interest}
                      onChange={e => setFilters({...filters, interest: e.target.value})}
                    />
                    <input 
                      className="input" 
                      placeholder="Profession" 
                      value={filters.profession}
                      onChange={e => setFilters({...filters, profession: e.target.value})}
                    />
                  </div>
                </div>

                {/* Group List */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                  {filteredGroups.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No groups found. Adjust your filters.
                    </div>
                  ) : (
                    filteredGroups.map(group => (
                      <div 
                        key={group._id}
                        onClick={() => toggleGroupSelection(group._id)}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: selectedGroupIds.includes(group._id) ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-primary)',
                          border: selectedGroupIds.includes(group._id) ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.875rem' }}>{group.name}</h4>
                            {selectedGroupIds.includes(group._id) && <Check size={16} color="var(--accent-primary)" />}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span>👥 {group.member_count || 0} members</span>
                            <span>💰 ₹{(group.price_per_message / 100).toFixed(2)}/msg</span>
                            {group.tags?.city && <span>📍 {group.tags.city}</span>}
                            {group.tags?.language && <span>🗣️ {group.tags.language}</span>}
                            {group.tags?.interest && <span>🎯 {group.tags.interest}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedGroupIds.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {selectedGroupIds.length} group(s) selected
                  </div>
                )}
              </div>

              {/* Cost Estimate */}
              {costEstimate && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Cost Estimate</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)' }}>Estimated Units</div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{costEstimate.estimated_units.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)' }}>Estimated Cost</div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--accent-primary)' }}>
                        ₹{(costEstimate.estimated_cost / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {wallet && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: wallet.balance >= costEstimate.estimated_cost ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Wallet Balance</div>
                      <div style={{ fontWeight: 600, color: wallet.balance >= costEstimate.estimated_cost ? 'var(--success)' : 'var(--danger)' }}>
                        ₹{(wallet.balance / 100).toFixed(2)}
                        {wallet.balance < costEstimate.estimated_cost && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                            (Insufficient - Top up required)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scheduling */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Scheduling</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="scheduleType" 
                        value="immediate"
                        checked={formData.scheduleType === 'immediate'}
                        onChange={e => setFormData({...formData, scheduleType: e.target.value})}
                      />
                      <span>Launch Immediately</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="scheduleType" 
                        value="scheduled"
                        checked={formData.scheduleType === 'scheduled'}
                        onChange={e => setFormData({...formData, scheduleType: e.target.value})}
                      />
                      <span>Schedule for Later</span>
                    </label>
                  </div>
                  {formData.scheduleType === 'scheduled' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Scheduled Date & Time *</label>
                      <input 
                        type="datetime-local" 
                        className="input"
                        min={getMinDateTime()}
                        value={formData.scheduled_at}
                        onChange={e => setFormData({...formData, scheduled_at: e.target.value})}
                        required={formData.scheduleType === 'scheduled'}
                      />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Messages will be sent between 9 AM - 9 PM only
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Budget (Optional) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Budget (Optional)</h3>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Maximum Budget (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input"
                    value={formData.budget_max}
                    onChange={e => setFormData({...formData, budget_max: e.target.value})}
                    placeholder="Leave empty to use estimated cost"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Campaign will stop when budget is reached. Defaults to estimated cost if not specified.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: 'var(--bg-tertiary)' }}
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={selectedGroupIds.length === 0 || loadingEstimate}
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};
