import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Plus, Users, X } from 'lucide-react';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [newMemberPhone, setNewMemberPhone] = useState('');
  
  const [formData, setFormData] = useState({ 
      name: '', 
      daily_cap_per_member: 1, 
      approx_member_count: '',
      price_per_message: 0.05,
      tags: { city: '', state: '', language: '', interest: '' },
      monetization_enabled: false,
      consent_declared: false
  });

  useEffect(() => {
    if (user?._id) {
        fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    const res = await api.get(`/groups?user_id=${user._id}`);
    setGroups(res.data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/groups', { ...formData, price_per_message: Math.round(formData.price_per_message * 100), user_id: user._id });
    setShowCreateModal(false);
    fetchGroups();
  };

  const openMembersModal = async (group) => {
      setSelectedGroup(group);
      const res = await api.get(`/groups/${group._id}/members`);
      setMembers(res.data);
      setShowMembersModal(true);
  };

  const handleAddMember = async (e) => {
      e.preventDefault();
      await api.post('/groups/members', { group_id: selectedGroup._id, phones: [newMemberPhone] });
      setNewMemberPhone('');
      // Refresh members
      const res = await api.get(`/groups/${selectedGroup._id}/members`);
      setMembers(res.data);
      fetchGroups(); // Update count
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="header" style={{ marginBottom: 0 }}>My Groups</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: '0.5rem' }} /> New Group
        </button>
      </div>

      <div className="grid">
        {groups.map(g => (
          <div key={g._id} className="card">
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{g.name}</h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Members: {g.member_count} / {g.approx_member_count || '?'} <br/>
              Daily Cap: {g.daily_cap_per_member} <br/>
              Price: ₹{(g.price_per_message / 100).toFixed(2)} / msg <br/>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {g.tags && Object.values(g.tags).filter(Boolean).map((t, i) => (
                      <span key={i} style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>{t}</span>
                  ))}
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: g.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: g.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
                    fontSize: '0.75rem'
                }}>
                    {g.status}
                </span>
                <button className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--bg-tertiary)' }} onClick={() => openMembersModal(g)}>
                    <Users size={14} style={{ marginRight: '0.25rem' }} /> Manage
                </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="card" style={{ width: '400px' }}>
            <h2 style={{ marginBottom: '1rem' }}>Create Group</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Group Name</label>
                <input className="input" onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Daily Cap (msgs/user)</label>
                    <input type="number" className="input" value={formData.daily_cap_per_member} onChange={e => setFormData({...formData, daily_cap_per_member: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Approx. Members</label>
                    <input type="number" className="input" onChange={e => setFormData({...formData, approx_member_count: e.target.value})} required />
                  </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Price per Message (₹)</label>
                <input type="number" step="0.01" className="input" value={formData.price_per_message} onChange={e => setFormData({...formData, price_per_message: e.target.value})} required />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Brands will be charged this amount per message.</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tags</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input className="input" placeholder="City" onChange={e => setFormData({...formData, tags: {...formData.tags, city: e.target.value}})} />
                      <input className="input" placeholder="State" onChange={e => setFormData({...formData, tags: {...formData.tags, state: e.target.value}})} />
                      <input className="input" placeholder="Language" onChange={e => setFormData({...formData, tags: {...formData.tags, language: e.target.value}})} />
                      <input className="input" placeholder="Interest" onChange={e => setFormData({...formData, tags: {...formData.tags, interest: e.target.value}})} />
                  </div>
              </div>

              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <input type="checkbox" checked={formData.monetization_enabled} onChange={e => setFormData({...formData, monetization_enabled: e.target.checked})} />
                  <label>Enable Monetization</label>
              </div>

              {formData.monetization_enabled && (
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" required checked={formData.consent_declared} onChange={e => setFormData({...formData, consent_declared: e.target.checked})} />
                      <label>I confirm that all members have consented to receive promotional messages.</label>
                  </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--bg-tertiary)' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && selectedGroup && (
          <div className="modal-overlay" style={modalOverlayStyle}>
            <div className="card" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Members: {selectedGroup.name}</h2>
                    <button onClick={() => setShowMembersModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X size={20}/></button>
                </div>
                
                <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                        className="input" 
                        placeholder="+1234567890" 
                        value={newMemberPhone}
                        onChange={e => setNewMemberPhone(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn btn-primary"><Plus size={16}/> Add</button>
                </form>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.5rem' }}>Phone</th>
                                <th style={{ padding: '0.5rem' }}>Daily Sent</th>
                                <th style={{ padding: '0.5rem' }}>Last Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m._id} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.5rem' }}>{m.phone}</td>
                                    <td style={{ padding: '0.5rem' }}>{m.daily_sent_count}</td>
                                    <td style={{ padding: '0.5rem' }}>{m.last_sent_date ? new Date(m.last_sent_date).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                            {members.length === 0 && (
                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No members yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      )}
    </div>
  );
}

const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
};
