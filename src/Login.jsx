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
    <div className="login-container" style={{
        backgroundImage: 'url(/aga_bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000000'
    }}>
      <div className="login-box" style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(3px)',
          border: '1px solid #ff9900',
          boxShadow: '0 0 20px rgba(255, 153, 0, 0.3)'
      }}>
        <div className="login-header">
          <h2 style={{color: '#ff9900', textShadow: '0 0 10px #ff9900'}}>SECURE ACCESS</h2>
          <p style={{color: '#ffffff', fontWeight: 'bold', letterSpacing: '1px', textShadow: '0 0 5px #ff0000'}}>⚠️ RESTRICTED AREA // AUTHORIZED PERSONNEL ONLY ⚠️</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label style={{color: '#ff9900'}}>OPERATOR ID (EMAIL)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ENTER ID..."
              required
              style={{borderColor: '#ff9900', color: '#ffffff', background: 'rgba(255, 153, 0, 0.1)'}}
            />
          </div>
          
          <div className="input-group">
            <label style={{color: '#ff9900'}}>ACCESS CODE (PASSWORD)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER CODE..."
              required
              style={{borderColor: '#ff9900', color: '#ffffff', background: 'rgba(255, 153, 0, 0.1)'}}
            />
          </div>

          {error && <div className="error-msg" style={{color: '#ff0000', borderColor: '#ff0000'}}>ACCESS DENIED: {error}</div>}

          <button type="submit" disabled={loading} className="login-btn" style={{
              background: loading ? '#333' : '#ff9900',
              color: '#000000',
              border: 'none',
              fontWeight: 'bold'
          }}>
            {loading ? 'AUTHENTICATING...' : 'INITIATE LINK'}
          </button>
        </form>
        
        <div className="login-footer">
          <p style={{color: '#ff9900'}}>SYSTEM STATUS: ONLINE</p>
          <p style={{color: '#ff9900'}}>ENCRYPTION: AES-256</p>
          <div style={{marginTop: '20px', borderTop: '1px solid #ff9900', paddingTop: '10px'}}>
             <p style={{color: '#ffffff', fontSize: '12px', letterSpacing: '1px'}}>DEVELOPED BY <span style={{fontWeight: 'bold', textShadow: '0 0 5px #ff9900', color: '#ff9900'}}>RUGER IQ</span></p>
             <p style={{color: '#aaaaaa', fontSize: '10px'}}>INTELLECTUAL PROPERTY © 2026</p>
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
