import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// OTP-based reset is handled entirely on /forgot-password now.
// This component simply redirects anyone who lands on /reset-password.
export default function ResetPassword() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/forgot-password', { replace: true }); }, [navigate]);
  return null;
}
