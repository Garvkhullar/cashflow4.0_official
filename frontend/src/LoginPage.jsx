import React, { useState, useEffect } from 'react';
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cashflow-1-mdwi.onrender.com/api';

const showMessage = (message, type = 'success') => {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transition-all duration-300 transform`;
    
    if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'text-green-800');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'text-red-800');
    }

    messageBox.classList.remove('translate-x-full', 'opacity-0');
    setTimeout(() => {
        messageBox.classList.add('translate-x-full', 'opacity-0');
    }, 3000);
};

const LoginPage = ({ setAuth }) => {
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [tableUsername, setTableUsername] = useState('');
    const [tablePassword, setTablePassword] = useState('');
    const [team1Name, setTeam1Name] = useState('');
    const [team2Name, setTeam2Name] = useState('');
    const [team3Name, setTeam3Name] = useState('');
    const [role, setRole] = useState('manager');

    // State for input focus animation
    const [focusIdx, setFocusIdx] = useState(-1);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const payload = { username: loginUsername, password: loginPassword };
            const { data } = await axios.post(`${backendUrl}/auth/login`, payload);
            localStorage.setItem('userInfo', JSON.stringify(data));
            setAuth(data);
            showMessage("Logged in successfully!");
        } catch (error) {
            showMessage(error.response?.data?.message || 'Authentication failed', 'error');
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        try {
            const payload = { username: adminUsername, password: adminPassword };
            const { data } = await axios.post(`${backendUrl}/auth/admin-login`, payload);
            localStorage.setItem('userInfo', JSON.stringify(data));
            setAuth(data);
            showMessage("Logged in successfully!");
        } catch (error) {
            showMessage(error.response?.data?.message || 'Authentication failed', 'error');
        }
    };
    
    const handleAddData = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                username: tableUsername, 
                password: tablePassword, 
                role, 
                team1Name, 
                team2Name, 
                team3Name 
            };
            const { data } = await axios.post(`${backendUrl}/auth/register`, payload);
            showMessage("Data added successfully!");
            if (data.teams && Array.isArray(data.teams)) {
                let msg = 'Team Codes for Login:\n';
                data.teams.forEach(team => {
                    msg += `Team: ${team.teamName} | Code: ${team.code}\n`;
                });
                alert(msg);
            }
        } catch (error) {
            showMessage(error.response?.data?.message || 'Failed to add data', 'error');
        }
    };

    const inputStyle = (isFocused) => {
        const baseStyle = 'bg-[#20232A] text-[#F3F4F6] border-2 border-[#373B41] rounded-md py-2 px-3 text-sm transition-colors duration-200 w-full mt-1';
        const focusStyle = isFocused ? 'border-[#6C63FF]' : 'border-[#373B41]';
        return `${baseStyle} ${focusStyle}`;
    };


    return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center font-orbitron p-0 m-0 relative overflow-hidden">
            <div id="message-box" className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transition-all duration-300 transform translate-x-full opacity-0"></div>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(30px);}
                    to { opacity: 1; transform: translateY(0);}
                }
                .animate-fade-in-up {
                    animation: fadeIn 1s ease-out forwards;
                }
                `}
            </style>
            <div className="background-grid absolute inset-0 z-0"></div>
            <div className="z-10 animate-fade-in-up">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Kaushan+Script&display=swap" rel="stylesheet" />
                <h1 className="text-6xl md:text-8xl font-black text-center text-[#FFEB3B] mb-2 font-nabla cashflow-heading" style={{ letterSpacing: '0.08em', textShadow: '0 2px 12px #a084ff, 0 1px 4px #B39DDB' }}>
                    {"WELCOME TO CASHFLOW 4.0".split("").map((char, i) =>
                        char === " " ? <span key={i} style={{ display: 'inline-block', width: '0.5em' }}>&nbsp;</span> :
                        <span key={i} className="cashflow-letter">{char}</span>
                    )}
                </h1>
                <h2 className="text-center text-[#F3F4F6] mb-8 font-bold tracking-wider font-orbitron">
                    Create Table or Login
                </h2>
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Team Login Card */}
                    
                    {/* Create New Table Card */}
                    <div className="bg-[rgba(35,39,47,0.95)] rounded-2xl shadow-2xl p-8 md:min-w-[340px] flex flex-col items-stretch" style={{boxShadow: "0 8px 40px 0 rgba(0,0,0,0.32)"}}>
                        <h3 className="text-lg font-bold text-[#F3F4F6] mb-5 font-orbitron">
                            <span role="img" aria-label="sparkle" className="mr-2">✨</span>
                            Create New Table
                        </h3>
                        <form onSubmit={handleAddData} className="flex flex-col flex-grow">
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Table Username:</label>
                            <input
                                type="text"
                                className={inputStyle(focusIdx === 0) + ' font-orbitron'}
                                placeholder="Enter table username"
                                value={tableUsername}
                                onChange={(e) => setTableUsername(e.target.value)}
                                onFocus={() => setFocusIdx(0)}
                                onBlur={() => setFocusIdx(-1)}
                                required
                            />
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Table Password:</label>
                            <input
                                type="password"
                                className={inputStyle(focusIdx === 1) + ' font-orbitron'}
                                placeholder="Enter table password"
                                value={tablePassword}
                                onChange={(e) => setTablePassword(e.target.value)}
                                onFocus={() => setFocusIdx(1)}
                                onBlur={() => setFocusIdx(-1)}
                                required
                            />
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Team Names:</label>
                            <input type="text" className={inputStyle(focusIdx === 2) + ' font-orbitron'} placeholder="Team Name 1" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} onFocus={() => setFocusIdx(2)} onBlur={() => setFocusIdx(-1)} required />
                            <input type="text" className={inputStyle(focusIdx === 3) + ' font-orbitron'} placeholder="Team Name 2" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} onFocus={() => setFocusIdx(3)} onBlur={() => setFocusIdx(-1)} required />
                            <input type="text" className={inputStyle(focusIdx === 4) + ' font-orbitron'} placeholder="Team Name 3" value={team3Name} onChange={(e) => setTeam3Name(e.target.value)} onFocus={() => setFocusIdx(4)} onBlur={() => setFocusIdx(-1)} required />
                            <button
                                type="submit"
                                className="mt-8 py-3 px-4 rounded-lg text-white font-bold text-base cursor-pointer transition-all duration-200 shadow-md bg-gradient-to-r from-[#6C63FF] to-[#4F8CFF] hover:scale-105 font-orbitron"
                            >
                                <span role="img" aria-label="plus" className="mr-2">➕</span>
                                Create Table
                            </button>
                        </form>
                    </div>

                    {/* Login to Existing Table Card */}
                    <div className="bg-[rgba(35,39,47,0.95)] rounded-2xl shadow-2xl p-8 md:min-w-[340px] flex flex-col items-stretch" style={{boxShadow: "0 8px 40px 0 rgba(0,0,0,0.32)"}}>
                        <h3 className="text-lg font-bold text-[#F3F4F6] mb-5 font-orbitron">
                            <span role="img" aria-label="lock" className="mr-2">🔒</span>
                            Login to Existing Table
                        </h3>
                        <form onSubmit={handleLogin} className="flex flex-col flex-grow">
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Table Username:</label>
                            <input
                                type="text"
                                className={inputStyle(focusIdx === 6) + ' font-orbitron'}
                                placeholder="Enter username"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                onFocus={() => setFocusIdx(6)}
                                onBlur={() => setFocusIdx(-1)}
                                required
                            />
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Table Password:</label>
                            <input
                                type="password"
                                className={inputStyle(focusIdx === 7) + ' font-orbitron'}
                                placeholder="Enter password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                onFocus={() => setFocusIdx(7)}
                                onBlur={() => setFocusIdx(-1)}
                                required
                            />
                            <button
                                type="submit"
                                className="mt-8 py-3 px-4 rounded-lg text-white font-bold text-base cursor-pointer transition-all duration-200 shadow-md bg-gradient-to-r from-[#4CAF50] to-[#43E97B] hover:scale-105 font-orbitron"
                            >
                                <span role="img" aria-label="login" className="mr-2">➡️</span>
                                Login
                            </button>
                        </form>
                    </div>

                    {/* Admin Login Card */}
                    <div className="bg-[rgba(35,39,47,0.95)] rounded-2xl shadow-2xl p-8 md:min-w-[340px] flex flex-col items-stretch" style={{boxShadow: "0 8px 40px 0 rgba(0,0,0,0.32)"}}>
                        <h3 className="text-lg font-bold text-[#F3F4F6] mb-5 font-orbitron">
                            <span role="img" aria-label="lock" className="mr-2">🔒</span>
                            Admin Login
                        </h3>
                        <form onSubmit={handleAdminLogin} className="flex flex-col flex-grow">
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Username:</label>
                            <input
                                type="text"
                                className={inputStyle(focusIdx === 8) + ' font-orbitron'}
                                placeholder="Enter admin username"
                                value={adminUsername}
                                onChange={(e) => setAdminUsername(e.target.value)}
                                onFocus={() => setFocusIdx(8)}
                                onBlur={() => setFocusIdx(-1)}
                                required
                            />
                            <label className="text-sm font-medium text-[#C2C7D0] mt-4 mb-1 font-orbitron">Password:</label>
                            <input
                                type="password"
                                className={inputStyle(focusIdx === 9) + ' font-orbitron'}
                                placeholder="Enter admin password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                onFocus={() => setFocusIdx(9)}
                                onBlur={() => setFocusIdx(-1)}
                                required
                            />
                            <button
                                type="submit"
                                className="mt-8 py-3 px-4 rounded-lg text-white font-bold text-base cursor-pointer transition-all duration-200 shadow-md bg-gradient-to-r from-[#4CAF50] to-[#43E97B] hover:scale-105 font-orbitron"
                            >
                                <span role="img" aria-label="login" className="mr-2">➡️</span>
                                Login
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;