import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Plus, Users, X, Settings, MessageSquare, IndianRupee, Download, Trash2, Loader } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showScraperModal, setShowScraperModal] = useState(false);
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

  const handleDelete = async (groupId) => {
      if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
          try {
              await api.delete(`/groups/${groupId}`);
              fetchGroups();
          } catch (err) {
              alert('Failed to delete group: ' + err.message);
          }
      }
  };

  const handleScraperSave = async (data) => {
    // data contains: { name, daily_cap_per_member, price_per_message, tags, monetization_enabled, consent_declared, members: [...] }
    
    // Create group first
    const groupRes = await api.post('/groups', {
        name: data.name,
        daily_cap_per_member: data.daily_cap_per_member,
        approx_member_count: data.members.length,
        price_per_message: Math.round(data.price_per_message * 100), // Convert to paise
        tags: { ...data.tags, source: 'whatsapp_import' },
        monetization_enabled: data.monetization_enabled,
        consent_declared: data.consent_declared,
        user_id: user._id
    });
    
    const newGroupId = groupRes.data._id;
    
    // Add members
    // Optimized: Map scraper format to phone list with roles
    const phones = data.members.map(m => ({
        phone: m.phone,
        isAdmin: m.isAdmin,
        isSuperAdmin: m.isSuperAdmin
    }));
    await api.post('/groups/members', { group_id: newGroupId, phones });
    
    setShowScraperModal(false);
    fetchGroups();
    alert(`Imported ${phones.length} members into new group "${data.name}"`);
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={() => setShowScraperModal(true)}>
                <Download size={16} style={{ marginRight: '0.5rem', color: 'white' }} /> Import from WhatsApp
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} style={{ marginRight: '0.5rem' }} /> New Group
            </button>
        </div>
      </div>

      <div className="grid">
        {groups.map(g => (
          <div key={g._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0, overflow: 'hidden' }}>
            {/* Card Header with Gradient Accent */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, marginRight: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                             <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{g.name}</h3>
                             <button
                                 onClick={(e) => { e.stopPropagation(); handleDelete(g._id); }}
                                 style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                                 className="hover-danger"
                             >
                                 <Trash2 size={16} />
                             </button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Created {new Date().toLocaleDateString()}
                        </div>
                    </div>
                    <span style={{ 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '1rem', 
                        background: g.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: g.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.025em'
                    }}>
                        {g.status}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-primary)', color: 'white' }}>
                        <Users size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Members</div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{g.member_count} <span style={{ color: '#52525b' }}>/ {g.approx_member_count || '?'}</span></div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-primary)', color: 'white' }}>
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Daily Cap</div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{g.daily_cap_per_member}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-primary)', color: 'white' }}>
                        <IndianRupee size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Price</div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{(g.price_per_message / 100).toFixed(2)} / msg</div>
                    </div>
                </div>
            </div>

            {/* Tags and Footer */}
            <div style={{ marginTop: 'auto', padding: '0 1.25rem 1.25rem 1.25rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {g.tags && Object.values(g.tags).filter(Boolean).map((t, i) => (
                        <span key={i} style={{ 
                            background: 'var(--bg-primary)', border: '1px solid var(--border)',
                            padding: '0.25rem 0.6rem', borderRadius: '6px', 
                            fontSize: '0.7rem', color: 'var(--text-secondary)' 
                        }}>
                            {t}
                        </span>
                    ))}
                    {(!g.tags || Object.values(g.tags).filter(Boolean).length === 0) && (
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tags</span>
                    )}
                </div>

                <button 
                    className="btn" 
                    style={{ 
                        width: '100%', justifyContent: 'center', 
                        background: 'var(--bg-primary)', border: '1px solid var(--border)',
                        padding: '0.75rem', color: 'var(--text-primary)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onClick={() => openMembersModal(g)}
                >
                     Manage Group
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
                <button type="button" className="btn" style={{ background: 'var(--bg-tertiary)' , color: 'white'}} onClick={() => setShowCreateModal(false)}>Cancel</button>
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
                                    <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {m.phone}
                                        {m.isAdmin && (
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                padding: '0.1rem 0.4rem', 
                                                borderRadius: '4px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                Admin {m.isSuperAdmin && <span style={{ color: 'gold' }}>★</span>}
                                            </span>
                                        )}
                                    </td>
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

      {showScraperModal && (
          <ScraperModal onClose={() => setShowScraperModal(false)} onSave={handleScraperSave} />
      )}
    </div>
  );
}

const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
};

// ==========================================
// Scraper Modal Component (Internal) - Updated
// ==========================================

