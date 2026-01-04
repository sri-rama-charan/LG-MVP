import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Search, Filter, Play } from 'lucide-react';
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

  // Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const openCreateModal = (group) => {
      setSelectedGroup(group);
      setShowCreateModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
        await api.post('/campaigns', { 
            name: formData.name, 
            content: formData.content, 
            selected_group_ids: [selectedGroup._id], 
            cost_per_msg: selectedGroup.price_per_message, 
            user_id: user._id 
        });
        setShowCreateModal(false);
        navigate('/campaigns'); // Redirect to history
    } catch(err) {
        alert('Failed to create campaign');
    }
  };

  // Get unique categories for dropdown
  const categories = [...new Set(groups.map(g => g.tags?.interest).filter(Boolean))];

  return (
    <div>
      <h1 className="header">Marketplace</h1>
      
      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input className="input" placeholder="Search groups..." style={{ paddingLeft: '2.5rem' }} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <input className="input" placeholder="Location (City/State)" value={location} onChange={e => setLocation(e.target.value)} />
              
              <input type="number" className="input" placeholder="Min Members" value={minMembers} onChange={e => setMinMembers(e.target.value)} />
              
              <input type="number" className="input" placeholder="Max Price (₹)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
      </div>

      <div className="grid">
        {filteredGroups.map(g => (
          <div key={g._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                 <h3 style={{ margin: 0 }}>{g.name}</h3>
                 <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-primary)', borderRadius: '99px', color: 'var(--text-secondary)' }}>
                     {g.tags?.interest || 'General'}
                 </span>
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {g.tags?.city && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📍 {g.tags.city}</span>}
                    {g.tags?.language && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🗣️ {g.tags.language}</span>}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Members</div>
                        <div style={{ fontWeight: 600 }}>{g.member_count}</div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Price/Msg</div>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>₹{(g.price_per_message / 100).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }} onClick={() => openCreateModal(g)}>
                Select & Create Campaign
            </button>
          </div>
        ))}
      </div>
      
      {filteredGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No groups found matching your filters.
          </div>
      )}

      {showCreateModal && selectedGroup && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px' }}>
            <h2 style={{ marginBottom: '1rem' }}>New Campaign for {selectedGroup.name}</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Campaign Name</label>
                <input className="input" onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Content</label>
                <textarea className="input" rows={3} onChange={e => setFormData({...formData, content: e.target.value})} required />
              </div>
              
              <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Audience:</span>
                  <span style={{ fontWeight: 600, marginLeft: '0.5rem' }}>{selectedGroup.member_count} members</span>
                  <br/>
                  <span style={{ color: 'var(--text-secondary)' }}>Cost per message:</span> 
                  <span style={{ fontWeight: 600, marginLeft: '0.5rem', color: 'var(--success)' }}>₹{(selectedGroup.price_per_message / 100).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--bg-tertiary)' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
