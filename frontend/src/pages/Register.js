import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep]               = useState(1); // 1=form, 2=otp
  const [form, setForm]               = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'staff'
  });
  const [sessionToken, setSessionToken] = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [loading, setLoading]         = useState(false);
  const [resending, setResending]     = useState(false);
  const [error, setError]             = useState('');

  // ── Step 1: submit form → send OTP ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password || !form.role) {
      setError('All fields are required'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/register/send-otp', {
        username: form.username,
        email:    form.email,
        password: form.password,
        role:     form.role,
      });
      setSessionToken(res.data.sessionToken);
      toast.success('OTP sent! Check your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5)
      document.getElementById(`rotp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`rotp-${index - 1}`)?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      document.getElementById('rotp-5')?.focus();
    }
  };

  // ── Step 2: verify OTP → create account ──────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Enter the complete 6-digit OTP'); return;
    }
    setLoading(true);
    try {
      await API.post('/auth/register/verify-otp', {
        sessionToken,
        otp: otpString,
      });
      toast.success('Account created successfully! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await API.post('/auth/register/resend-otp', { sessionToken });
      setOtp(['', '', '', '', '', '']);
      toast.success('New OTP sent!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>ElectroStock</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
            {step === 1 ? 'Create your account' : 'Verify your email'}
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, padding: 32,
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
        }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            {[{ n: 1, label: 'Details' }, { n: 2, label: 'Verify Email' }].map(({ n, label }) => (
              <React.Fragment key={n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: step >= n ? '#2563eb' : '#e5e7eb',
                    color: step >= n ? '#fff' : '#9ca3af'
                  }}>
                    {step > n ? '✓' : n}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    color: step >= n ? '#2563eb' : '#9ca3af'
                  }}>{label}</span>
                </div>
                {n < 2 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: step > n ? '#2563eb' : '#e5e7eb',
                    borderRadius: 99
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* ── STEP 1: Registration form ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c', marginBottom: 24 }}>
                Register
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Username</label>
                  <input className="form-control" type="text" placeholder="Choose a username"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email"
                    placeholder="Enter your real email address"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                    📧 We'll send a verification OTP to this email
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input className="form-control" type="password" placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input className="form-control" type="password" placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                      Passwords do not match
                    </div>
                  )}
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 8 }}>
                  {loading ? 'Sending OTP...' : '📧 Send Verification OTP'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: OTP verification ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a202c', marginBottom: 6 }}>
                Verify Your Email
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
                A 6-digit OTP was sent to <strong>{form.email}</strong>.
                Enter it below to complete registration.
              </p>

              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <label>6-Digit OTP</label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`rotp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        style={{
                          width: 46, height: 52, textAlign: 'center',
                          fontSize: 22, fontWeight: 700,
                          border: `2px solid ${digit ? '#16a34a' : '#d1d5db'}`,
                          borderRadius: 10, outline: 'none',
                          background: digit ? '#f0fdf4' : '#fff',
                          color: '#15803d', transition: 'all 0.15s'
                        }}
                      />
                    ))}
                  </div>

                  {/* resend */}
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <button type="button" onClick={handleResend} disabled={resending}
                      style={{
                        background: 'none', border: 'none',
                        color: '#2563eb', cursor: 'pointer',
                        fontSize: 13, fontWeight: 500
                      }}>
                      {resending ? 'Resending...' : "Didn't receive it? Resend OTP"}
                    </button>
                  </div>
                </div>

                {/* info box */}
                <div style={{
                  background: '#f0fdf4', border: '1px solid #86efac',
                  borderRadius: 8, padding: '12px 16px', marginBottom: 20
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>
                    ✅ OTP sent successfully — your email exists and is valid.
                    This OTP expires in <strong>10 minutes</strong>.
                  </p>
                </div>

                <button className="btn btn-primary" type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                  {loading ? 'Verifying...' : '✅ Verify & Create Account'}
                </button>

                {/* go back */}
                <button type="button" onClick={() => { setStep(1); setError(''); }}
                  style={{
                    width: '100%', marginTop: 10, padding: '9px',
                    background: 'transparent', border: '1px solid #e5e7eb',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 14, color: '#6b7280'
                  }}>
                  ← Change Email / Go Back
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}