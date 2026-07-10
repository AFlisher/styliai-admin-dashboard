import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, error, isLoading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }

    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      // Errors are also handled by AuthContext
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
