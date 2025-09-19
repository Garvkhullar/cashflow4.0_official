import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cashflow-1-mdwi.onrender.com/api';

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
        messageBox.classList.add('bg-green-800', 'text-green-100');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-800', 'text-red-100');
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
    const [assetAction, setAssetAction] = useState('buy');
    const [dealType, setDealType] = useState('');
    const [isPenaltyDialogOpen, setIsPenaltyDialogOpen] = useState(false);
    const [penalties, setPenalties] = useState([]);
    const [selectedPenaltyId, setSelectedPenaltyId] = useState('');
    const [customPenaltyAmount, setCustomPenaltyAmount] = useState('');
    const [isChanceDialogOpen, setIsChanceDialogOpen] = useState(false);
    const [chances, setChances] = useState([]);
    const [selectedChanceId, setSelectedChanceId] = useState('');
    // Market mode state
    const [marketMode, setMarketMode] = useState('normal');
    const [marketNotification, setMarketNotification] = useState('');

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

    const fetchPenalties = async () => {
        try {
            const { data } = await axios.get(`${backendUrl}/penalties`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setPenalties(data.penalties);
        } catch (error) {
            console.error("Error fetching penalties:", error);
            showMessage("Failed to load penalties.", "error");
        }
    };

    const fetchChances = async () => {
        try {
            const { data } = await axios.get(`${backendUrl}/chances`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            setChances(data.chances);
        } catch (error) {
            showMessage('Failed to load chances', 'error');
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
        fetchPenalties();
        fetchChances();

        // Poll for game state
        const interval = setInterval(fetchGameState, 5000);
        return () => clearInterval(interval);
    }, [auth]);

    // Poll for market mode and show notification if changed
    useEffect(() => {
        let lastMode = null;
        const fetchMarketMode = async () => {
            try {
                const { data } = await axios.get(`${backendUrl}/game/market-mode`);
                if (data.mode !== marketMode) {
                    setMarketMode(data.mode);
                    if (lastMode && data.mode !== lastMode) {
                        let label = data.mode === 'bull' ? '🐂 Bull Run (Payday +25%, Loan 7%)'
                            : data.mode === 'bear' ? '🐻 Bear Market (Payday -25%, Loan 18%)'
                            : 'Normal Market (Payday x1, Loan 13%)';
                        setMarketNotification(`Market mode changed: ${label}`);
                        setTimeout(() => setMarketNotification(''), 3000);
                    }
                    lastMode = data.mode;
                }
            } catch (e) {
                setMarketMode('normal');
            }
        };
        fetchMarketMode();
        const interval = setInterval(fetchMarketMode, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line
    }, []);

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

    const handleSellStock = async (stockName, amount, price) => {
        setIsAssetModalOpen(false);
        await handleAction('stock/sell', { stockName, amount, price });
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

    const openAssetModal = (type, action = 'buy') => {
        setAssetType(type);
        setAssetAction(action);
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

    const handlePenaltyClick = (team) => {
        // Open penalty dialog and pre-fill with team's current penalty details if any
        setIsPenaltyDialogOpen(true);
        if (team.penalty) {
            setSelectedPenaltyId(team.penalty._id);
            setCustomPenaltyAmount(team.penalty.amount);
        } else {
            setSelectedPenaltyId('');
            setCustomPenaltyAmount('');
        }
    };

    const handleChanceClick = async () => {
        await fetchChances();
        setIsChanceDialogOpen(true);
        setSelectedChanceId('');
    };

    const handleApplyPenalty = async () => {
        if (!selectedPenaltyId) return;
        setIsPenaltyDialogOpen(false);
        await handleAction('penalty', {
            penaltyId: selectedPenaltyId,
            amount: customPenaltyAmount || penalties.find(p => p._id === selectedPenaltyId)?.amount
        });
        setCustomPenaltyAmount('');
    };

    const handleApplyChance = async () => {
        if (!selectedChanceId) return;
        setIsChanceDialogOpen(false);
        await handleAction('chance', { chanceId: selectedChanceId });
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

    const modeDisplay = marketMode === 'bull' ? '🐂 Bull Run (Payday +25%, Loan 7%)'
        : marketMode === 'bear' ? '🐻 Bear Market (Payday -25%, Loan 18%)'
        : 'Normal Market (Payday x1, Loan 13%)';

    return (
        <div className="w-full min-h-screen block p-0 sm:p-2 md:p-4 lg:p-6 bg-gray-900 text-gray-300 overflow-x-hidden">
            {/* Market mode indicator and notification */}
            <div className="w-full flex flex-col items-center mb-2">
                <span className={`px-4 py-2 rounded-full font-semibold text-lg mb-1 ${marketMode === 'bull' ? 'bg-green-900 text-green-200' : marketMode === 'bear' ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-200'}`}>{modeDisplay}</span>
                {marketNotification && (
                    <div className="mt-1 px-4 py-2 rounded bg-blue-900 text-blue-200 font-semibold shadow">{marketNotification}</div>
                )}
            </div>
            <main className="w-full max-w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 lg:gap-6">
                <div className="bg-gray-800 border border-gray-700 p-3 sm:p-4 md:p-6 lg:p-8 rounded-2xl shadow-lg space-y-6 flex flex-col justify-between min-w-0">
                    <div>
                        <div className="bg-gray-900 p-4 rounded-xl shadow-inner mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-300">Username: {auth.username}</p>
                                <p className="font-bold text-gray-300">Role: {auth.role}</p>
                            </div>
                            <button onClick={handleLogout} className="py-2 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md">Logout</button>
                        </div>
                        {/* Organized button grid */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                            <button onClick={() => handleAction('payday')} className="py-3 rounded-xl font-bold text-base text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md col-span-2">Payday</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                            <button onClick={() => openDealModal('small')} className="py-2 px-2 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Small Deal</button>
                            <button onClick={() => openDealModal('big')} className="py-2 px-2 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Big Deal</button>
                            <button onClick={() => openAssetModal('stock', 'buy')} className="py-2 px-2 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Buy Stock</button>
                            <button onClick={() => openAssetModal('stock', 'sell')} className="py-2 px-2 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Sell Stock</button>
                            <button onClick={() => openAssetModal('crypto')} className="py-2 px-2 rounded-xl text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors shadow-md">Crypto</button>
                            <button onClick={() => handlePenaltyClick(teams[currentTeamIndex])} className="py-2 px-2 rounded-xl text-white font-medium bg-red-600 hover:bg-red-700 transition-colors shadow-md">Penalty</button>
                            <button onClick={() => handleChanceClick(teams[currentTeamIndex])} className="py-2 px-2 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors shadow-md">Chance</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                            <button
                                onClick={() => handleAction('future')}
                                disabled={teamState.future > 0}
                                className="py-2 px-2 rounded-xl text-white font-medium bg-purple-600 hover:bg-purple-700 transition-colors shadow-md disabled:bg-gray-500"
                            >
                                Future {teamState.future > 0 && `(${teamState.future})`}
                            </button>
                            <button
                                onClick={() => handleAction('options')}
                                disabled={teamState.options > 0}
                                className="py-2 px-2 rounded-xl text-white font-medium bg-purple-600 hover:bg-purple-700 transition-colors shadow-md disabled:bg-gray-500"
                            >
                                Options {teamState.options > 0 && `(${teamState.options})`}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-4">
                            <button onClick={openCashModal} className="py-2 px-2 rounded-xl text-white font-medium bg-purple-600 hover:bg-purple-700 transition-colors shadow-md">Deduct/Add Cash</button>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
                            <button
                                onClick={() => setCurrentTeamIndex(i => Math.max(0, i - 1))}
                                disabled={currentTeamIndex === 0}
                                className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500 disabled:opacity-50"
                            >Prev</button>
                            <span className="font-bold text-lg text-white">{teams[currentTeamIndex]?.teamName || "No Team"}</span>
                            <button
                                onClick={() => setCurrentTeamIndex(i => Math.min(teams.length - 1, i + 1))}
                                disabled={currentTeamIndex === teams.length - 1}
                                className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500 disabled:opacity-50"
                            >Next</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => openLoanModal('borrow')} className="w-full py-3 rounded-xl text-white font-semibold bg-green-600 hover:bg-green-700 transition-colors shadow-md">Borrow Loan</button>
                            <button onClick={() => openLoanModal('repay')} className="w-full py-3 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-700 transition-colors shadow-md">Repay Loan</button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => handleAction('freeze')} className="w-full py-3 rounded-xl text-white font-semibold bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-md text-base flex items-center justify-center gap-2">
                                <span role="img" aria-label="lock" className="text-lg">🔒</span>
                                Asset Freeze
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 p-3 sm:p-4 md:p-6 rounded-2xl shadow-lg space-y-6 min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {teams.map((team, index) => (
                            <div key={team._id} className="w-full mb-4 p-4 rounded-xl shadow bg-gray-700 flex flex-col items-center border border-gray-600">
                                {/* Team Name at Top */}
                                <span className="block text-lg font-bold text-indigo-400 mb-2">{team.teamName}</span>
                                {/* Vacation Status below Team Name */}
                                <span className={`mb-2 px-3 py-1 rounded-full text-xs font-bold ${team.isVacationOn ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-200'}`} title={team.isVacationOn ? 'Vacation ON: Tax exempt' : 'Vacation OFF: Tax applies'}>
                                    {team.isVacationOn ? `🌴 Vacation ON (${team.vacationPaydaysLeft} left, tax exempt)` : '🏖️ Vacation OFF (tax applies)'}
                                </span>
                                {/* Switch below status */}
                                <label className="flex items-center cursor-pointer mb-3">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={team.isVacationOn}
                                            onChange={async (e) => {
                                                await handleAction('vacation/toggle', { status: !team.isVacationOn });
                                            }}
                                            className="sr-only"
                                        />
                                        <div className={`block w-12 h-7 rounded-full ${team.isVacationOn ? 'bg-green-500' : 'bg-gray-600'} transition-colors`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-gray-200 w-5 h-5 rounded-full shadow transition-transform duration-200 ${team.isVacationOn ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </label>
                                <div className="w-full flex flex-col gap-2 mt-2">
                                    <button
                                        onClick={async () => { await handleAction('tax/next', {}); }}
                                        className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-orange-500 text-white shadow"
                                        title="Apply 13% tax on next payday"
                                    >TAX</button>
                                </div>
                                {team.nextPaydayTax && (
                                    <span className="text-xs text-orange-400 font-bold mt-2">Next payday: 13% tax will apply</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-900 p-4 rounded-xl shadow-inner">
                        <h2 className="text-xl font-bold text-center text-gray-200 mb-4">Team {teamState.teamName} Details</h2>
                        {teamState.isVacationOn && (
                            <div className="flex justify-center items-center mb-2">
                                <span className="px-3 py-1 rounded-full bg-green-900 text-green-300 font-bold text-xs">Vacation ON ({teamState.vacationPaydaysLeft} paydays left, tax exempt)</span>
                            </div>
                        )}
                        <div className="space-y-2 text-gray-400">
                            <div className="flex justify-between items-center"><span className="font-medium">Cash:</span><span className="font-bold text-lg text-green-400">{formatCurrency(teamState.cash)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Income:</span><span className="font-bold text-lg text-green-400">{formatCurrency(totalIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Passive Income:</span><span className="font-bold text-lg text-green-400">{formatCurrency(teamState.passiveIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Assets:</span><span className="font-bold text-lg text-green-400">{formatCurrency(teamState.assets)}</span></div>
                        </div>
                        {/* Team Assets Section */}
                        <div className="mt-4 pt-2 border-t border-gray-700 text-orange-400">
                            <h3 className="font-bold text-sm text-orange-400 mb-2">Assets Owned</h3>
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
                        <div className="mt-6 pt-4 border-t border-gray-700 space-y-2 text-gray-400">
                            <h3 className="font-bold text-sm text-gray-200">Liabilities</h3>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Small Deal Loan:</span><span className="text-xs">{formatCurrency(teamState.smallDealLoan || 0)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Big Deal Loan:</span><span className="text-xs">{formatCurrency(teamState.bigDealLoan || 0)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Stock Loan:</span><span className="text-xs">{formatCurrency(teamState.stocksLoan || 0)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium text-xs">Crypto Loan:</span><span className="text-xs">{formatCurrency(teamState.cryptoLoan || 0)}</span></div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-xs">Personal Loan:</span>
                                <span className="text-xs">{formatCurrency(teamState.personalLoan || 0)}</span>
                                {teamState.personalLoan > 0 ? (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 font-bold text-xs" title="13% interest added to expenses each payday">+13% interest</span>
                                ) : (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-green-900 text-green-300 font-bold text-xs" title="No interest on personal loan">No interest</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center font-bold text-sm border-t border-gray-700 pt-2"><span className="text-red-400">Total:</span><span className="text-red-400">{formatCurrency(totalLiabilities)}</span></div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-700 space-y-2 text-gray-400">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Expenses:</span>
                                <span className="font-bold text-lg text-red-400">{formatCurrency(totalExpenses)}</span>
                                {teamState.personalLoan > 0 ? (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 font-bold text-xs" title="Includes 13% interest on personal loan">+13% personal loan interest</span>
                                ) : (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-green-900 text-green-300 font-bold text-xs" title="No interest on personal loan">No interest</span>
                                )}
                            </div>
                            {teamState.nextPaydayTax && (
                                <div className="flex justify-between items-center"><span className="font-medium">Tax (13%):</span><span className="font-bold text-lg text-red-400">{formatCurrency(tax)}</span></div>
                            )}
                            <div className="flex justify-between items-center"><span className="font-medium">Payday:</span><span className="font-bold text-lg text-green-400">{formatCurrency(netPayday)}</span></div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 p-3 sm:p-4 md:p-6 rounded-2xl shadow-lg space-y-4 flex flex-col min-w-0">
                    <h2 className="text-2xl font-bold text-white">Table Logs</h2>
                    <div className="flex-grow bg-gray-900 p-2 sm:p-4 rounded-xl shadow-inner text-sm text-gray-300 overflow-y-auto h-full min-h-[200px] sm:min-h-[350px] md:min-h-[500px] max-h-[40vh] sm:max-h-[60vh] md:max-h-[80vh]">
                        {logs.length > 0 ? logs.map((log, index) => (
                            <p key={index} className="mb-2 break-words whitespace-pre-line">{log}</p>
                        )) : (
                            <p className="text-center text-gray-500">No transaction history available.</p>
                        )}
                    </div>
                </div>
            </main>
            
            {isDealModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">{dealType === 'small' ? 'Small Deal' : 'Big Deal'}</h3>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Select a Deal:</label>
                            <select 
                                onChange={(e) => {
                                    const selected = dealsToDisplay.find(d => d._id === e.target.value);
                                    setSelectedDeal(selected);
                                    setBuyAmount('');
                                    setEmiPreview(null);
                                }} 
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md"
                                value={selectedDeal?._id || ''}
                            >
                                <option value="" disabled>-- Select a deal --</option>
                                {dealsToDisplay.map((deal) => (
                                    <option key={deal._id} value={deal._id}>{deal.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedDeal && (
                            <div className="bg-gray-700 p-4 rounded-lg mb-4 text-gray-200">
                                <p><strong>Name:</strong> {selectedDeal.name}</p>
                                <p><strong>Cost:</strong> {formatCurrency(selectedDeal.cost)}</p>
                                <p><strong>Passive Income:</strong> {formatCurrency(selectedDeal.passiveIncome)}</p>
                                <div className="mt-4">
                                    <label className="block text-gray-300 text-sm font-bold mb-2">Buy Amount (≤ Cost):</label>
                                    <input type="number" min="1" max={selectedDeal.cost} value={buyAmount} onChange={e => {
                                        setBuyAmount(e.target.value);
                                        setEmiPreview(null);
                                    }} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-gray-300 text-sm font-bold mb-2">Installment Plan:</label>
                                    <select value={installments} onChange={e => {
                                        setInstallments(e.target.value);
                                        setEmiPreview(null);
                                    }} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md">
                                        <option value={3}>3 Paydays (5% interest)</option>
                                        <option value={6}>6 Paydays (13% interest)</option>
                                        <option value={12}>12 Paydays (20% interest)</option>
                                    </select>
                                </div>
                                <div className="mt-4">
                                    <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-semibold disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0} onClick={() => {
                                        const principal = selectedDeal.cost - parseFloat(buyAmount);
                                        let rate = installments == 3 ? 0.05 : installments == 6 ? 0.13 : 0.20;
                                        const interest = principal * rate;
                                        const totalLoan = principal + interest;
                                        const emi = totalLoan / installments;
                                        setEmiPreview({ totalLoan, emi, interest, principal });
                                    }}>Preview EMI</button>
                                </div>
                                {emiPreview && (
                                    <div className="mt-4 bg-blue-900 bg-opacity-50 p-3 rounded-md text-blue-300">
                                        <p><strong>Loan Principal:</strong> {formatCurrency(emiPreview.principal)}</p>
                                        <p><strong>Interest:</strong> {formatCurrency(emiPreview.interest)}</p>
                                        <p><strong>Total Loan:</strong> {formatCurrency(emiPreview.totalLoan)}</p>
                                        <p><strong>EMI ({installments} paydays):</strong> {formatCurrency(emiPreview.emi)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setIsDealModalOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">
                                Cancel
                            </button>
                            <button 
                                onClick={handleBuyDeal} 
                                disabled={!selectedDeal || !buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || !installments}
                                className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedDeal || !buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || !installments ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Buy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAssetModalOpen && assetAction === 'buy' && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Buy {assetType === 'stock' ? 'Stock' : 'Crypto'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const name = e.target.name.value;
                            const amount = parseInt(e.target.amount.value);
                            const price = parseFloat(e.target.price.value);
                            let loanAmount = assetLoanAmount ? parseFloat(assetLoanAmount) : 0;
                            handleBuyAsset(name, amount, price, loanAmount);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Name:</label>
                                <input type="text" name="name" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" placeholder={assetType === 'stock' ? 'e.g., AAPL' : 'e.g., BTC'} required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Amount:</label>
                                <input type="number" name="amount" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required min="1" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Price:</label>
                                <input type="number" name="price" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required min="0" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Loan Amount (optional):</label>
                                <input type="number" min="0" value={assetLoanAmount} onChange={e => setAssetLoanAmount(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" />
                                {assetLoanAmount > 0 && (
                                    <p className="text-xs text-blue-400 mt-2">A flat 13% interest will be added. You can repay the loan anytime.</p>
                                )}
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">
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

            {isAssetModalOpen && assetAction === 'sell' && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Sell {assetType === 'stock' ? 'Stock' : 'Crypto'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const stockName = e.target.stockName.value;
                            const amount = parseInt(e.target.amount.value);
                            const price = parseFloat(e.target.price.value);
                            handleSellStock(stockName, amount, price);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Stock Name:</label>
                                <input type="text" name="stockName" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Amount to Sell:</label>
                                <input type="number" name="amount" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required min="1" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Current Price:</label>
                                <input type="number" name="price" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required min="0" />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">
                                    Cancel
                                </button>
                                <button type="submit" className="font-semibold py-2 px-4 rounded-md text-white bg-red-600 hover:bg-red-700">
                                    Sell
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoanModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">{loanType === 'borrow' ? 'Borrow Loan' : 'Repay Loan'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const amount = parseFloat(e.target.amount.value);
                            const repayType = loanType === 'repay' ? e.target.repayType.value : undefined;
                            handleLoanAction(amount, repayType);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Amount:</label>
                                <input type="number" name="amount" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required min="1" onChange={e => setAssetLoanAmount(e.target.value)} />
                                {loanType === 'borrow' && assetLoanAmount > 0 && (
                                    <div className="mt-2 text-xs text-blue-400">
                                        <div>13% interest will be added to your borrowed amount.</div>
                                        <div>Total loan: <span className="font-bold">{formatCurrency(parseFloat(assetLoanAmount) + parseFloat(assetLoanAmount) * 0.13)}</span></div>
                                        <div>Each payday, <span className="font-bold">13%</span> of your total loan (<span className="font-bold">{formatCurrency((parseFloat(assetLoanAmount) + parseFloat(assetLoanAmount) * 0.13) * 0.13)}</span>) will be added to your expenses until fully repaid.</div>
                                    </div>
                                )}
                            </div>
                            {loanType === 'repay' && (
                                <div className="mb-4">
                                    <label className="block text-gray-300 text-sm font-bold mb-2">Repay Loan Type:</label>
                                    <select name="repayType" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required>
                                        <option value="stocksLoan">Stock Loan</option>
                                        <option value="cryptoLoan">Crypto Loan</option>
                                        <option value="personalLoan">Personal Loan</option>
                                    </select>
                                    <p className="text-xs text-blue-400 mt-2">Repaying stock/crypto/personal loan does not affect expenses.</p>
                                </div>
                            )}
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsLoanModalOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">
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
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                    <h3 className="text-2xl font-bold text-center mb-4 text-white">Deduct/Add Cash</h3>
                    <form onSubmit={handleCashUpdate}>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Operation:</label>
                            <select value={cashOperation} onChange={e => setCashOperation(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md">
                                <option value="add">Add</option>
                                <option value="deduct">Deduct</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Type:</label>
                            <select value={cashType} onChange={e => setCashType(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md">
                                <option value="number">Number</option>
                                <option value="percent">Percent</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Value:</label>
                            <input type="number" min="1" value={cashValue} onChange={e => setCashValue(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" required />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={() => setIsCashModalOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">
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

        {/* Penalty Selection Dialog */}
        {isPenaltyDialogOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                    <h3 className="text-2xl font-bold text-center mb-4 text-white">Select Penalty</h3>
                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-bold mb-2">Penalty:</label>
                        <select value={selectedPenaltyId} onChange={e => {
                            setSelectedPenaltyId(e.target.value);
                            setCustomPenaltyAmount('');
                        }} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md">
                            <option value="" disabled>-- Select a penalty --</option>
                            {penalties.map(penalty => (
                                <option key={penalty._id} value={penalty._id}>{penalty.name} (₹{penalty.amount})</option>
                            ))}
                        </select>
                    </div>
                    {selectedPenaltyId && (
                        <div className="bg-gray-700 p-4 rounded-lg mb-4 text-gray-200">
                            <p><strong>Description:</strong> {penalties.find(p => p._id === selectedPenaltyId)?.description}</p>
                            <p><strong>Default Amount:</strong> ₹{penalties.find(p => p._id === selectedPenaltyId)?.amount}</p>
                            <div className="mt-2">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Enter Penalty Amount:</label>
                                <input type="number" min="1" className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md" value={customPenaltyAmount || penalties.find(p => p._id === selectedPenaltyId)?.amount || ''} onChange={e => setCustomPenaltyAmount(e.target.value)} />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={() => setIsPenaltyDialogOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">Cancel</button>
                        <button onClick={handleApplyPenalty} disabled={!selectedPenaltyId} className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedPenaltyId ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>Apply</button>
                    </div>
                </div>
            </div>
        )}

        {/* Chance Selection Dialog */}
        {isChanceDialogOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 border border-gray-600 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                    <h3 className="text-2xl font-bold text-center mb-4 text-white">Select Chance</h3>
                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-bold mb-2">Chance:</label>
                        <select value={selectedChanceId} onChange={e => setSelectedChanceId(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-gray-200 rounded-md">
                            <option value="" disabled>-- Select a chance --</option>
                            {chances.map(chance => (
                                <option key={chance._id} value={chance._id}>{chance.name} (₹{chance.amount})</option>
                            ))}
                        </select>
                    </div>
                    {selectedChanceId && (
                        <div className="bg-gray-700 p-4 rounded-lg mb-4 text-gray-200">
                            <p><strong>Description:</strong> {chances.find(c => c._id === selectedChanceId)?.description}</p>
                            <p><strong>Amount:</strong> ₹{chances.find(c => c._id === selectedChanceId)?.amount}</p>
                        </div>
                    )}
                    <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={() => setIsChanceDialogOpen(false)} className="bg-gray-600 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-500">Cancel</button>
                        <button onClick={handleApplyChance} disabled={!selectedChanceId} className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedChanceId ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>Apply</button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
};

export default GamePage;