import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
  ArrowLeft, Clock, Check, AlertTriangle, Trash2, 
  Send, Users, DollarSign, Calendar, BarChart3, Plus, MoreVertical 
} from 'lucide-react';

export default function CampaignDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Add Group State
  const [showAddGroupsModal, setShowAddGroupsModal] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedNewGroups, setSelectedNewGroups] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  useEffect(() => {
    if (user?._id && id) {
      fetchCampaign();
    }
    // Poll for updates every 5 seconds if processing
    const interval = setInterval(() => {
        if (campaign && ['PROCESSING'].includes(campaign.status)) {
            fetchCampaign();
        }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, id, campaign?.status]);

  const fetchCampaign = async () => {
    try {
      const res = await api.get(`/campaigns?user_id=${user._id}`);
      const found = res.data.find(c => c._id === id);
      if (found) {
        setCampaign(found);
      } else {
        navigate('/campaigns');
      }
    } catch (err) {
      console.error('Failed to fetch campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/campaigns/${id}`, { 
        data: { user_id: user._id } 
      });
      navigate('/campaigns');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete campaign');
    }
  };

  const handleFetchAvailableGroups = async () => {
      try {
          const res = await api.get('/groups/available');
          // Don't filter here, just show them as disabled in the modal
          setAvailableGroups(res.data);
          setShowAddGroupsModal(true);
      } catch (err) {
          console.error("Failed to fetch groups", err);
      }
  };

  const handleAddGroups = async () => {
      try {
          await api.post(`/campaigns/${id}/groups`, {
              user_id: user._id,
              group_ids: selectedNewGroups
          });
          setShowAddGroupsModal(false);
          setSelectedNewGroups([]);
          fetchCampaign(); // Refresh
      } catch (err) {
          alert('Failed to add groups: ' + (err.response?.data?.error || err.message));
      }
  };

  const handleRemoveGroup = async (groupId) => {
    // ... existing ... 
  };

  const handleAddSchedule = async () => {
    try {
        const dateTime = `${newScheduleDate}T${newScheduleTime}`;
        await api.post(`/campaigns/${id}/schedule`, {
            user_id: user._id,
            additional_dates: [dateTime]
        });
        setShowAddScheduleModal(false);
        setNewScheduleDate('');
        setNewScheduleTime('');
        fetchCampaign();
    } catch (err) {
        alert('Failed to add schedule: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!campaign) return null;

  // Calculate Progress based on Estimated Cost (Target Volume) rather than Budget Max (Ceiling)
  const estimatedTotalMessages = campaign.estimated_cost ? Math.ceil(campaign.estimated_cost / (campaign.cost_per_msg || 5)) : 0;
  
  let progress = 0;
  if (campaign.status === 'COMPLETED' && (!campaign.recurrence || campaign.recurrence.type === 'NONE')) {
      progress = 100;
  } else if (estimatedTotalMessages > 0) {
      progress = Math.min((campaign.stats.sent / estimatedTotalMessages) * 100, 100);
  }
  
  const statusColors = {
      DRAFT: { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af', label: 'Draft' },
      SCHEDULED: { bg: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', label: 'Scheduled' },
      PROCESSING: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', label: 'Processing' },
      COMPLETED: { bg: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', label: 'Completed' },
      FAILED: { bg: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', label: 'Failed' }
  };
  const status = statusColors[campaign.status] || statusColors.DRAFT;
  const canDelete = ['DRAFT', 'SCHEDULED', 'FAILED'].includes(campaign.status);
  const canEdit = ['DRAFT', 'SCHEDULED'].includes(campaign.status);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/campaigns')}
        className="btn"
        style={{ background: 'transparent', paddingLeft: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}
      >
        <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} /> Back to Campaigns
      </button>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{campaign.name}</h1>
              <span style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', background: status.bg, color: status.color, fontSize: '0.75rem', fontWeight: 600 }}>
                {status.label}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Created on {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             {canDelete && (
                <button 
                  className="btn" 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={18} style={{ marginRight: '0.5rem' }} /> Delete
                </button>
             )}
           </div>
        </div>

        {campaign.status !== 'DRAFT' && (
           <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BarChart3 size={20} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 600 }}>Campaign Progress</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Sent</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{campaign.stats.sent}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Delivered</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{campaign.stats.delivered}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Failed</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{campaign.stats.failed}</div>
                  </div>
              </div>
           </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                   <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                       <Users size={18} /> Target Audience
                   </h3>
                   {canEdit && (
                       <button 
                           onClick={handleFetchAvailableGroups}
                           style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                       >
                           <Plus size={16} /> Add Groups
                       </button>
                   )}
               </div>
               <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
               <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                   {campaign.selected_group_ids && campaign.selected_group_ids.map(g => (
                       <div key={g._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem', position: 'relative' }}>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                               <span>{g.name}</span>
                               <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                   {(g.price_per_message / 100).toFixed(2)}/msg
                               </span>
                           </div>
                           
                           {canEdit && (
                               <div style={{ position: 'relative' }}>
                                   <button 
                                       onClick={() => setOpenMenuId(openMenuId === g._id ? null : g._id)}
                                       style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                                   >
                                       <MoreVertical size={16} />
                                   </button>
                                   
                                   {openMenuId === g._id && (
                                       <div style={{ 
                                           position: 'absolute', right: 0, top: '100%', 
                                           background: 'var(--bg-secondary)', border: '1px solid var(--border)', 
                                           borderRadius: 'var(--radius-sm)', zIndex: 10, minWidth: '120px',
                                           boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                       }}>
                                           <button 
                                               onClick={() => handleRemoveGroup(g._id)}
                                               style={{ 
                                                   display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                                   width: '100%', padding: '0.5rem', border: 'none', background: 'transparent', 
                                                   color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left'
                                               }}
                                           >
                                               <Trash2 size={14} /> Remove
                                           </button>
                                       </div>
                                   )}
                               </div>
                           )}
                           
                           {!canEdit && (
                               <span style={{ color: 'var(--text-secondary)' }}>
                                   {(g.price_per_message / 100).toFixed(2)}/msg
                               </span>
                           )}
                       </div>
                   ))}
               </div>
               </div>
            </div>

            <div>
               <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <DollarSign size={18} /> Financials
               </h3>
               <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem' }}>
                       <span style={{ color: 'var(--text-secondary)' }}>Total Estimated Cost</span>
                       <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
                           ₹{((campaign.estimated_cost || 0) / 100).toFixed(2)}
                       </span>
                   </div>
                   {campaign.budget_max > 0 && campaign.budget_max !== campaign.estimated_cost && (
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                           <span style={{ color: 'var(--text-secondary)' }}>Max Budget Cap</span>
                           <span style={{ color: 'var(--text-primary)' }}>
                               ₹{(campaign.budget_max / 100).toFixed(2)}
                           </span>
                       </div>
                   )}
               </div>
            </div>
        </div>
        
        <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Message Content</h3>
            <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', lineHeight: 1.6 }}>
                {campaign.content}
            </div>
        </div>
      </div>

      {campaign.scheduled_at && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={20} />
                  <span>Scheduled for: <strong>{new Date(campaign.scheduled_at).toLocaleString()}</strong></span>
              </div>
              
              {campaign.recurrence && campaign.recurrence.type !== 'NONE' && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                            <Clock size={16} />
                            <span>Recurrence: {campaign.recurrence.type}</span>
                        </div>
                        {canEdit && (campaign.recurrence.type === 'CUSTOM' || campaign.recurrence.type === 'NONE') && (
                            <button 
                                onClick={() => setShowAddScheduleModal(true)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                <Plus size={14} /> Add Schedule
                            </button>
                        )}
                      </div>
                      
                      {campaign.recurrence.type === 'CUSTOM' && campaign.recurrence.custom_dates && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                              {campaign.recurrence.custom_dates.map((d, i) => (
                                  <span key={i} style={{ 
                                      fontSize: '0.75rem', padding: '0.25rem 0.5rem', 
                                      background: 'rgba(99, 102, 241, 0.1)', color: 'var(--text-primary)', borderRadius: '4px' 
                                  }}>
                                      {new Date(d).toLocaleDateString()}
                                  </span>
                              ))}
                          </div>
                      )}
                      
                      {['DAILY', 'WEEKLY', 'MONTHLY'].includes(campaign.recurrence.type) && campaign.recurrence.end_date && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              Ending on: {new Date(campaign.recurrence.end_date).toLocaleDateString()}
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}

      {/* Add Groups Modal */}
      {showAddGroupsModal && (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
             <h3>Add Groups to Campaign</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                 Select groups to add to this campaign breakdown.
             </p>
             <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', marginBottom: '1rem' }}>
                 {availableGroups.length === 0 ? <p style={{ padding: '1rem', textAlign: 'center' }}>No groups found active & monetized.</p> : availableGroups.map(g => {
                     const isAlreadyIn = campaign.selected_group_ids.some(existing => existing._id === g._id);
                     const isSelectedNew = selectedNewGroups.includes(g._id);
                     
                     return (
                     <div key={g._id} 
                        onClick={() => {
                            if (isAlreadyIn) return;
                            if (isSelectedNew) {
                                setSelectedNewGroups(prev => prev.filter(id => id !== g._id));
                            } else {
                                setSelectedNewGroups(prev => [...prev, g._id]);
                            }
                        }}
                        style={{
                            padding: '0.75rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)',
                            background: isAlreadyIn ? 'var(--bg-secondary)' : (isSelectedNew ? 'rgba(99, 102, 241, 0.1)' : 'transparent'),
                            border: isSelectedNew ? '1px solid var(--accent-primary)' : '1px solid transparent',
                            cursor: isAlreadyIn ? 'not-allowed' : 'pointer', 
                            display: 'flex', justifyContent: 'space-between',
                            opacity: isAlreadyIn ? 0.6 : 1
                        }}
                     >
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             {isAlreadyIn && <Check size={16} color="var(--success)" />}
                             <span>{g.name}</span>
                         </div>
                         <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                             {isAlreadyIn ? 'Added' : `₹${(g.price_per_message / 100).toFixed(2)}`}
                         </span>
                     </div>
                 )})}
             </div>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                 <button className="btn" style={{ background: 'var(--bg-tertiary)' }} onClick={() => setShowAddGroupsModal(false)}>Cancel</button>
                 <button className="btn btn-primary" onClick={handleAddGroups} disabled={selectedNewGroups.length === 0}>Add Selected</button>
             </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddScheduleModal && (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
             <h3>Add Schedule</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                 Select a date and time to run this campaign again.
             </p>
             <div style={{ marginBottom: '1rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Date</label>
                 <input 
                    type="date" 
                    className="input" 
                    min={new Date().toISOString().split('T')[0]}
                    value={newScheduleDate}
                    onChange={e => setNewScheduleDate(e.target.value)}
                    style={{ width: '100%', colorScheme: 'dark' }}
                 />
             </div>
             <div style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Time</label>
                 <input 
                    type="time" 
                    className="input" 
                    value={newScheduleTime}
                    onChange={e => setNewScheduleTime(e.target.value)}
                    style={{ width: '100%', colorScheme: 'dark' }}
                 />
             </div>
             
             <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                 <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Additional Cost</div>
                 <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                     +₹{((estimatedTotal / (campaign.recurrence?.custom_dates?.length + 1 || 1)) / 100).toFixed(2)}
                 </div>
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                 <button className="btn" style={{ background: 'var(--bg-tertiary)' }} onClick={() => setShowAddScheduleModal(false)}>Cancel</button>
                 <button className="btn btn-primary" onClick={handleAddSchedule} disabled={!newScheduleDate || !newScheduleTime}>Add Schedule</button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
             <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                 <div style={{ width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                     <Trash2 size={32} />
                 </div>
                 <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Delete Campaign?</h2>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                     Are you sure you want to delete this campaign? This action cannot be undone.
                 </p>
             </div>
             <div style={{ display: 'flex', gap: '1rem' }}>
                 <button className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)', color: 'white' }} onClick={() => setDeleteConfirm(false)}>
                     Cancel
                 </button>
                 <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={handleDelete}>
                     Delete
                 </button>
             </div>
          </div>
        </div>
      )}

      <div style={{ height: '4rem' }} />
    </div>
  );
}
