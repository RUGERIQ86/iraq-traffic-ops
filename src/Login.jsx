import { useState } from 'react';
import { supabase } from './supabaseClient';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLogin(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h2>SECURE ACCESS</h2>
          <p>RESTRICTED AREA // AUTHORIZED PERSONNEL ONLY</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>OPERATOR ID (EMAIL)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ENTER ID..."
              required
            />
          </div>
          
          <div className="input-group">
            <label>ACCESS CODE (PASSWORD)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER CODE..."
              required
            />
          </div>

          {error && <div className="error-msg">ACCESS DENIED: {error}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'AUTHENTICATING...' : 'INITIATE LINK'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>SYSTEM STATUS: ONLINE</p>
          <p>ENCRYPTION: AES-256</p>
        </div>
      </div>

      {/* Background Effects */}
      <div className="scanline"></div>
      <div className="vignette"></div>
    </div>
  );
};

export default Login;
