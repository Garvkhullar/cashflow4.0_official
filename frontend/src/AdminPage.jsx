import React from 'react';
import axios from 'axios';

const backendUrl = 'http://localhost:5000/api';

const AdminPage = ({ auth }) => {
    if (!auth || auth.role !== 'admin') return null;

    const handleMarketMode = async (mode) => {
        try {
            await axios.post(`${backendUrl}/admin/market-mode`, { mode }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            alert(`Market mode set to ${mode}`);
        } catch (error) {
            alert('Failed to set market mode');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        window.location.reload();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-8">Admin Controls</h1>
            <div className="grid grid-cols-2 gap-6 mb-8">
                <button onClick={() => handleMarketMode('bull')} className="bg-green-500 text-white px-6 py-4 rounded-xl font-bold text-lg">Bull Run</button>
                <button onClick={() => handleMarketMode('bull-stop')} className="bg-gray-500 text-white px-6 py-4 rounded-xl font-bold text-lg">Stop Bull Run</button>
                <button onClick={() => handleMarketMode('bear')} className="bg-red-500 text-white px-6 py-4 rounded-xl font-bold text-lg">Bear Market</button>
                <button onClick={() => handleMarketMode('bear-stop')} className="bg-gray-500 text-white px-6 py-4 rounded-xl font-bold text-lg">Stop Bear Market</button>
            </div>
            <button onClick={handleLogout} className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-lg">Logout</button>
        </div>
    );
};

export default AdminPage;
