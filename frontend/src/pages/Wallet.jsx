import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Wallet as WalletIcon, ArrowUpCircle, Filter, DollarSign, X } from 'lucide-react';

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
    <div>
      <h1 className="header">Wallet</h1>
      
      <div className="grid">
          <div className="card" style={{ background: isBrand ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'linear-gradient(135deg, var(--success), #10b981)', color: 'white', border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <WalletIcon size={24} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>{isBrand ? 'Balance' : 'Total Earnings'}</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 700 }}>
                  ₹{(wallet.balance / 100).toFixed(2)}
              </div>
              <div style={{ opacity: 0.8, marginTop: '0.5rem' }}>
                  {wallet.currency}
              </div>
          </div>
          
          <div className="card">
              {isBrand ? (
                <>
                  <h3>Quick Top Up</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Add funds to your wallet to run campaigns.</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>₹</span>
                      <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      <button className="btn btn-primary" onClick={handleTopUp}>
                          <ArrowUpCircle size={16} style={{ marginRight: '0.5rem' }} /> Top Up
                      </button>
                  </div>
                  <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      * This is a manual top-up simulation for MVP.
                  </div>
                </>
              ) : (
                <>
                  <h3>Withdraw Funds</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Request a payout to your bank account.</p>
                  <button className="btn btn-primary" style={{ background: 'var(--bg-tertiary)' }} onClick={() => setShowPayoutModal(true)}>
                      <DollarSign size={16} style={{ marginRight: '0.5rem' }} /> Request Payout
                  </button>
                 </>
              )}
          </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', marginBottom: '1rem' }}>
        <h2 className="header" style={{ margin: 0, fontSize: '1.25rem' }}>
            {isBrand ? 'Transactions' : 'Earnings History'}
        </h2>
        
        {!isBrand && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <Filter size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input 
                        className="input" 
                        placeholder="Filter by Group" 
                        style={{ paddingLeft: '2rem', height: '36px' }} 
                        value={filterGroup}
                        onChange={e => setFilterGroup(e.target.value)}
                    />
                </div>
                <input 
                    type="date" 
                    className="input" 
                    style={{ height: '36px' }}
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                />
            </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                  <tr>
                      <th style={{ padding: '1rem' }}>Type</th>
                      <th style={{ padding: '1rem' }}>Amount</th>
                      <th style={{ padding: '1rem' }}>Description</th>
                      {!isBrand && <th style={{ padding: '1rem' }}>Group</th>}
                      <th style={{ padding: '1rem' }}>Date</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredTransactions.map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem', color: t.type === 'CREDIT' ? 'var(--success)' : 'var(--text-primary)' }}>{t.type}</td>
                          <td style={{ padding: '1rem' }}>{(t.amount / 100).toFixed(2)}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{t.description}</td>
                          {!isBrand && <td style={{ padding: '1rem' }}>{t.metadata?.group_name || '-'}</td>}
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(t.timestamp).toLocaleDateString()}</td>
                      </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                      <tr><td colSpan={isBrand ? 4 : 5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions found</td></tr>
                  )}
              </tbody>
          </table>
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
                        <button type="button" className="btn" style={{ background: 'var(--bg-tertiary)' }} onClick={() => setShowPayoutModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Request</button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
}
