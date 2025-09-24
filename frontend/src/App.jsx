import React, { useState } from 'react';
import LoginPage from './LoginPage';
import GamePage from './GamePage';
import AdminPage from './AdminPage';

import './index.css';

export default function App() {
    const [auth, setAuth] = useState(JSON.parse(localStorage.getItem('userInfo')));

    return (
        <>
            <div id="message-box" className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transition-all duration-300 transform translate-x-full opacity-0"></div>
            {auth ? (
                auth.role === 'admin' ? <AdminPage auth={auth} /> : <GamePage auth={auth} setAuth={setAuth} />
            ) : <LoginPage setAuth={setAuth} />}
        </>
    );
}
