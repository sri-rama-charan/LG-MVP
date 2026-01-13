import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Building, Check, Loader, X } from 'lucide-react';

const PLANS = [
    { id: 'MONTHLY', name: 'Standard Monthly', price: 999, label: '/month', features: ['Create Campaigns', 'Basic Analytics', 'Email Support'] },
    { id: 'SIX_MONTH', name: 'Value Half-Year', price: 4999, label: '/6 months', features: ['All Standard Features', 'Priority Support', 'Save ₹1000'] },
    { id: 'YEARLY', name: 'Pro Annual', price: 8999, label: '/year', features: ['All Features', 'Dedicated Manager', 'Save ₹3000'] }
];

export default function Subscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Payment Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentStep, setPaymentStep] = useState('SELECTION'); // SELECTION, DETAILS, PIN
  const [paymentMethod, setPaymentMethod] = useState(''); 
  const [paymentStatus, setPaymentStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS
  const [pin, setPin] = useState('');

  const handleSelectPlan = (plan) => {
      setSelectedPlan(plan);
      setPaymentStatus('IDLE');
      setPaymentStep('SELECTION');
      setPaymentMethod('');
      setPin('');
      setShowModal(true);
  };

  const handleMethodSelect = (method) => {
      setPaymentMethod(method);
      setPaymentStep('DETAILS');
  };

  const handleDetailsSubmit = (e) => {
      e.preventDefault();
      setPaymentStep('PIN');
  };

  const processPayment = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
        alert('Please enter a 4-digit PIN');
        return;
    }
    setPaymentStatus('PROCESSING');
    
    // Simulate Payment Gateway Delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        const res = await api.post('/subscriptions/purchase', { 
            plan_id: selectedPlan.id, 
            user_id: user._id 
        });
        
        setPaymentStatus('SUCCESS');
        
        // Wait a moment before redirecting
        setTimeout(() => {
             const updatedUser = res.data.user;
             localStorage.setItem('user', JSON.stringify(updatedUser)); // Hack for immediate update
             window.location.href = '/dashboard';
        }, 1500);

    } catch (err) {
        alert('Purchase Failed: ' + (err.response?.data?.error || err.message));
        setPaymentStatus('IDLE');
        setPaymentStep('DETAILS'); // Go back to details on failure
    }
  };

  const currentPlan = user?.subscription?.plan_id || 'NONE';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-10" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="text-3xl font-bold mb-2" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Pro Subscriptions</h1>
        <p className="text-gray-400" style={{ color: 'var(--text-secondary)' }}>Manage your plan and unlock premium features.</p>
      </div>

      {/* Current Plan Details Section */}
      <div className="card" style={{ marginBottom: '3rem', padding: '2rem', border: '1px solid var(--accent-primary)', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                     <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Current Subscription</h2>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                             Plan: <strong style={{ color: 'var(--accent-primary)' }}>{user?.subscription?.active ? (PLANS.find(p => p.id === user.subscription.plan_id)?.name || 'Active Plan') : 'Free Tier'}</strong>
                         </div>
                         <span style={{ 
                             padding: '0.25rem 0.75rem', borderRadius: '1rem', 
                             background: user?.subscription?.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)', 
                             color: user?.subscription?.active ? 'var(--success)' : 'var(--text-secondary)',
                             fontSize: '0.75rem', fontWeight: 600
                         }}>
                             {user?.subscription?.active ? 'ACTIVE' : 'INACTIVE'}
                         </span>
                     </div>
                </div>
                {user?.subscription?.active && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Next Billing Date</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                    </div>
                )}
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Campaign Limit</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user?.subscription?.active ? 'Unlimited' : '5 / month'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Analytics</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user?.subscription?.active ? 'Advanced' : 'Basic'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Support</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user?.subscription?.active ? 'Priority 24/7' : 'Email Only'}</div>
                </div>
            </div>
      </div>

      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Available Upgrades</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
                <div key={plan.id} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', position: 'relative', border: isCurrent ? '2px solid var(--accent-primary)' : '1px solid var(--border)' }}>
                    
                    {isCurrent && (
                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent-primary)', color: 'white', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 'bold', borderBottomLeftRadius: 'var(--radius-md)' }}>
                            CURRENT PLAN
                        </div>
                    )}

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                        ₹{plan.price.toLocaleString()}
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{plan.label}</span>
                    </div>
                    
                    <ul style={{ marginTop: '1.5rem', marginBottom: '2rem', flexGrow: 1, listStyle: 'none', padding: 0 }}>
                        {plan.features.map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>✓</span> {f}
                            </li>
                        ))}
                    </ul>

                    <button 
                        onClick={() => handleSelectPlan(plan)}
                        disabled={loading || isCurrent}
                        className="btn"
                        style={{ 
                            width: '100%', 
                            background: isCurrent ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                            color: isCurrent ? 'var(--text-secondary)' : 'white',
                            cursor: isCurrent ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isCurrent ? 'Active Plan' : 'Subscribe Now'}
                    </button>
                </div>
            );
        })}
      </div>

      {/* Payment Gateway Modal */}
      {showModal && selectedPlan && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(8px)', fontFamily: "'Inter', sans-serif"
        }}>
            <div className="card" style={{ 
                width: '100%', maxWidth: '480px', padding: 0, overflow: 'hidden', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
                background: '#121212', border: '1px solid #333', borderRadius: '16px' 
            }}>
                {/* Secure Header */}
                <div style={{ 
                    padding: '1.25rem 1.5rem', borderBottom: '1px solid #2d2d2d', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    background: '#1a1a1a' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '50%' }}>
                            <Check size={16} style={{ color: '#10b981' }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Secure Checkout</h3>
                            <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar (Visual only) */}
                <div style={{ height: '4px', background: '#2d2d2d', width: '100%' }}>
                    <div style={{ 
                        height: '100%', background: 'var(--accent-primary)', 
                        width: paymentStep === 'SELECTION' ? '33%' : paymentStep === 'DETAILS' ? '66%' : '100%',
                        transition: 'width 0.3s ease'
                    }}></div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    {paymentStatus === 'SUCCESS' ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                           <div style={{ 
                               width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', 
                               display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                               boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
                           }}>
                               <Check size={40} color="white" strokeWidth={3} />
                           </div>
                           <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white', fontWeight: 700 }}>Payment Successful</h3>
                           <p style={{ color: '#888' }}>Redirecting to your dashboard...</p>
                        </div>
                    ) : (
                        <>
                            {/* Order Summary Strip */}
                            <div style={{ 
                                marginBottom: '2rem', padding: '1rem', borderRadius: '12px', 
                                background: 'linear-gradient(145deg, #1a1a1a, #222)', border: '1px solid #333',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan</div>
                                    <div style={{ color: 'white', fontWeight: 600 }}>{selectedPlan.name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</div>
                                    <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>₹{selectedPlan.price.toLocaleString()}</div>
                                </div>
                            </div>

                            {paymentStep === 'SELECTION' ? (
                                <div>
                                    <h4 style={{ fontSize: '0.875rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Select Payment Method</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {[
                                            { id: 'CARD', icon: CreditCard, label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay', badge: 'Popular' },
                                            { id: 'UPI', icon: Smartphone, label: 'UPI', sub: 'GPay, PhonePe, Paytm', badge: 'Instant' },
                                            { id: 'NETBANKING', icon: Building, label: 'Net Banking', sub: 'All Major Banks', badge: null }
                                        ].map((m) => (
                                            <button 
                                                key={m.id}
                                                onClick={() => handleMethodSelect(m.id)} 
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', padding: '1rem', 
                                                    background: '#1a1a1a', border: '1px solid #333', 
                                                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                                    width: '100%', textAlign: 'left',
                                                    position: 'relative', overflow: 'hidden'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                                    e.currentTarget.style.background = '#222';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = '#333';
                                                    e.currentTarget.style.background = '#1a1a1a';
                                                }}
                                            >
                                                <div style={{ 
                                                    background: '#2d2d2d', padding: '10px', borderRadius: '10px', marginRight: '1rem',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <m.icon size={22} color="white" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{m.label}</div>
                                                    <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '2px' }}>{m.sub}</div>
                                                </div>
                                                {m.badge && (
                                                    <span style={{ 
                                                        fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                                                        background: 'var(--accent-primary)', color: 'white', opacity: 0.9
                                                    }}>
                                                        {m.badge}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '2rem', textAlign: 'center', color: '#444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                             {/* Simulated Card Logos (just colored boxes for MVP visually) */}
                                             {[1,2,3,4].map(i => <div key={i} style={{ width: '24px', height: '16px', background: '#333', borderRadius: '2px' }}></div>)}
                                        </div>
                                        <span>Trusted by 10,000+ businesses</span>
                                    </div>
                                </div>
                            ) : paymentStep === 'DETAILS' ? (
                                <form onSubmit={handleDetailsSubmit}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', color: 'white', fontWeight: 600 }}>
                                                {paymentMethod === 'CARD' && 'Card Details'}
                                                {paymentMethod === 'UPI' && 'UPI Information'}
                                                {paymentMethod === 'NETBANKING' && 'Bank Selection'}
                                            </h4>
                                            <button type="button" onClick={() => setPaymentStep('SELECTION')} style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                                                Change
                                            </button>
                                        </div>

                                        {paymentMethod === 'CARD' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 500 }}>CARD NUMBER</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                                        <input 
                                                            type="text" placeholder="0000 0000 0000 0000" required 
                                                            style={{ 
                                                                width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', 
                                                                padding: '12px 12px 12px 40px', color: 'white', fontSize: '0.95rem', fontFamily: 'monospace'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 500 }}>EXPIRY</label>
                                                        <input 
                                                            type="text" placeholder="MM/YY" required 
                                                            style={{ 
                                                                width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', 
                                                                padding: '12px', color: 'white', fontSize: '0.95rem', textAlign: 'center'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 500 }}>CVC</label>
                                                        <input 
                                                            type="text" placeholder="123" required 
                                                            style={{ 
                                                                width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', 
                                                                padding: '12px', color: 'white', fontSize: '0.95rem', textAlign: 'center'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 500 }}>CARDHOLDER NAME</label>
                                                    <input 
                                                        type="text" placeholder="JOHN DOE" required 
                                                        style={{ 
                                                            width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', 
                                                            padding: '12px', color: 'white', fontSize: '0.95rem', textTransform: 'uppercase'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {paymentMethod === 'UPI' && (
                                            <div>
                                                 <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 500 }}>UPI ID / VPA</label>
                                                 <div style={{ position: 'relative' }}>
                                                        <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                                        <input 
                                                            type="text" placeholder="username@okhdfcbank" required 
                                                            style={{ 
                                                                width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', 
                                                                padding: '12px 12px 12px 40px', color: 'white', fontSize: '0.95rem'
                                                            }}
                                                        />
                                                </div>
                                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', fontSize: '0.85rem', color: '#10b981', lineHeight: '1.4' }}>
                                                    Ensure your UPI app is installed and active on this device or near you.
                                                </div>
                                            </div>
                                        )}

                                        {paymentMethod === 'NETBANKING' && (
                                            <div>
                                                <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', fontWeight: 500 }}>SELECT BANK</label>
                                                <select 
                                                    required
                                                    style={{ 
                                                        width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', 
                                                        padding: '12px', color: 'white', fontSize: '0.95rem', cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="">Choose a Bank...</option>
                                                    <option value="HDFC">HDFC Bank</option>
                                                    <option value="ICICI">ICICI Bank</option>
                                                    <option value="SBI">State Bank of India</option>
                                                    <option value="AXIS">Axis Bank</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '1rem', background: 'var(--accent-primary)', border: 'none', color: 'white', fontWeight: 600, fontSize: '1rem', borderRadius: '10px' }}
                                    >
                                        Proceed securely
                                    </button>
                                </form>
                            ) : (
                                // PIN STEP
                                <form onSubmit={processPayment}>
                                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                        <div style={{ width: '60px', height: '60px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                            <div style={{ fontSize: '1.5rem' }}>🔒</div>
                                        </div>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.25rem' }}>Authenticate Request</h3>
                                        <p style={{ color: '#888', fontSize: '0.875rem' }}>
                                            Enter your 4-digit {paymentMethod === 'UPI' ? 'UPI PIN' : 'OTP'} to authorize <strong style={{ color: 'white' }}>₹{selectedPlan.price.toLocaleString()}</strong>
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                                         <input 
                                            type="password" 
                                            placeholder="••••" 
                                            maxLength={4}
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value)}
                                            style={{ 
                                                fontSize: '2rem', textAlign: 'center', letterSpacing: '8px', 
                                                padding: '0.5rem', width: '200px', border: 'none', borderBottom: '2px solid var(--accent-primary)',
                                                background: 'transparent', color: 'white', outline: 'none'
                                            }} 
                                            autoFocus
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => setPaymentStep('DETAILS')}
                                            style={{ 
                                                background: 'transparent', border: '1px solid #333', 
                                                padding: '1rem', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                                flex: '0 0 auto',
                                                color: 'white'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            style={{ 
                                                flex: 1, padding: '1rem', background: 'var(--accent-primary)', border: 'none', 
                                                color: 'white', fontWeight: 600, fontSize: '1rem', borderRadius: '10px',
                                                cursor: 'pointer', opacity: paymentStatus === 'PROCESSING' ? 0.7 : 1
                                            }}
                                            disabled={paymentStatus === 'PROCESSING'}
                                        >
                                            {paymentStatus === 'PROCESSING' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                    <Loader className="animate-spin" size={20} /> Processing...
                                                </span>
                                            ) : (
                                                `Pay ₹${selectedPlan.price.toLocaleString()}`
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
