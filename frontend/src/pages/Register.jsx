import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', role: 'GROUP_ADMIN'
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('DETAILS'); // DETAILS | OTP
  const [error, setError] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        const res = await register(formData.name, formData.email, formData.password, formData.phone, formData.role);
        
        if (res.success) {
        if (res.data.status === 'PENDING_OTP') {
            setStep('OTP');
        } else {
            // Fallback for immediate success (if configured off)
            navigate('/login');
        }
        } else {
        setError(res.error);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        const res = await verifyOtp(formData.email, otp);
        if (res.success) {
            navigate('/dashboard'); // Auto login success
        } else {
            setError(res.error);
        }
      } finally {
        setLoading(false);
      }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            {step === 'OTP' ? 'Verify OTP' : 'Create Account'}
        </h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        
        {step === 'DETAILS' ? (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Name</label>
                <input type="text" name="name" className="input" onChange={handleChange} required />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email</label>
                <input type="email" name="email" className="input" onChange={handleChange} required />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Phone (E.164)</label>
                <input type="text" name="phone" className="input" placeholder="+1234567890" onChange={handleChange} required />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Role</label>
                <select name="role" className="input" onChange={handleChange}>
                <option value="GROUP_ADMIN">Group Admin</option>
                <option value="BRAND">Brand</option>
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
                <input type="password" name="password" className="input" onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
                {loading ? 'Sending OTP...' : 'Register & Verify'}
            </button>
            </form>
        ) : (
            <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Enter the 6-digit code sent to <br/><strong>{formData.email}</strong>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>One-Time Password</label>
                    <input 
                        type="text" 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)} 
                        className="input" 
                        placeholder="123456" 
                        required 
                        style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
                <button type="button" onClick={() => setStep('DETAILS')} className="btn" style={{ background: 'transparent', color: 'var(--text-secondary)' }} disabled={loading}>
                    Back
                </button>
            </form>
        )}

        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {step === 'DETAILS' && (
              <>Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)' }}>Login</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
