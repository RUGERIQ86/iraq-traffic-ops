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
      {/* Tactical Logo */}
      <div className="tactical-logo-container" style={{textAlign: 'center', marginBottom: '20px'}}>
        <svg viewBox="0 0 200 200" className="tactical-logo" style={{width: '120px', height: '120px', filter: 'drop-shadow(0 0 10px #00ffff)'}}>
          {/* Outer Shield */}
          <path d="M100 10 L190 50 L190 140 L100 190 L10 140 L10 50 Z" 
                fill="none" stroke="#00ffff" strokeWidth="2" />
          <path d="M100 15 L185 53 L185 138 L100 185 L15 138 L15 53 Z" 
                fill="rgba(0, 255, 255, 0.1)" stroke="none" />
          
          {/* Inner Hexagon */}
          <path d="M100 30 L160 65 L160 135 L100 170 L40 135 L40 65 Z" 
                fill="none" stroke="#00ffff" strokeWidth="1" opacity="0.5" />

          {/* Crosshair */}
          <circle cx="100" cy="100" r="30" fill="none" stroke="#ff0000" strokeWidth="2" />
          <line x1="100" y1="60" x2="100" y2="80" stroke="#ff0000" strokeWidth="2" />
          <line x1="100" y1="120" x2="100" y2="140" stroke="#ff0000" strokeWidth="2" />
          <line x1="60" y1="100" x2="80" y2="100" stroke="#ff0000" strokeWidth="2" />
          <line x1="120" y1="100" x2="140" y2="100" stroke="#ff0000" strokeWidth="2" />

          {/* Center Dot */}
          <circle cx="100" cy="100" r="3" fill="#ff0000" />

          {/* Text */}
          <text x="100" y="45" textAnchor="middle" fill="#00ffff" fontSize="14" fontWeight="bold" letterSpacing="2" style={{textShadow: '0 0 5px #00ffff'}}>OPS</text>
          <text x="100" y="165" textAnchor="middle" fill="#00ffff" fontSize="16" fontWeight="bold" letterSpacing="2" style={{textShadow: '0 0 5px #00ffff'}}>RUGER IQ</text>
          
          {/* Tech Decorations */}
          <rect x="95" y="10" width="10" height="5" fill="#00ffff" />
          <rect x="95" y="185" width="10" height="5" fill="#00ffff" />
        </svg>
      </div>

      <div className="login-box">
        <div className="login-header">
          <h2>SECURE ACCESS</h2>
          <p style={{color: '#ff3333', fontWeight: 'bold', letterSpacing: '1px'}}>⚠️ RESTRICTED AREA // AUTHORIZED PERSONNEL ONLY ⚠️</p>
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
          <div style={{marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px'}}>
             <p style={{color: '#00ffff', fontSize: '12px', letterSpacing: '1px'}}>DEVELOPED BY <span style={{fontWeight: 'bold', textShadow: '0 0 5px #00ffff'}}>RUGER IQ</span></p>
             <p style={{color: '#555', fontSize: '10px'}}>INTELLECTUAL PROPERTY © 2026</p>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="scanline"></div>
      <div className="vignette"></div>
    </div>
  );
};

export default Login;
