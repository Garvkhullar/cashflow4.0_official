import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AdminPage from './AdminPage.jsx';

const auth = JSON.parse(localStorage.getItem('userInfo'));
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {auth && auth.role === 'admin' ? <AdminPage auth={auth} /> : <App />}
  </StrictMode>,
)
