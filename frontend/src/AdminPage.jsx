
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL ;


const AdminPage = ({ auth }) => {
    const [marketMode, setMarketMode] = useState('normal');
    const [notification, setNotification] = useState('');

    useEffect(() => {
        if (!auth || auth.role !== 'admin') return;
        // Fetch current market mode
        const fetchMode = async () => {
            try {
                const { data } = await axios.get(`${backendUrl}/game/market-mode`);
                setMarketMode(data.mode);
            } catch (e) {
                setMarketMode('normal');
            }
        };
        fetchMode();
        // Poll for mode changes every 5s
        const interval = setInterval(fetchMode, 5000);
        return () => clearInterval(interval);
    }, [auth]);

    if (!auth || auth.role !== 'admin') return null;

    const handleMarketMode = async (mode) => {
        try {
            await axios.post(`${backendUrl}/game/admin/market-mode`, { mode }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            let modeLabel = mode === 'bull' ? 'Bull Run' : mode === 'bear' ? 'Bear Market' : 'Normal';
            setNotification(`Market mode set to ${modeLabel}`);
            setTimeout(() => setNotification(''), 2500);
            // Update mode immediately
            setMarketMode(mode === 'bull' ? 'bull' : mode === 'bear' ? 'bear' : 'normal');
        } catch (error) {
            setNotification('Failed to set market mode');
            setTimeout(() => setNotification(''), 2500);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        window.location.reload();
    };

    const modeDisplay = marketMode === 'bull' ? '🐂 Bull Run (Payday +25%, Loan 7%)'
        : marketMode === 'bear' ? '🐻 Bear Market (Payday -25%, Loan 18%)'
        : 'Normal Market (Payday x1, Loan 10%)';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-purple-100 p-2 sm:p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10 flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Admin Controls</h1>
                <div className="mb-4 w-full flex flex-col items-center">
                    <span className={`px-4 py-2 rounded-full font-semibold text-lg mb-2 ${marketMode === 'bull' ? 'bg-green-100 text-green-800' : marketMode === 'bear' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>{modeDisplay}</span>
                    {notification && (
                        <div className="mt-2 px-4 py-2 rounded bg-blue-100 text-blue-800 font-semibold shadow">{notification}</div>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 w-full">
                    <button onClick={() => handleMarketMode('bull')} className="bg-green-500 text-white py-3 rounded-xl font-bold text-lg shadow hover:bg-green-600 transition-colors">Bull Run</button>
                    <button onClick={() => handleMarketMode('bull-stop')} className="bg-gray-500 text-white py-3 rounded-xl font-bold text-lg shadow hover:bg-gray-600 transition-colors">Stop Bull Run</button>
                    <button onClick={() => handleMarketMode('bear')} className="bg-red-500 text-white py-3 rounded-xl font-bold text-lg shadow hover:bg-red-600 transition-colors">Bear Market</button>
                    <button onClick={() => handleMarketMode('bear-stop')} className="bg-gray-500 text-white py-3 rounded-xl font-bold text-lg shadow hover:bg-gray-600 transition-colors">Stop Bear Market</button>
                </div>
                <button onClick={handleLogout} className="bg-red-500 text-white py-3 rounded-xl font-bold text-lg w-full shadow hover:bg-red-600 transition-colors">Logout</button>
            </div>
        </div>
    );
};

export default AdminPage;
