import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Search, Filter, Play, Users, MapPin, Globe, Tag, X, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [minMembers, setMinMembers] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Quick create modal
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formData, setFormData] = useState({ name: '', content: '' });

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
      filterGroups();
  }, [groups, search, category, location, minMembers, maxPrice]);

  const fetchGroups = async () => {
    const res = await api.get('/groups/available');
    setGroups(res.data);
    setFilteredGroups(res.data);
  };

  const filterGroups = () => {
      let temp = groups;
      if (search) {
          temp = temp.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
      }
      if (category) {
          temp = temp.filter(g => g.tags?.interest?.toLowerCase().includes(category.toLowerCase()));
      }
      if (location) {
          temp = temp.filter(g => 
              g.tags?.city?.toLowerCase().includes(location.toLowerCase()) || 
              g.tags?.state?.toLowerCase().includes(location.toLowerCase())
          );
      }
      if (minMembers) {
          temp = temp.filter(g => (g.member_count || 0) >= parseInt(minMembers));
      }
      if (maxPrice) {
          temp = temp.filter(g => (g.price_per_message / 100) <= parseFloat(maxPrice));
      }
      setFilteredGroups(temp);
  };

  const openQuickCreateModal = (group) => {
      setSelectedGroup(group);
      setFormData({ name: '', content: '' });
      setShowQuickCreateModal(true);
  };

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    try {
        await api.post('/campaigns', { 
            name: formData.name, 
            content: formData.content, 
            selected_group_ids: [selectedGroup._id], 
            cost_per_msg: selectedGroup.price_per_message, 
            user_id: user._id 
        });
        setShowQuickCreateModal(false);
        navigate('/campaigns'); // Redirect to campaigns page
    } catch(err) {
        alert(err.response?.data?.error || 'Failed to create campaign');
    }
  };

  const goToFullCreate = (group) => {
    // Store selected group in sessionStorage and redirect to campaigns page
    sessionStorage.setItem('preselectedGroup', JSON.stringify(group));
    navigate('/campaigns');
  };

  // Get unique categories for dropdown
  const categories = [...new Set(groups.map(g => g.tags?.interest).filter(Boolean))];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="header" style={{ marginBottom: '0.5rem' }}>Marketplace</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Browse available WhatsApp groups and create targeted campaigns
        </p>
      </div>
      
      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    className="input" 
                    placeholder="Search groups..." 
                    style={{ paddingLeft: '2.5rem', height: '42px' }} 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                  />
              </div>
              
              <select 
                className="input" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                style={{ height: '42px' }}
              >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <input 
                className="input" 
                placeholder="Location (City/State)" 
                value={location} 
                onChange={e => setLocation(e.target.value)}
                style={{ height: '42px' }}
              />
              
              <input 
                type="number" 
                className="input" 
                placeholder="Min Members" 
                value={minMembers} 
                onChange={e => setMinMembers(e.target.value)}
                style={{ height: '42px' }}
              />
              
              <input 
                type="number" 
                step="0.01"
                className="input" 
                placeholder="Max Price (₹)" 
                value={maxPrice} 
                onChange={e => setMaxPrice(e.target.value)}
                style={{ height: '42px' }}
              />
          </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No groups found</h3>
          <p>Try adjusting your filters to see more results</p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredGroups.map(g => (
            <div 
              key={g._id} 
              className="card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 }}>{g.name}</h3>
                  {g.tags?.interest && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.625rem', 
                      background: 'rgba(99, 102, 241, 0.2)', 
                      borderRadius: '99px', 
                      color: 'var(--accent-primary)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      marginLeft: '0.5rem'
                    }}>
                      {g.tags.interest}
                    </span>
                  )}
                </div>
                
                {/* Tags */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {g.tags?.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} />
                      <span>{g.tags.city}</span>
                    </div>
                  )}
                  {g.tags?.language && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Globe size={14} />
                      <span>{g.tags.language}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '0.75rem', 
                marginBottom: '1.5rem',
                padding: '0.75rem',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>Members</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    {g.member_count || 0}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <Tag size={16} style={{ color: 'var(--text-secondary)' }} />
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>Price/Msg</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--success)' }}>
                    ₹{(g.price_per_message / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '40px', fontWeight: 600 }}
                  onClick={() => goToFullCreate(g)}
                >
                  Create Campaign
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    height: '36px', 
                    background: 'var(--bg-tertiary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'white'
                  }}
                  onClick={() => openQuickCreateModal(g)}
                >
                  Quick Create
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Create Modal */}
      {showQuickCreateModal && selectedGroup && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', position: 'relative' }}>
            <button 
              onClick={() => setShowQuickCreateModal(false)} 
              style={{ 
                position: 'absolute', 
                top: '1rem', 
                right: '1rem', 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <X size={20} />
            </button>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Quick Create Campaign</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Create a draft campaign for <strong>{selectedGroup.name}</strong>
              </p>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '1.5rem',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                <Info size={18} style={{ color: 'var(--accent-primary)', marginTop: '0.125rem', flexShrink: 0 }} />
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What is a Draft?</strong>
                  <p style={{ margin: '0.5rem 0 0 0', lineHeight: 1.5 }}>
                    A draft campaign is saved but not launched. You can review, edit, schedule, or launch it later from the "My Campaigns" page.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleQuickCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Campaign Name *</label>
                <input 
                  className="input" 
                  placeholder="e.g., Summer Sale Promotion"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Message Content *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  placeholder="Enter your promotional message..."
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})} 
                  required 
                />
              </div>
              
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                background: 'var(--bg-primary)', 
                borderRadius: 'var(--radius-md)', 
                fontSize: '0.875rem' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Audience:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedGroup.member_count || 0} members</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cost per message:</span> 
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{(selectedGroup.price_per_message / 100).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: 'var(--bg-tertiary)' , color: 'white'}}
                  onClick={() => setShowQuickCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 600 }}>
                  Create Draft
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
  backgroundColor: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};
