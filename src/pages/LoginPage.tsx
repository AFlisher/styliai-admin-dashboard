import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, error, isLoading, clearError, mfaRequired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }

    // SEC-15.2: only sent once the backend has said this account needs it. The
    // password is resubmitted with it - there is no half-authenticated session
    // held anywhere in between.
    if (mfaRequired && !code.trim()) {
      setLocalError(
        useRecoveryCode ? 'Enter a recovery code.' : 'Enter your 6-digit code.'
      );
      return;
    }

    const secondFactor = mfaRequired
      ? useRecoveryCode
        ? { recoveryCode: code.trim() }
        : { totpCode: code.trim() }
      : undefined;

    try {
      await login(email.trim(), password.trim(), secondFactor);
    } catch (err: any) {
      // Errors are also handled by AuthContext
    } finally {
      // Never leave a used or rejected code in the field.
      setCode('');
    }
  };

  const activeError = localError || error;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-header">
          <div className="logo-icon">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <h1>StyliAI Admin</h1>
          <p>AI Platform Management</p>
        </div>

        {activeError && (
          <div className="login-error-alert">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{activeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <i className="fa-regular fa-envelope input-icon"></i>
              <input
                id="email"
                type="email"
                placeholder="admin@styliai.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (localError) setLocalError(null);
                  clearError();
                }}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-lock input-icon"></i>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                  clearError();
                }}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {mfaRequired && (
            <div className="form-group">
              <label htmlFor="mfa-code">
                {useRecoveryCode ? 'Recovery Code' : 'Authentication Code'}
              </label>
              <div className="input-with-icon">
                <i className="fa-solid fa-shield-halved input-icon"></i>
                <input
                  id="mfa-code"
                  name="mfa-code"
                  type="text"
                  inputMode={useRecoveryCode ? 'text' : 'numeric'}
                  autoComplete="one-time-code"
                  placeholder={useRecoveryCode ? 'XXXXXXXX-XXXXXXXX' : '000000'}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (localError) setLocalError(null);
                    clearError();
                  }}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
              <button
                type="button"
                className="login-mfa-toggle"
                onClick={() => {
                  setUseRecoveryCode((v) => !v);
                  setCode('');
                  setLocalError(null);
                  clearError();
                }}
                disabled={isLoading}
              >
                {useRecoveryCode
                  ? 'Use your authenticator app instead'
                  : "Lost your device? Use a recovery code"}
              </button>
            </div>
          )}

          <button
            type="submit"
            className={`btn login-submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
