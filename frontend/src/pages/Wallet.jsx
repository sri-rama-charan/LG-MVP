import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Wallet as WalletIcon, ArrowUpCircle, Filter, DollarSign, X, CreditCard, Download, Upload, Activity, Search } from 'lucide-react';

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(1000); // Default 1000 Rupees 
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  
  // Filters
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (user?._id) {
        fetchWallet();
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
        const res = await api.get(`/wallet?user_id=${user._id}`);
        setWallet(res.data);
    } catch (err) {
        console.error('Failed to fetch wallet:', err);
    }
  };

  const handleTopUp = async () => {
      // Backend expects cents/paisa, so multiply by 100
      await api.post('/wallet/topup', { user_id: user._id, amount: parseInt(amount * 100) });
      fetchWallet();
  };

  const handlePayout = async (e) => {
      e.preventDefault();
      try {
        await api.post('/wallet/payout', { user_id: user._id, amount: parseInt(payoutAmount * 100), bank_details: bankDetails }); // Convert to cents
        setShowPayoutModal(false);
        fetchWallet();
        setPayoutAmount('');
        setBankDetails('');
        alert('Payout request submitted!');
      } catch(err) {
          alert(err.response?.data?.error || 'Payout failed');
      }
  };

  const isBrand = user?.role === 'BRAND';

  if (!wallet) return <div>Loading...</div>;
  
  // Filter Transactions
  const filteredTransactions = wallet.transactions.slice().reverse().filter(t => {
      if (filterGroup && t.metadata && t.metadata.group_name && !t.metadata.group_name.toLowerCase().includes(filterGroup.toLowerCase())) return false;
      if (filterDate && new Date(t.timestamp).toLocaleDateString() !== new Date(filterDate).toLocaleDateString()) return false;
      return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Wallet & Earnings</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage your funds and track your financial history.</p>
        </div>
        {isBrand && (
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Activity size={16} color="var(--success)" />
                <span>Status: <strong>Active</strong></span>
            </div>
        )}
      </div>
      
      <div className="grid" style={{ marginBottom: '3rem' }}>
          {/* Balance Card - Premium Gradient */}
          <div className="card" style={{ 
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
              color: 'white', 
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
          }}>
              {/* Background Shapes */}
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: 'full', backdropFilter: 'blur(4px)' }}>
                      <WalletIcon size={20} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.5px' }}>{isBrand ? 'AVAILABLE BALANCE' : 'LIFETIME EARNINGS'}</span>
                  </div>
                  <CreditCard size={24} style={{ opacity: 0.8 }} />
              </div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>
                      ₹{(wallet.balance / 100).toFixed(2)}
                  </div>
                  <div style={{ opacity: 0.8, marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{wallet.currency}</span>
                      <span>•</span>
                      <span>Updated just now</span>
                  </div>
              </div>
          </div>
          
          {/* Actions / Stats Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {isBrand ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <ArrowUpCircle size={24} color="var(--accent-primary)" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Add Funds</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Top up instantly via manual request</p>
                    </div>
                  </div>
                  
                  <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>Enter Amount</label>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-secondary)' }}>₹</span>
                              <input 
                                type="number" 
                                className="input" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                style={{ paddingLeft: '2.5rem', height: '48px', fontSize: '1.125rem' }}
                              />
                          </div>
                          <button 
                            className="btn btn-primary" 
                            onClick={handleTopUp}
                            style={{ height: '48px', padding: '0 1.5rem', fontSize: '1rem' }}
                          >
                              Top Up
                          </button>
                      </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <DollarSign size={24} color="var(--success)" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Withdraw Earnings</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Transfer to your bank account</p>
                    </div>
                  </div>
                  
                  <button 
                    className="btn" 
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: '60px', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 1.5rem', fontSize: '1rem' }} 
                    onClick={() => setShowPayoutModal(true)}
                  >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span>Request Payout</span>
                      </span>
                      <ArrowUpCircle size={20} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                  <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Payouts are processed within 24-48 hours. Minimum withdrawal amount is ₹100.
                  </div>
                 </>
              )}
          </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="header" style={{ margin: 0, fontSize: '1.5rem' }}>
                {isBrand ? 'Transaction History' : 'Earnings History'}
            </h2>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                {!isBrand && (
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input 
                            className="input" 
                            placeholder="Search group..." 
                            style={{ paddingLeft: '2.5rem', width: '200px' }} 
                            value={filterGroup}
                            onChange={e => setFilterGroup(e.target.value)}
                        />
                    </div>
                )}
                <div style={{ position: 'relative' }}>
                    <Filter size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input 
                        type="date" 
                        className="input" 
                        style={{ paddingLeft: '2.5rem', colorScheme: 'dark' }}
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                    />
                </div>
            </div>
        </div>
      
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.925rem' }}>
                <thead style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                        {!isBrand && <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group</th>}
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTransactions.map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.25rem 0.75rem', borderRadius: 'full', 
                                    fontSize: '0.75rem', fontWeight: 600,
                                    background: t.type === 'CREDIT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: t.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)'
                                }}>
                                    {t.type === 'CREDIT' ? <Download size={12} /> : <Upload size={12} />}
                                    {t.type}
                                </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>{t.description}</td>
                            {!isBrand && (
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    {t.metadata?.group_name ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                                            {t.metadata.group_name}
                                        </div>
                                    ) : <span style={{ color: 'var(--text-secondary)' }}>-</span>}
                                </td>
                            )}
                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                                {new Date(t.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, fontSize: '1rem', color: t.type === 'CREDIT' ? 'var(--success)' : 'var(--text-primary)' }}>
                                {t.type === 'CREDIT' ? '+' : '-'}₹{(t.amount / 100).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                        <tr><td colSpan={isBrand ? 4 : 5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '50%' }}><WalletIcon size={32} style={{ opacity: 0.5 }} /></div>
                                <div>No transactions found matching your filters.</div>
                            </div>
                        </td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {showPayoutModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Request Payout</h2>
                    <button onClick={() => setShowPayoutModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X size={20}/></button>
                </div>
                <form onSubmit={handlePayout}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Amount (₹)</label>
                        <input type="number" className="input" required value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} max={wallet.balance / 100} min="1" />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Max: ₹{(wallet.balance / 100).toFixed(2)}</div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Bank Details / UPI</label>
                        <textarea className="input" rows={3} required value={bankDetails} onChange={e => setBankDetails(e.target.value)} placeholder="Enter account number, IFSC, or UPI ID..." />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button type="button" className="btn" style={{ background: 'var(--bg-tertiary)', color: 'white' }} onClick={() => setShowPayoutModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Request</button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
}