function ScraperModal({ onClose, onSave }) {
    const [step, setStep] = useState(1); // 1: Input, 2: Scan, 3: Success/Results
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const [scrapedData, setScrapedData] = useState(null); // { name, members, count }
    const [statusText, setStatusText] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    // Form State for Step 3
    const [groupForm, setGroupForm] = useState({
        name: '',
        daily_cap_per_member: 1,
        price_per_message: 0.10,
        tags: { city: '', state: '', language: '', interest: '' },
        monetization_enabled: false,
        consent_declared: false
    });

    // Poll for status when in step 2 (Scanning)
    useEffect(() => {
        let interval;
        if (step === 2) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get('/scraper/status');
                    if (res.data.qr && res.data.status !== 'authenticated') {
                        setQrValue(res.data.qr);
                    }
                    if (res.data.status === 'authenticated') {
                        // Connected! Now fetch data
                        setStatusText('Connected! Scraping members... (This may take a few seconds)');
                        doScrape();
                        clearInterval(interval);
                    }
                } catch (e) {
                    console.error('Poll error', e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [step]);

    // Init scraper on mount for faster UX
    useEffect(() => {
        const initScraper = async () => {
            try {
                // Fire and forget - polling in step 2 will handle status
                await api.post('/scraper/init'); 
            } catch (err) {
                console.error('Auto-init failed', err);
                // We don't block here, we let the user proceed. 
                // If init failed, step 2 might stay on "Generating..." or we can retry.
            }
        };
        initScraper();
    }, []);

    const startScraper = () => {
        if (!link.includes('chat.whatsapp.com')) {
            alert('Please enter a valid WhatsApp Group Link');
            return;
        }
        // Just move to next step, init is likely already running
        setStep(2);
    };

    const doScrape = async () => {
        try {
            const res = await api.post('/scraper/scrape', { link });
            const data = res.data;
            setScrapedData(data);
            setGroupForm(prev => ({ ...prev, name: data.name || 'Imported Group' })); // Pre-fill name
            setStep(3);
            
            // Auto logout after scrape
            await api.post('/scraper/logout');
        } catch (err) {
            alert('Scraping Failed: ' + (err.response?.data?.error || err.message));
            setStep(1); // Reset
        }
    };

    const handleSave = async () => {
        if (groupForm.monetization_enabled && !groupForm.consent_declared) {
            alert('Please confirm consent declaration.');
            return;
        }
        
        setIsSaving(true);
        try {
            await onSave({ 
                ...groupForm, 
                members: scrapedData.members 
            });
            // Modal usually closes here via parent
        } catch (e) {
            console.error(e);
            setIsSaving(false); // Re-enable if error
            alert('Save failed: ' + e.message);
        }
    };

    return (
        <div className="modal-overlay" style={modalOverlayStyle}>
            <div className="card" style={{ width: '500px', minHeight: '300px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Import from WhatsApp</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X size={20}/></button>
                </div>

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
                         <p style={{ color: 'var(--text-secondary)' }}>
                             Paste the WhatsApp Group Invite Link below. We will launch a secure browser session to fetch the member list.
                         </p>
                         <input 
                             className="input" 
                             placeholder="https://chat.whatsapp.com/..." 
                             value={link}
                             onChange={e => setLink(e.target.value)}
                         />
                         <button className="btn btn-primary" onClick={startScraper} disabled={loading}>
                             {loading ? 'Initializing...' : 'Next: Scan QR'}
                         </button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
                             {qrValue ? (
                                 <QRCode value={qrValue} size={200} />
                             ) : (
                                 <div style={{ width: '200px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', gap: '1rem' }}>
                                     <div className="spinner"></div>
                                     <span style={{ fontSize: '0.75rem', color: '#52525b', textAlign: 'center', padding: '0 1rem' }}>
                                         Generating QR...<br/>(Typical wait: 10-20s)
                                     </span>
                                 </div>
                             )}
                        </div>
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {statusText || 'Scan this QR Code with your WhatsApp (Linked Devices) to authorize scraping.'}
                        </p>
                    </div>
                )}

                {step === 3 && scrapedData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem' }}>
                            Success! Found {scrapedData.count} Members ({scrapedData.members.filter(m => m.isAdmin || m.isSuperAdmin).length} Admins).
                        </div>
                        
                        {/* Display Admins */}
                        {scrapedData.members.some(m => m.isAdmin || m.isSuperAdmin) && (
                            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                                    GROUP ADMINS
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {scrapedData.members.filter(m => m.isAdmin || m.isSuperAdmin).map((admin, idx) => (
                                        <span key={idx} style={{ 
                                            background: 'var(--bg-primary)', 
                                            border: '1px solid var(--border)', 
                                            padding: '0.25rem 0.5rem', 
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'monospace'
                                        }}>
                                            {admin.phone.split('@')[0]}
                                            {admin.isSuperAdmin && <span title="Super Admin" style={{ color: 'gold', marginLeft: '4px' }}>★</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Group Details Form */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Group Name</label>
                            <input className="input" value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} required />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Daily Cap</label>
                                <input type="number" className="input" value={groupForm.daily_cap_per_member} onChange={e => setGroupForm({...groupForm, daily_cap_per_member: e.target.value})} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Price (INR)</label>
                                <input type="number" step="0.01" className="input" value={groupForm.price_per_message} onChange={e => setGroupForm({...groupForm, price_per_message: e.target.value})} required />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Tags</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <input className="input" placeholder="City" onChange={e => setGroupForm({...groupForm, tags: {...groupForm.tags, city: e.target.value}})} />
                                <input className="input" placeholder="State" onChange={e => setGroupForm({...groupForm, tags: {...groupForm.tags, state: e.target.value}})} />
                                <input className="input" placeholder="Language" onChange={e => setGroupForm({...groupForm, tags: {...groupForm.tags, language: e.target.value}})} />
                                <input className="input" placeholder="Interest" onChange={e => setGroupForm({...groupForm, tags: {...groupForm.tags, interest: e.target.value}})} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            <input type="checkbox" checked={groupForm.monetization_enabled} onChange={e => setGroupForm({...groupForm, monetization_enabled: e.target.checked})} />
                            <label>Enable Monetization</label>
                        </div>
                        
                        {groupForm.monetization_enabled && (
                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={groupForm.consent_declared} onChange={e => setGroupForm({...groupForm, consent_declared: e.target.checked})} />
                                <label>I confirm consent for promotional messages.</label>
                            </div>
                        )}

                        <button 
                            className="btn btn-primary" 
                            style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%' }} 
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader className="spin" size={16} /> Saving...
                                </>
                            ) : (
                                `Save Group (${scrapedData.count} Members)`
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
