import { useState, useEffect } from 'react';

const LocationGuard = ({ children }) => {
  const [status, setStatus] = useState('checking'); // checking, granted, denied, prompt
  const [errorMsg, setErrorMsg] = useState('');

  const checkLocation = () => {
    if (!navigator.geolocation) {
      setStatus('denied');
      setErrorMsg('المتصفح لا يدعم تحديد الموقع (GPS).');
      return;
    }

    setStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('granted');
      },
      (error) => {
        setStatus('denied');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMsg('يجب تفعيل إذن الموقع للوصول إلى النظام.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMsg('معلومات الموقع غير متوفرة حالياً.');
            break;
          case error.TIMEOUT:
            setErrorMsg('انتهت مهلة طلب الموقع.');
            break;
          default:
            setErrorMsg('حدث خطأ غير معروف في تحديد الموقع.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    checkLocation();
  }, []);

  if (status === 'granted') {
    return children;
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      color: '#00ff00',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'monospace',
      textAlign: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      border: '2px solid #00ff00'
    }}>
      <div style={{ fontSize: '24px', marginBottom: '20px', textShadow: '0 0 10px #00ff00' }}>
        [ حارس الموقع | LOCATION GUARD ]
      </div>
      
      {status === 'checking' && (
        <div className="loading-pulse">جاري التحقق من حالة الـ GPS...</div>
      )}

      {status === 'denied' && (
        <>
          <div style={{ color: '#ff0000', marginBottom: '20px', border: '1px solid #ff0000', padding: '10px' }}>
            تنبيه: {errorMsg}
          </div>
          <button 
            onClick={checkLocation}
            style={{
              background: '#00ff00',
              color: '#000',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}
          >
            إعادة المحاولة / تفعيل الموقع
          </button>
        </>
      )}

      <div style={{ marginTop: '30px', fontSize: '10px', opacity: 0.7 }}>
        يجب أن يكون الـ GPS مفعلاً للوصول إلى واجهة الملاحة التكتيكية.
      </div>

      <style>{`
        .loading-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LocationGuard;
