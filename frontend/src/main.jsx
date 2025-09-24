import React, { useEffect, useState } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AdminPage from './AdminPage.jsx';

const rawAuth = localStorage.getItem('userInfo');
let parsedAuth = null;
try { parsedAuth = rawAuth ? JSON.parse(rawAuth) : null; } catch (e) { parsedAuth = null; }

// Guard to ensure security alerts about localStorage tampering are shown only once
// This is an in-memory flag and does not change any authentication or logout logic.
let securityAlertShown = false;

// decode JWT payload into an object (returns null if it can't be decoded)
const getPayloadFromToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(payload).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const obj = JSON.parse(json);
    return obj;
  } catch (e) {
    return null;
  }
};

function AuthGate() {
  const [auth, setAuth] = useState(parsedAuth);
  const lastRawRef = React.useRef(rawAuth);

  useEffect(() => {
    const handleTamper = (reason) => {
      // If we've already handled a tamper event, no-op to avoid multiple alerts
      if (securityAlertShown) return;
      securityAlertShown = true;
      try {
        alert('Security notice: localStorage was modified (' + reason + '). You will be logged out.');
      } catch (e) { /* ignore alert failures */ }
      localStorage.removeItem('userInfo');
      window.location.reload();
    };

    // storage event handles changes from other tabs/windows
    const onStorage = (e) => {
      if (e.key !== 'userInfo') return;
      try {
        const newRaw = e.newValue;
        if (newRaw === lastRawRef.current) return; // no-op
        const newObj = newRaw ? JSON.parse(newRaw) : null;
        const payload = newObj?.token ? getPayloadFromToken(newObj.token) : null;
        // Accept change if it includes a decodable token payload and role matches payload (likely legitimate login/refresh)
        if (newObj && newObj.token && payload && (!newObj.role || newObj.role === payload.role)) {
          lastRawRef.current = newRaw;
          setAuth(newObj);
          return;
        }
        handleTamper('storage event');
      } catch (err) {
        handleTamper('storage parse error');
      }
    };
    window.addEventListener('storage', onStorage);

    // periodic detection (catches devtools edits in same tab)
    const interval = setInterval(() => {
      try {
        const now = localStorage.getItem('userInfo');
        if (now === lastRawRef.current) return;
        const nowObj = now ? JSON.parse(now) : null;
        const payload = nowObj?.token ? getPayloadFromToken(nowObj.token) : null;
        if (nowObj && nowObj.token && payload && (!nowObj.role || nowObj.role === payload.role)) {
          // legitimate update (login or refresh) — accept and update known value
          lastRawRef.current = now;
          setAuth(nowObj);
          return;
        }
        // otherwise treat as tampering
        handleTamper('localStorage changed');
      } catch (e) {
        handleTamper('error reading localStorage');
      }
    }, 1000);

    // Immediate validation on mount: if the existing parsedAuth contains no valid decodable token
    // or if role mismatches the token payload, treat it as tampering.
    try {
      const existing = localStorage.getItem('userInfo');
      if (existing) {
        const obj = JSON.parse(existing);
        const payload = obj?.token ? getPayloadFromToken(obj.token) : null;
        if (!obj.token || !payload || (obj.role && payload.role && obj.role !== payload.role)) {
          handleTamper('initial validation');
        }
      }
    } catch (e) {
      handleTamper('initial parse error');
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Only grant admin access when the JWT token explicitly contains role: 'admin'.
  const payload = auth?.token ? getPayloadFromToken(auth.token) : null;
  const tokenRole = payload?.role || null;
  if (tokenRole === 'admin') {
    return <AdminPage auth={auth} />;
  }
  // If there's a mismatch between stored role and token role (both present), treat it as tampering.
  if (auth && auth.role && tokenRole && auth.role !== tokenRole) {
    if (!securityAlertShown) {
      try { alert('Security notice: localStorage role mismatch detected. Logging out.'); } catch (e) {}
      securityAlertShown = true;
    }
    localStorage.removeItem('userInfo');
    window.location.reload();
    return null;
  }
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
)
