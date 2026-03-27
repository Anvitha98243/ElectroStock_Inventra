import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp+newpass
  const [email, setEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  // Step 1: send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email: email.trim() });
      setSessionToken(res.data.sessionToken);
      toast.success('OTP sent! Check your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await API.post('/auth/forgot-password', { email: email.trim() });
      setSessionToken(res.data.sessionToken);
      setOtp(['', '', '', '', '', '']);
      toast.success('New OTP sent!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  // OTP input box handler
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      document.getElementById('otp-5')?.focus();
    }
  };

  // Step 2: verify OTP + reset password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    const otpString = otp.join('');
    if (otpString.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
    if (!newPassword) { setError('New password is required'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        sessionToken,
        otp: otpString,
        newPassword
      });
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const len = newPassword.length;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNum = /\d/.test(newPassword);
    const strength = len >= 10 && hasUpper && hasNum ? 3 : len >= 8 ? 2 : len >= 6 ? 1 : 0;
    const labels = ['Too short', 'Weak', 'Fair', 'Strong'];
    const colors = ['#dc2626', '#d97706', '#2563eb', '#16a34a'];
    return { strength, label: labels[strength], color: colors[strength] };
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>ElectroStock</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Password Recovery</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            {[{ n: 1, label: 'Email' }, { n: 2, label: 'Verify & Reset' }].map(({ n, label }) => (
              <React.Fragment key={n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: step >= n ? '#2563eb' : '#e5e7eb',
                    color: step >= n ? '#fff' : '#9ca3af'
                  }}>{step > n ? '✓' : n}</div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: step >= n ? '#2563eb' : '#9ca3af' }}>{label}</span>
                </div>
                {n < 2 && <div style={{ flex: 1, height: 2, background: step > n ? '#2563eb' : '#e5e7eb', borderRadius: 99 }} />}
              </React.Fragment>
            ))}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* STEP 1: Email */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a202c', marginBottom: 6 }}>Forgot Password?</h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 22, lineHeight: 1.6 }}>
                Enter your registered email. We'll send a 6-digit OTP to verify it's you.
              </p>
              <form onSubmit={handleSendOTP}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input className="form-control" type="email" placeholder="your@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 4 }}>
                  {loading ? 'Sending OTP...' : '📧 Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: OTP + New Password */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a202c', marginBottom: 6 }}>Enter OTP & New Password</h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 22, lineHeight: 1.6 }}>
                A 6-digit OTP was sent to <strong>{email}</strong>. Enter it below along with your new password.
              </p>

              <form onSubmit={handleReset}>
                {/* OTP boxes */}
                <div className="form-group">
                  <label>6-Digit OTP</label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
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
                          border: `2px solid ${digit ? '#2563eb' : '#d1d5db'}`,
                          borderRadius: 10, outline: 'none',
                          background: digit ? '#eff6ff' : '#fff',
                          color: '#1d4ed8', transition: 'all 0.15s'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button type="button" onClick={handleResend} disabled={resending}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      {resending ? 'Resending...' : "Didn't receive it? Resend OTP"}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input className="form-control" type="password" placeholder="Min 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>

                {newPassword.length > 0 && (() => {
                  const { strength, label, color } = passwordStrength();
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[0,1,2,3].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= strength ? color : '#e5e7eb', transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color }}>{label}</div>
                    </div>
                  );
                })()}

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input className="form-control" type="password" placeholder="Repeat new password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Passwords do not match</div>
                  )}
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading || otp.join('').length !== 6}
                  style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 4 }}>
                  {loading ? 'Resetting...' : '🔒 Reset Password'}
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
