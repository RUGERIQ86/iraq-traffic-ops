import { useState, useEffect } from 'react';

const LocationGuard = ({ children }) => {
  // التعديل الجوهري: نبدأ بالتحقق إذا كان الموقع مقبولاً مسبقاً في هذه الجلسة
  const [status, setStatus] = useState(() => {
    return sessionStorage.getItem('location_granted') === 'true' ? 'granted' : 'checking';
  });
  const [errorMsg, setErrorMsg] = useState('');

  const checkLocation = () => {
    if (!navigator.geolocation) {
      setStatus('denied');
      setErrorMsg('المتصفح لا يدعم تحديد الموقع (GPS).');
      return;
    }

    // لا نغير الحالة إلى checking إذا كنا حصلنا على الإذن فعلياً لتجنب الوميض الأسود
    if (status !== 'granted') {
      setStatus('checking');
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('granted');
        sessionStorage.setItem('location_granted', 'true'); // حفظ الحالة لتجنب إعادة الفحص
      },
      (error) => {
        // إذا كان لدينا إذن مسبق وفشل الفحص لمرة واحدة، لا نحجب الشاشة فوراً
        if (sessionStorage.getItem('location_granted') === 'true') {
          setStatus('granted'); 
          return;
        }

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
      // تحسين الإعدادات لسرعة الاستجابة
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    // التحقق من الأذونات بشكل صامت أولاً إذا كان المتصفح يدعم ذلك
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setStatus('granted');
          sessionStorage.setItem('location_granted', 'true');
        }
        checkLocation();
      });
    } else {
      checkLocation();
    }
  }, []);

  // إذا كانت الحالة "مقبول"، اعرض المحتوى فوراً دون أي تأخير أو شاشات سوداء
  if (status === 'granted') {
    return children;
  }

  return (
    <div style={{
      height: '100vh', width: '100vw', backgroundColor: '#000', color: '#00ff00',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      fontFamily: 'monospace', textAlign: 'center', padding: '20px', boxSizing: 'border-box',
      border: '2px solid #00ff00', position: 'fixed', top: 0, left: 0, zIndex: 9999
    }}>
      <div style={{ fontSize: '24px', marginBottom: '20px', textShadow: '0 0 10px #00ff00' }}>
        [ حارس الموقع | LOCATION GUARD ]
      </div>
      
      {status === 'checking' && (
        <div className="loading-pulse">جاري تأمين الاتصال وتحديد الموقع التكتيكي...</div>
      )}

      {status === 'denied' && (
        <>
          <div style={{ color: '#ff0000', marginBottom: '20px', border: '1px solid #ff0000', padding: '10px' }}>
            تنبيه أمني: {errorMsg}
          </div>
          <button 
            onClick={checkLocation}
            style={{
              background: '#00ff00', color: '#000', border: 'none', padding: '15px 30px',
              cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '0 0 15px #00ff00'
            }}
          >
            إعادة محاولة الاتصال بالـ GPS
          </button>
        </>
      )}

      <div style={{ marginTop: '30px', fontSize: '10px', opacity: 0.7 }}>
        يجب أن يكون الـ GPS نشطاً للمزامنة مع عمليات المرور في العراق.
      </div>

      <style>{`
        .loading-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};

export default LocationGuard;