import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const backendUrl = 'http://localhost:5000/api';

const formatCurrency = (number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    });
    return formatter.format(number);
};

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

const GamePage = ({ auth, setAuth }) => {
    const [teams, setTeams] = useState([]);
    const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availableSmallDeals, setAvailableSmallDeals] = useState([]);
    const [availableBigDeals, setAvailableBigDeals] = useState([]);
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [buyAmount, setBuyAmount] = useState('');
    const [installments, setInstallments] = useState(3);
    const [emiPreview, setEmiPreview] = useState(null);
    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [loanType, setLoanType] = useState('');
    const [assetType, setAssetType] = useState('');
    const [dealType, setDealType] = useState('');

    const fetchGameState = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${backendUrl}/game/state`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (data.teams) {
                setTeams(data.teams);
            }
            if (data.logs) {
                setLogs(data.logs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`));
            }
        } catch (error) {
            console.error("Error fetching game state:", error);
            showMessage("Failed to load game state.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchDeals = async (type) => {
        try {
            const { data } = await axios.get(`${backendUrl}/game/deals/${type}`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            return data.deals;
        } catch (error) {
            console.error("Error fetching deals:", error);
            showMessage("Failed to load deals.", "error");
            return [];
        }
    };

    useEffect(() => {
        fetchGameState();
        const loadDeals = async () => {
            const smallDeals = await fetchDeals('small');
            const bigDeals = await fetchDeals('big');
            setAvailableSmallDeals(smallDeals);
            setAvailableBigDeals(bigDeals);
        };
        loadDeals();

        const interval = setInterval(fetchGameState, 5000);
        return () => clearInterval(interval);
    }, [auth]);

    const handleAction = async (endpoint, payload = {}) => {
        const teamId = teams[currentTeamIndex]._id;
        try {
            const { data } = await axios.post(`${backendUrl}/game/${endpoint}`, { ...payload, teamId }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (data.teams) {
                setTeams(data.teams);
            }
            if (data.logs) {
                setLogs(data.logs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`));
            }
            if (data.message) {
                showMessage(data.message);
            }
            if (endpoint.includes('deal')) {
                setSelectedDeal(null);
            }
        } catch (error) {
            console.error("API error:", error);
            showMessage(error.response?.data?.message || 'An error occurred.', 'error');
        }
    };

    const handleBuyDeal = async () => {
        if (!selectedDeal || !buyAmount || !installments) return;
        setIsDealModalOpen(false);
        const dealEndpoint = dealType === 'small' ? 'deal/small' : 'deal/big';
        await handleAction(dealEndpoint, {
            dealId: selectedDeal._id,
            buyAmount: parseFloat(buyAmount),
            installments: parseInt(installments)
        });
        setBuyAmount('');
        setInstallments(3);
        setEmiPreview(null);
    };

    const handleBuyAsset = async (name, amount, price, loanAmount) => {
        setIsAssetModalOpen(false);
        const endpoint = assetType === 'stock' ? 'stock' : 'crypto';
        await handleAction(endpoint, { name, amount, price, loanAmount });
    };

    const handleLoanAction = async (amount, repayType) => {
        setIsLoanModalOpen(false);
        // Repay loan endpoint with type
        if (loanType === 'borrow') {
            await handleAction('loan/borrow', { amount });
        } else {
            await handleAction('loan/repay', { amount, repayType });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        setAuth(null);
    };

    const openDealModal = (type) => {
        setDealType(type);
        const deals = type === 'small' ? availableSmallDeals : availableBigDeals;
        
        const ownedDealIds = teams.flatMap(team => team.deals.map(deal => deal._id));
        const dealsToDisplay = deals.filter(deal => !ownedDealIds.includes(deal._id));

        if (dealsToDisplay.length > 0) {
            setSelectedDeal(dealsToDisplay[0]);
        } else {
            setSelectedDeal(null);
        }
        setIsDealModalOpen(true);
    };

    const openAssetModal = (type) => {
        setAssetType(type);
        setIsAssetModalOpen(true);
        setAssetLoanAmount('');
    };
    // Asset loan state
    const [assetLoanAmount, setAssetLoanAmount] = useState('');

    // Deduct/Add cash modal state
    const [isCashModalOpen, setIsCashModalOpen] = useState(false);
    const [cashOperation, setCashOperation] = useState('add');
    const [cashType, setCashType] = useState('number');
    const [cashValue, setCashValue] = useState('');

    const openCashModal = () => {
        setIsCashModalOpen(true);
        setCashOperation('add');
        setCashType('number');
        setCashValue('');
    };

    const handleCashUpdate = async (e) => {
        e.preventDefault();
        if (!cashValue || parseFloat(cashValue) <= 0) return;
        await handleAction('cash/update', {
            value: cashValue,
            type: cashType,
            operation: cashOperation
        });
        setIsCashModalOpen(false);
    };
    const openLoanModal = (type) => {
        setLoanType(type);
        setIsLoanModalOpen(true);
    };

    const teamState = teams[currentTeamIndex] || {};
    const totalLiabilities = (teamState.smallDealLoan || 0) + (teamState.bigDealLoan || 0) + (teamState.stocksLoan || 0) + (teamState.cryptoLoan || 0) + (teamState.personalLoan || 0);
    const totalExpenses = teamState.expenses;
    const totalIncome = teamState.income + teamState.passiveIncome;
    // Tax logic: Only apply if nextPaydayTax is true
    const paydayRaw = totalIncome - totalExpenses;
    const tax = teamState.nextPaydayTax ? Math.round(paydayRaw * 0.13) : 0;
    const netPayday = paydayRaw - tax;

    // Loader removed

    const dealsToDisplay = dealType === 'small' ? availableSmallDeals : availableBigDeals;

    return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8">
            <main className="container mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 flex flex-col justify-between">
                    <div>
                        <div className="bg-gray-100 p-4 rounded-xl shadow-inner mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-700">Username: {auth.username}</p>
                                <p className="font-bold text-gray-700">Role: {auth.role}</p>
                            </div>
                            <button onClick={handleLogout} className="py-2 px-4 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-md">Logout</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => handleAction('payday')} className="w-full py-4 rounded-xl font-bold text-lg text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-md">Payday</button>
                            <button onClick={() => handleAction('roll')} className="w-full py-4 rounded-xl font-bold text-lg text-white bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-md">Roll</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => handleAction('penalty')} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Penalty</button>
                            <button onClick={() => handleAction('chance')} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Chance</button>
                            <button onClick={() => openDealModal('small')} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Small Deal</button>
                            <button onClick={() => openDealModal('big')} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Big Deal</button>
                            <button onClick={() => openAssetModal('stock')} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Stock</button>
                            <button onClick={() => openAssetModal('crypto')} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Crypto</button>
                            <button onClick={openCashModal} className="w-full py-2 px-4 rounded-xl text-white font-medium bg-purple-600 hover:bg-purple-700 transition-colors shadow-md col-span-2">Deduct/Add Cash</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => openLoanModal('borrow')} className="w-full py-3 rounded-xl text-white font-semibold bg-green-500 hover:bg-green-600 transition-colors shadow-md">Borrow Loan</button>
                            <button onClick={() => openLoanModal('repay')} className="w-full py-3 rounded-xl text-white font-semibold bg-red-500 hover:bg-red-600 transition-colors shadow-md">Repay Loan</button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => handleAction('freeze')} className="w-full py-3 rounded-xl text-white font-semibold bg-orange-500 hover:bg-orange-600 transition-colors shadow-md text-sm">Asset Freeze</button>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        {teams.map((team, index) => (
                            <div key={team._id} className="flex flex-col items-center">
                                <button onClick={() => setCurrentTeamIndex(index)} className={`w-full py-2 rounded-xl text-white font-semibold ${currentTeamIndex === index ? 'bg-indigo-600' : 'bg-indigo-500'} hover:bg-indigo-600 transition-colors shadow-md`}>
                                    {team.teamName}
                                </button>
                                <div className="flex space-x-2 mt-2 items-center">
                                    <button
                                        onClick={async () => { await handleAction('vacation/toggle', { status: true }); }}
                                        className={`flex items-center px-2 py-1 rounded text-xs font-bold transition-colors duration-150 shadow ${team.isVacationOn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                                        title="Turn Vacation ON (tax exempt)"
                                    >
                                        <span className="mr-1">🌴</span> ON
                                    </button>
                                    <button
                                        onClick={async () => { await handleAction('vacation/toggle', { status: false }); }}
                                        className={`flex items-center px-2 py-1 rounded text-xs font-bold transition-colors duration-150 shadow ${!team.isVacationOn ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                                        title="Turn Vacation OFF (tax applies)"
                                    >
                                        <span className="mr-1">🏖️</span> OFF
                                    </button>
                                    <button
                                        onClick={async () => { await handleAction('tax/next', {}); }}
                                        className="px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white"
                                        title="Apply 13% tax on next payday"
                                    >TAX</button>
                                    {team.isVacationOn ? (
                                        <span className="ml-2 px-2 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs" title="Vacation ON: Tax exempt">Vacation ON</span>
                                    ) : (
                                        <span className="ml-2 px-2 py-1 rounded-full bg-gray-100 text-gray-800 font-bold text-xs" title="Vacation OFF: Tax applies">Vacation OFF</span>
                                    )}
                                </div>
                                {team.isVacationOn && (
                                    <span className="text-xs text-green-700 font-bold mt-1">Vacation ON ({team.vacationPaydaysLeft} paydays left)</span>
                                )}
                                {team.nextPaydayTax && (
                                    <span className="text-xs text-orange-700 font-bold mt-1">Next payday: 13% tax will apply</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-100 p-4 rounded-xl shadow-inner">
                        <h2 className="text-xl font-bold text-center text-gray-700 mb-4">Team {teamState.teamName} Details</h2>
                        {teamState.isVacationOn && (
                            <div className="flex justify-center items-center mb-2">
                                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs">Vacation ON ({teamState.vacationPaydaysLeft} paydays left, tax exempt)</span>
                            </div>
                        )}
                        <div className="space-y-2 text-gray-600">
                            <div className="flex justify-between items-center"><span className="font-medium">Cash:</span><span className="font-bold text-lg text-green-700">{formatCurrency(teamState.cash)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Income:</span><span className="font-bold text-lg text-green-700">{formatCurrency(totalIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Passive Income:</span><span className="font-bold text-lg text-green-700">{formatCurrency(teamState.passiveIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Assets:</span><span className="font-bold text-lg text-green-700">{formatCurrency(teamState.assets)}</span></div>
                        </div>
                        {/* Team Assets Section */}
                        <div className="mt-4 pt-2 border-t border-gray-200 text-orange-700">
                            <h3 className="font-bold text-sm text-orange-700 mb-2">Assets Owned</h3>
                            {/* Deals */}
                            {teamState.deals && teamState.deals.length > 0 && (
                                <div className="mb-2">
                                    <span className="font-semibold text-xs">Deals:</span>
                                    <ul className="list-disc ml-4 text-xs">
                                        {teamState.deals.map(deal => (
                                            <li key={deal._id}>{deal.name} (Cost: {formatCurrency(deal.cost)}, Passive Income: {formatCurrency(deal.passiveIncome)})</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Stocks */}
                            {teamState.stocks && teamState.stocks.length > 0 && (
                                <div className="mb-2">
                                    <span className="font-semibold text-xs">Stocks:</span>
                                    <ul className="list-disc ml-4 text-xs">
                                        {teamState.stocks.map((stock, idx) => (
                                            <li key={idx}>{stock.name} - {stock.amount} @ {formatCurrency(stock.purchasePrice)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Crypto */}
                            {teamState.crypto && teamState.crypto.length > 0 && (
                                <div className="mb-2">
                                    <span className="font-semibold text-xs">Crypto:</span>
                                    <ul className="list-disc ml-4 text-xs">
                                        {teamState.crypto.map((crypto, idx) => (
                                            <li key={idx}>{crypto.name} - {crypto.amount} @ {formatCurrency(crypto.purchasePrice)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* If no assets */}
                            {(!teamState.deals || teamState.deals.length === 0) && (!teamState.stocks || teamState.stocks.length === 0) && (!teamState.crypto || teamState.crypto.length === 0) && (
                                <span className="text-xs text-gray-500">No assets owned.</span>
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-300 space-y-2 text-gray-600">
                            <h3 className="font-bold text-sm text-gray-800">Liabilities</h3>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Small Deal Loan:</span><span className="text-xs">{formatCurrency(teamState.smallDealLoan || 0)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Big Deal Loan:</span><span className="text-xs">{formatCurrency(teamState.bigDealLoan || 0)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Stock Loan:</span><span className="text-xs">{formatCurrency(teamState.stocksLoan || 0)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Crypto Loan:</span><span className="text-xs">{formatCurrency(teamState.cryptoLoan || 0)}</span></div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-xs">Personal Loan:</span>
                                <span className="text-xs">{formatCurrency(teamState.personalLoan || 0)}</span>
                                {teamState.personalLoan > 0 ? (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold text-xs" title="13% interest added to expenses each payday">+13% interest</span>
                                ) : (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs" title="No interest on personal loan">No interest</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center font-bold text-sm border-t border-gray-300 pt-2"><span className="text-red-700">Total:</span><span className="text-red-700">{formatCurrency(totalLiabilities)}</span></div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-300 space-y-2 text-gray-600">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Expenses:</span>
                                <span className="font-bold text-lg text-red-700">{formatCurrency(totalExpenses)}</span>
                                {teamState.personalLoan > 0 ? (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold text-xs" title="Includes 13% interest on personal loan">+13% personal loan interest</span>
                                ) : (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs" title="No interest on personal loan">No interest</span>
                                )}
                            </div>
                            {teamState.nextPaydayTax && (
                                <div className="flex justify-between items-center"><span className="font-medium">Tax (13%):</span><span className="font-bold text-lg text-red-700">{formatCurrency(tax)}</span></div>
                            )}
                            <div className="flex justify-between items-center"><span className="font-medium">Payday:</span><span className="font-bold text-lg text-green-700">{formatCurrency(netPayday)}</span></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4 flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-800">Table Logs</h2>
                    <div className="flex-grow bg-gray-100 p-4 rounded-xl shadow-inner text-sm text-gray-700 overflow-y-auto max-h-96">
                        {logs.length > 0 ? logs.map((log, index) => (
                            <p key={index} className="mb-2">{log}</p>
                        )) : (
                            <p className="text-center text-gray-400">No transaction history available.</p>
                        )}
                    </div>
                </div>
            </main>
            
            {isDealModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                        <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">{dealType === 'small' ? 'Small Deal' : 'Big Deal'}</h3>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Select a Deal:</label>
                            <select 
                                onChange={(e) => {
                                    const selected = dealsToDisplay.find(d => d._id === e.target.value);
                                    setSelectedDeal(selected);
                                    setBuyAmount('');
                                    setEmiPreview(null);
                                }} 
                                className="w-full p-2 border rounded-md text-gray-700"
                                value={selectedDeal?._id || ''}
                            >
                                <option value="" disabled>-- Select a deal --</option>
                                {dealsToDisplay.map((deal) => (
                                    <option key={deal._id} value={deal._id}>{deal.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedDeal && (
                            <div className="bg-gray-100 p-4 rounded-lg mb-4 text-gray-800">
                                <p><strong>Name:</strong> {selectedDeal.name}</p>
                                <p><strong>Cost:</strong> {formatCurrency(selectedDeal.cost)}</p>
                                <p><strong>Passive Income:</strong> {formatCurrency(selectedDeal.passiveIncome)}</p>
                                <div className="mt-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Buy Amount (≤ Cost):</label>
                                    <input type="number" min="1" max={selectedDeal.cost} value={buyAmount} onChange={e => {
                                        setBuyAmount(e.target.value);
                                        setEmiPreview(null);
                                    }} className="w-full p-2 border rounded-md text-gray-700" />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Installment Plan:</label>
                                    <select value={installments} onChange={e => {
                                        setInstallments(e.target.value);
                                        setEmiPreview(null);
                                    }} className="w-full p-2 border rounded-md text-gray-700">
                                        <option value={3}>3 Paydays (5% interest)</option>
                                        <option value={6}>6 Paydays (13% interest)</option>
                                        <option value={12}>12 Paydays (20% interest)</option>
                                    </select>
                                </div>
                                <div className="mt-4">
                                    <button type="button" className="bg-indigo-500 text-white py-2 px-4 rounded-md font-semibold" disabled={!buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0} onClick={() => {
                                        // Calculate EMI preview
                                        const principal = selectedDeal.cost - parseFloat(buyAmount);
                                        let rate = installments == 3 ? 0.05 : installments == 6 ? 0.13 : 0.20;
                                        const interest = principal * rate;
                                        const totalLoan = principal + interest;
                                        const emi = totalLoan / installments;
                                        setEmiPreview({ totalLoan, emi, interest, principal });
                                    }}>Preview EMI</button>
                                </div>
                                {emiPreview && (
                                    <div className="mt-4 bg-blue-50 p-3 rounded-md text-blue-900">
                                        <p><strong>Loan Principal:</strong> {formatCurrency(emiPreview.principal)}</p>
                                        <p><strong>Interest:</strong> {formatCurrency(emiPreview.interest)}</p>
                                        <p><strong>Total Loan:</strong> {formatCurrency(emiPreview.totalLoan)}</p>
                                        <p><strong>EMI ({installments} paydays):</strong> {formatCurrency(emiPreview.emi)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setIsDealModalOpen(false)} className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-400">
                                Cancel
                            </button>
                            <button 
                                onClick={handleBuyDeal} 
                                disabled={!selectedDeal || !buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || !installments}
                                className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedDeal || !buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || !installments ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Buy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAssetModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                        <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">Buy {assetType === 'stock' ? 'Stock' : 'Crypto'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const name = e.target.name.value;
                            const amount = parseInt(e.target.amount.value);
                            const price = parseFloat(e.target.price.value);
                            let loanAmount = assetLoanAmount ? parseFloat(assetLoanAmount) : 0;
                            handleBuyAsset(name, amount, price, loanAmount);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
                                <input type="text" name="name" className="w-full p-2 border rounded-md text-gray-700" placeholder={assetType === 'stock' ? 'e.g., AAPL' : 'e.g., BTC'} required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Amount:</label>
                                <input type="number" name="amount" className="w-full p-2 border rounded-md text-gray-700" required min="1" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Price:</label>
                                <input type="number" name="price" className="w-full p-2 border rounded-md text-gray-700" required min="0" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Loan Amount (optional):</label>
                                <input type="number" min="0" value={assetLoanAmount} onChange={e => setAssetLoanAmount(e.target.value)} className="w-full p-2 border rounded-md text-gray-700" />
                                {assetLoanAmount > 0 && (
                                    <p className="text-xs text-blue-700 mt-2">A flat 13% interest will be added. You can repay the loan anytime.</p>
                                )}
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-400">
                                    Cancel
                                </button>
                                <button type="submit" className="font-semibold py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Buy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoanModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                        <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">{loanType === 'borrow' ? 'Borrow Loan' : 'Repay Loan'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const amount = parseFloat(e.target.amount.value);
                            const repayType = loanType === 'repay' ? e.target.repayType.value : undefined;
                            handleLoanAction(amount, repayType);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Amount:</label>
                                <input type="number" name="amount" className="w-full p-2 border rounded-md text-gray-700" required min="1" onChange={e => setAssetLoanAmount(e.target.value)} />
                                {loanType === 'borrow' && assetLoanAmount > 0 && (
                                    <div className="mt-2 text-xs text-blue-700">
                                        <div>13% interest will be added to your borrowed amount.</div>
                                        <div>Total loan: <span className="font-bold">{formatCurrency(parseFloat(assetLoanAmount) + parseFloat(assetLoanAmount) * 0.13)}</span></div>
                                        <div>Each payday, <span className="font-bold">13%</span> of your total loan (<span className="font-bold">{formatCurrency((parseFloat(assetLoanAmount) + parseFloat(assetLoanAmount) * 0.13) * 0.13)}</span>) will be added to your expenses until fully repaid.</div>
                                    </div>
                                )}
                            </div>
                            {loanType === 'repay' && (
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Repay Loan Type:</label>
                                    <select name="repayType" className="w-full p-2 border rounded-md text-gray-700" required>
                                        <option value="stocksLoan">Stock Loan</option>
                                        <option value="cryptoLoan">Crypto Loan</option>
                                        <option value="personalLoan">Personal Loan</option>
                                    </select>
                                    <p className="text-xs text-blue-700 mt-2">Repaying stock/crypto/personal loan does not affect expenses.</p>
                                </div>
                            )}
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsLoanModalOpen(false)} className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-400">
                                    Cancel
                                </button>
                                <button type="submit" className="font-semibold py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    {loanType === 'borrow' ? 'Borrow' : 'Repay'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        {/* Deduct/Add Cash Modal */}
        {isCashModalOpen && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                    <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">Deduct/Add Cash</h3>
                    <form onSubmit={handleCashUpdate}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Operation:</label>
                            <select value={cashOperation} onChange={e => setCashOperation(e.target.value)} className="w-full p-2 border rounded-md text-gray-700">
                                <option value="add">Add</option>
                                <option value="deduct">Deduct</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Type:</label>
                            <select value={cashType} onChange={e => setCashType(e.target.value)} className="w-full p-2 border rounded-md text-gray-700">
                                <option value="number">Number</option>
                                <option value="percent">Percent</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Value:</label>
                            <input type="number" min="1" value={cashValue} onChange={e => setCashValue(e.target.value)} className="w-full p-2 border rounded-md text-gray-700" required />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={() => setIsCashModalOpen(false)} className="bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-400">
                                Cancel
                            </button>
                            <button type="submit" className="font-semibold py-2 px-4 rounded-md text-white bg-purple-600 hover:bg-purple-700">
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </div>
    );
};

export default GamePage;