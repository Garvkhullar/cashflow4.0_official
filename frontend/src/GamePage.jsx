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

// Format a plain numeric string into Indian grouping (e.g., 1,00,000)
const formatIndian = (numStr) => {
    if (numStr === '' || numStr === null || numStr === undefined) return '';
    const s = numStr.toString();
    // keep if already contains a non-digit (like '-') or is not a number string, return as-is
    const parts = s.split('.');
    let intPart = parts[0].replace(/,/g, '');
    const decPart = parts[1] ? parts[1] : null;
    if (intPart === '') return '';
    // handle negative
    let sign = '';
    if (intPart.startsWith('-')) { sign = '-'; intPart = intPart.slice(1); }
    if (intPart.length <= 3) {
        return sign + intPart + (decPart ? ('.' + decPart) : '');
    }
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return sign + rest + ',' + last3 + (decPart ? ('.' + decPart) : '');
};

const stripCommas = (s) => (s || '').toString().replace(/,/g, '');
const toNumber = (s) => {
    const n = parseFloat(stripCommas(s));
    return isNaN(n) ? null : n;
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
    const [dealSearchText, setDealSearchText] = useState('');
    const [buyAmount, setBuyAmount] = useState('');
    const [installments, setInstallments] = useState(4);
    const [emiPreview, setEmiPreview] = useState(null);
    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [loanType, setLoanType] = useState('');
    const [assetType, setAssetType] = useState('');
    const [dealType, setDealType] = useState('');
    const [isPenaltyDialogOpen, setIsPenaltyDialogOpen] = useState(false);
    const [penalties, setPenalties] = useState([]);
    const [selectedPenaltyId, setSelectedPenaltyId] = useState('');
    const [customPenaltyAmount, setCustomPenaltyAmount] = useState('');
    // Penalty search
    const [penaltySearchText, setPenaltySearchText] = useState('');
    const [isChanceDialogOpen, setIsChanceDialogOpen] = useState(false);
    const [chances, setChances] = useState([]);
    const [selectedChanceId, setSelectedChanceId] = useState('');
    // Chance search
    const [chanceSearchText, setChanceSearchText] = useState('');
    // Market mode state
    const [marketMode, setMarketMode] = useState('normal');
    const [marketNotification, setMarketNotification] = useState('');
    // Winner detection state: keep track of teams we've already announced
    const [announcedWinners, setAnnouncedWinners] = useState([]);
    const [winnerTeam, setWinnerTeam] = useState(null);

    const fetchGameState = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${backendUrl}/game/state`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (data.teams) {
                setTeams(data.teams);
                // detect if any team's passive income exceeds expenses -> winner
                try {
                    setAnnouncedWinners(prev => {
                        const newly = [];
                        data.teams.forEach(t => {
                            const passive = Number(t.passiveIncome || 0);
                            const expenses = Number(t.expenses || 0);
                            if (passive > expenses && !prev.includes(t._id)) {
                                newly.push(t);
                            }
                        });
                        if (newly.length > 0) {
                            // announce the first newly winning team only
                            setWinnerTeam(newly[0]);
                        }
                        const newIds = newly.map(t => t._id);
                        return newIds.length > 0 ? [...prev, ...newIds] : prev;
                    });
                } catch (e) { /* ignore detection errors */ }
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
                        let label = data.mode === 'bull' ? '🐂 Bull Run (Payday +25%)'
                            : data.mode === 'bear' ? '🐻 Bear Market (Payday -25%)'
                                : 'Normal Market (Payday x1)';
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
        // enforce down payment requirement on submit as well
        const reqDown = selectedDeal && selectedDeal.downPayment !== undefined && selectedDeal.downPayment !== null ? Number(selectedDeal.downPayment) : 0;
        if (reqDown > 0 && (isNaN(parseFloat(buyAmount)) || parseFloat(buyAmount) < reqDown)) {
            showMessage(`Minimum down payment is ${formatCurrency(reqDown)}. Increase buy amount to proceed.`, 'error');
            return;
        }
        // Ask for confirmation with deal name and current team name
        const dealName = selectedDeal.name || 'this deal';
        const teamName = teamState?.teamName || 'this team';
        const confirmMsg = `you are buying ${dealName} deal for team ${teamName} are you sure you want to continue`;
        const confirmed = window.confirm(confirmMsg);
        if (!confirmed) return;

        setIsDealModalOpen(false);
        const dealEndpoint = dealType === 'small' ? 'deal/small' : 'deal/big';
        await handleAction(dealEndpoint, {
            dealId: selectedDeal._id,
            buyAmount: parseFloat(buyAmount),
            installments: parseInt(installments)
        });
    setBuyAmount('');
    // Reset to default supported installment plan (4 paydays)
    setInstallments(4);
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
        // don't auto-select any deal when opening the modal
        // clear previous search state so the dropdown shows all deals by default
        setSelectedDeal(null);
        setDealSearchText('');
        setIsDealModalOpen(true);
    };

    const openAssetModal = (type) => {
        setAssetType(type);
        setIsAssetModalOpen(true);
        setAssetLoanAmount('');
    };
    // Asset loan state
    const [assetLoanAmount, setAssetLoanAmount] = useState('');

    // Sell Stocks modal state
    const [isSellStockModalOpen, setIsSellStockModalOpen] = useState(false);
    const [sellStockIndex, setSellStockIndex] = useState('');
    const [sellQuantity, setSellQuantity] = useState('');
    const [sellPrice, setSellPrice] = useState('');

    // Sell Crypto modal state
    const [isSellCryptoModalOpen, setIsSellCryptoModalOpen] = useState(false);
    const [sellCryptoIndex, setSellCryptoIndex] = useState('');
    const [sellCryptoQuantity, setSellCryptoQuantity] = useState('');
    const [sellCryptoPrice, setSellCryptoPrice] = useState('');

    const openSellStockModal = () => {
        setIsSellStockModalOpen(true);
        setSellStockIndex('');
        setSellQuantity('');
        setSellPrice('');
    };

    const openSellCryptoModal = () => {
        setIsSellCryptoModalOpen(true);
        setSellCryptoIndex('');
        setSellCryptoQuantity('');
        setSellCryptoPrice('');
    };

    const handleSellStock = async (e) => {
        e.preventDefault();
        if (sellStockIndex === '' || !sellQuantity || !sellPrice) return;
        const stock = teamState.stocks[sellStockIndex];
        if (!stock) return;
        await handleAction('stock/sell', {
            name: stock.name,
            quantity: parseInt(sellQuantity),
            price: parseFloat(sellPrice)
        });
        setIsSellStockModalOpen(false);
    };

    const handleSellCrypto = async (e) => {
        e.preventDefault();
        if (sellCryptoIndex === '' || !sellCryptoQuantity || !sellCryptoPrice) return;
        const crypto = teamState.crypto[sellCryptoIndex];
        if (!crypto) return;
        await handleAction('crypto/sell', {
            name: crypto.name,
            quantity: parseInt(sellCryptoQuantity),
            price: parseFloat(sellCryptoPrice)
        });
        setIsSellCryptoModalOpen(false);
    };

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
        setPenaltySearchText('');
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
        setChanceSearchText('');
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
    const totalLiabilities = (teamState.smallDealLoan || 0) + (teamState.bigDealLoan || 0) + (teamState.personalLoan || 0);
    const totalExpenses = teamState.expenses;
    const totalIncome = teamState.income + teamState.passiveIncome;
    // Tax logic: Only apply if nextPaydayTax is true
    const paydayRaw = totalIncome - totalExpenses;
    const tax = teamState.nextPaydayTax ? Math.round(paydayRaw * 0.40) : 0;
    const netPayday = paydayRaw - tax;

    // Loader removed

    const dealsToDisplay = dealType === 'small' ? availableSmallDeals : availableBigDeals;
    // suggestions shown in the modal's dropdown. Exclude the currently selected deal
    // so the same name doesn't appear both as the input value and as the first suggestion.
    const suggestionList = (dealSearchText ? (dealsToDisplay || []).filter(d => d.name.toLowerCase().includes(dealSearchText.toLowerCase())) : (dealsToDisplay || [])).filter(d => d._id !== (selectedDeal?._id));

    // Filtered lists for penalties and chances (used by the searchable dialogs)
    const filteredPenalties = (penaltySearchText ? (penalties || []).filter(p => p.name.toLowerCase().includes(penaltySearchText.toLowerCase())) : (penalties || [])).filter(p => p._id !== (selectedPenaltyId || ''));
    const filteredChances = (chanceSearchText ? (chances || []).filter(c => c.name.toLowerCase().includes(chanceSearchText.toLowerCase())) : (chances || [])).filter(c => c._id !== (selectedChanceId || ''));

    // required down payment for currently selected deal (0 if none or not specified)
    const requiredDownPayment = selectedDeal && selectedDeal.downPayment !== undefined && selectedDeal.downPayment !== null ? Number(selectedDeal.downPayment) : 0;

    const modeDisplay = marketMode === 'bull' ? '🐂 Bull Run (Payday +25%)'
        : marketMode === 'bear' ? '🐻 Bear Market (Payday -25%)'
            : 'Normal Market (Payday x1)';

    return (
        <div className="w-full min-h-screen block p-0 bg-black text-gray-300 overflow-x-hidden">
            {/* Market mode indicator and notification */}
            <div className="w-full flex flex-col items-center mb-2">
                <span className={`px-4 py-2 rounded-full font-semibold text-lg mb-1 ${marketMode === 'bull' ? 'bg-green-900 text-green-200' : marketMode === 'bear' ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-gray-200'}`}>{modeDisplay}</span>
                {marketNotification && (
                    <div className="mt-1 px-4 py-2 rounded bg-blue-900 text-blue-200 font-semibold shadow">{marketNotification}</div>
                )}
            </div>
            <main className="w-full max-w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 lg:gap-6">
                {/* Control Panel Card */}
                <div className="bg-[#1a1a1a] border border-gray-800 p-3 sm:p-4 md:p-6 rounded-2xl shadow-lg space-y-6 flex flex-col justify-between min-w-0">
                    <div>
                        <div className="bg-[#0f0f0f] p-4 rounded-xl shadow-inner mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-300">Username: {auth.username}</p>
                                <p className="font-bold text-gray-300">Role: {auth.role}</p>
                            </div>
                            <button onClick={handleLogout} className="py-2 px-4 rounded-xl text-sm font-semibold text-gray-200 bg-gray-900 hover:bg-gray-800 transition-colors">Logout</button>
                        </div>
                        {/* Organized button grid */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                            <button onClick={() => { if (window.confirm('Are you sure you want to trigger Payday?')) handleAction('payday'); }} className="py-3 rounded-xl font-bold text-base text-white col-span-2" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Payday</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                            <button onClick={() => openDealModal('small')} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Small Deal</button>
                            <button onClick={() => openDealModal('big')} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Big Deal</button>
                            <button onClick={() => openAssetModal('stock')} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Stock</button>
                            <button onClick={openSellStockModal} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Sell Stocks</button>
                            <button onClick={openSellCryptoModal} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Sell Crypto</button>
                            <button onClick={() => openAssetModal('crypto')} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Crypto</button>
                            <button onClick={() => openLoanModal('borrow')} className="py-2 px-2 rounded-xl text-white font-semibold" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Borrow Loan</button>
                            <button onClick={() => openLoanModal('repay')} className="py-2 px-2 rounded-xl text-white font-semibold" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Repay Loan</button>
                            {/* Sell Crypto Modal */}
                            {isSellCryptoModalOpen && (
                                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md relative">
                                        <button onClick={() => setIsSellCryptoModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none" title="Close">&times;</button>
                                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Sell Crypto</h3>
                                        {teamState.crypto && teamState.crypto.length > 0 ? (
                                            <form onSubmit={handleSellCrypto}>
                                                <div className="mb-4">
                                                    <label className="block text-gray-300 text-sm font-bold mb-2">Select Crypto:</label>
                                                    <select value={sellCryptoIndex} onChange={e => {
                                                        setSellCryptoIndex(e.target.value);
                                                        setSellCryptoQuantity('');
                                                        setSellCryptoPrice('');
                                                    }} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required>
                                                        <option value="" disabled>-- Select a crypto --</option>
                                                        {teamState.crypto.map((crypto, idx) => (
                                                            <option key={idx} value={idx}>{crypto.name} - {crypto.amount} @ {formatCurrency(crypto.purchasePrice)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {sellCryptoIndex !== '' && teamState.crypto[sellCryptoIndex] && (
                                                    <>
                                                        <div className="mb-4">
                                                            <label className="block text-gray-300 text-sm font-bold mb-2">Quantity to Sell (max: {teamState.crypto[sellCryptoIndex].amount}):</label>
                                                            <input type="text" inputMode="numeric" pattern="[0-9,]*" min="1" max={teamState.crypto[sellCryptoIndex].amount} value={formatIndian(sellCryptoQuantity)} onChange={e => setSellCryptoQuantity(stripCommas(e.target.value))} onWheel={e => e.currentTarget.blur()} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required />
                                                        </div>
                                                        <div className="mb-4">
                                                            <label className="block text-gray-300 text-sm font-bold mb-2">Sell Price per Crypto:</label>
                                                            <input type="text" inputMode="decimal" pattern="[0-9.,]*" min="0" value={formatIndian(sellCryptoPrice)} onChange={e => setSellCryptoPrice(stripCommas(e.target.value))} onWheel={e => e.currentTarget.blur()} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required />
                                                        </div>
                                                    </>
                                                )}
                                                <div className="flex justify-end space-x-2">
                                                    <button type="button" onClick={() => setIsSellCryptoModalOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
                                                        Cancel
                                                    </button>
                                                    <button type="submit" disabled={sellCryptoIndex === '' || !sellCryptoQuantity || !sellCryptoPrice || (sellCryptoIndex !== '' && (parseInt(sellCryptoQuantity) > teamState.crypto[sellCryptoIndex].amount || parseInt(sellCryptoQuantity) <= 0))} className="font-semibold py-2 px-4 rounded-md text-white bg-yellow-700 hover:bg-yellow-800">
                                                        Sell
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="text-gray-300">No crypto to sell.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Sell Stocks Modal */}
                            {isSellStockModalOpen && (
                                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md relative">
                                        <button onClick={() => setIsSellStockModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none" title="Close">&times;</button>
                                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Sell Stocks</h3>
                                        {teamState.stocks && teamState.stocks.length > 0 ? (
                                            <form onSubmit={handleSellStock}>
                                                <div className="mb-4">
                                                    <label className="block text-gray-300 text-sm font-bold mb-2">Select Stock:</label>
                                                    <select value={sellStockIndex} onChange={e => {
                                                        setSellStockIndex(e.target.value);
                                                        setSellQuantity('');
                                                        setSellPrice('');
                                                    }} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required>
                                                        <option value="" disabled>-- Select a stock --</option>
                                                        {teamState.stocks.map((stock, idx) => (
                                                            <option key={idx} value={idx}>{stock.name} - {stock.amount} @ {formatCurrency(stock.purchasePrice)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {sellStockIndex !== '' && teamState.stocks[sellStockIndex] && (
                                                    <>
                                                        <div className="mb-4">
                                                            <label className="block text-gray-300 text-sm font-bold mb-2">Quantity to Sell (max: {teamState.stocks[sellStockIndex].amount}):</label>
                                                            <input type="text" inputMode="numeric" pattern="[0-9,]*" min="1" max={teamState.stocks[sellStockIndex].amount} value={formatIndian(sellQuantity)} onChange={e => setSellQuantity(stripCommas(e.target.value))} onWheel={e => e.currentTarget.blur()} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required />
                                                        </div>
                                                        <div className="mb-4">
                                                            <label className="block text-gray-300 text-sm font-bold mb-2">Sell Price per Stock:</label>
                                                            <input type="text" inputMode="decimal" pattern="[0-9.,]*" min="0" value={formatIndian(sellPrice)} onChange={e => setSellPrice(stripCommas(e.target.value))} onWheel={e => e.currentTarget.blur()} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required />
                                                        </div>
                                                    </>
                                                )}
                                                <div className="flex justify-end space-x-2">
                                                    <button type="button" onClick={() => setIsSellStockModalOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
                                                        Cancel
                                                    </button>
                                                    <button type="submit" disabled={sellStockIndex === '' || !sellQuantity || !sellPrice || (sellStockIndex !== '' && (parseInt(sellQuantity) > teamState.stocks[sellStockIndex].amount || parseInt(sellQuantity) <= 0))} className="font-semibold py-2 px-4 rounded-md text-white bg-yellow-700 hover:bg-yellow-800">
                                                        Sell
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="text-gray-300">No stocks to sell.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <button onClick={() => handlePenaltyClick(teams[currentTeamIndex])} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Penalty</button>
                            <button onClick={() => handleChanceClick(teams[currentTeamIndex])} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Chance</button>
                            <button
                                onClick={() => {
                                    if (teamState.futureCounter > 0) {
                                        if (window.confirm('Do you want to turn off Future?')) {
                                            handleAction('future/toggle');
                                        }
                                    } else {
                                        handleAction('future/toggle');
                                    }
                                }}
                                className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}
                            >
                                -{teamState.futureCounter > 0 ? `(${teamState.futureCounter})` : ''}
                            </button>
                            <button
                                onClick={() => {
                                    if (teamState.optionsCounter > 0) {
                                        if (window.confirm('Do you want to turn off Options?')) {
                                            handleAction('options/toggle');
                                        }
                                    } else {
                                        handleAction('options/toggle');
                                    }
                                }}
                                className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}
                            >
                                -{teamState.optionsCounter > 0 ? `(${teamState.optionsCounter})` : ''}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-4">
                            <button onClick={openCashModal} className="py-2 px-2 rounded-xl text-white font-medium shadow-md" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>Deduct/Add Cash</button>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
                            <button
                                onClick={() => setCurrentTeamIndex(i => Math.max(0, i - 1))}
                                disabled={currentTeamIndex === 0}
                                style={{ background: '#353744', color: '#fff' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'} className="px-4 py-2 rounded disabled:opacity-50"
                            >Prev</button>
                            <span className="font-bold text-lg text-white">{teams[currentTeamIndex]?.teamName || "No Team"}</span>
                            <button
                                onClick={() => setCurrentTeamIndex(i => Math.min(teams.length - 1, i + 1))}
                                disabled={currentTeamIndex === teams.length - 1}
                                style={{ background: '#353744', color: '#fff' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'} className="px-4 py-2 rounded disabled:opacity-50"
                            >Next</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => { if (window.confirm('Are you sure you want to activate Asset Freeze?')) handleAction('freeze'); }} className="w-full py-3 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2" style={{ background: '#353744' }} onMouseOver={e => e.currentTarget.style.background = '#a78bfa'} onMouseOut={e => e.currentTarget.style.background = '#353744'}>
                                <span role="img" aria-label="lock" className="text-lg">🔒</span>
                                Asset Freeze
                            </button>
                        </div>
                    </div>
                </div>
                {/* Team Details Card */}
                <div className="bg-[#18181b] border border-gray-900 p-3 sm:p-4 md:p-6 rounded-2xl shadow-lg space-y-6 min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {teams.map((team, index) => (
                            <div key={team._id} className="w-full mb-4 p-4 rounded-xl shadow bg-gray-700 flex flex-col items-center border border-gray-600">
                                {/* Team Name at Top */}
                                <span className="block text-lg font-bold text-indigo-400 mb-2">{team.teamName}</span>
                                {/* Payday Counter */}
                                <span className="block text-xs font-semibold text-yellow-300 mb-1">Paydays: {team.paydayCounter ?? 0}</span>
                                {/* Vacation Status below Team Name */}
                                <span className={`mb-2 px-3 py-1 rounded-full text-xs font-bold ${team.isVacationOn ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-200'}`} title={team.isVacationOn ? 'Vacation ON: Tax exempt' : 'Vacation OFF: Tax applies'}>
                                    {team.isVacationOn ? `🌴 Vacation ON (${team.vacationPaydaysLeft} Payday left, tax exempt)` : '🏖️ Vacation OFF (tax applies)'}
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
                                        onClick={async () => {
                                            try { window.alert('you ae going to give tax to that respective team'); } catch (e) {}
                                            if (window.confirm('Are you sure you want to apply 40% Tax on next payday?')) await handleAction('tax/next', {});
                                        }}
                                        className="w-full px-4 py-2 rounded-lg text-xs font-bold shadow"
                                        style={{ background: '#353744', color: '#fff' }}
                                        onMouseOver={e => e.currentTarget.style.background = '#a78bfa'}
                                        onMouseOut={e => e.currentTarget.style.background = '#353744'}
                                        title="Apply 40% tax on next payday"
                                    >TAX</button>
                                </div>
                                {team.nextPaydayTax && (
                                    <span className="text-xs text-orange-400 font-bold mt-2">Next payday: 40% tax will apply</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-2200 p-4 rounded-xl shadow-inner">
                        <h2 className="text-xl font-bold text-center text-gray-200 mb-4">Team {teamState.teamName} Details</h2>
                        {teamState.isVacationOn && (
                            <div className="flex justify-center items-center mb-2">
                                <span className="px-3 py-1 rounded-full bg-green-900 text-green-300 font-bold text-xs">Vacation ON ({teamState.vacationPaydaysLeft} paydays left, tax exempt)</span>
                            </div>
                        )}
                        <div className="space-y-2 text-gray-400">
                            <div className="flex justify-between items-center"><span className="font-medium">Paydays:</span><span className="font-bold text-lg text-yellow-300">{teamState.paydayCounter ?? 0}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Cash:</span><span className="font-bold text-lg text-green-400">{formatCurrency(teamState.cash)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Income:</span><span className="font-bold text-lg text-green-400">{formatCurrency(totalIncome)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Cashflow:</span><span className="font-bold text-lg text-green-400">{formatCurrency(teamState.passiveIncome)}</span></div>
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
                                            <li key={deal._id}>{deal.name} (Cost: {formatCurrency(deal.cost)}, Cashflow: {formatCurrency(deal.passiveIncome)})</li>
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
                            {/* Stock Loan and Crypto Loan removed */}
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-xs">Personal Loan:</span>
                                <span className="text-xs">{formatCurrency(teamState.personalLoan || 0)}</span>
                                {teamState.personalLoan > 0 ? (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 font-bold text-xs" title="10% interest added to personal loan">interest included</span>
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
                                    <span className="ml-2 px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 font-bold text-xs" title="Includes 18% interest on personal loan">includes personal loan</span>
                                ) : (
                                    <span className="ml-2 px-2 py-1 rounded-full bg-green-900 text-green-300 font-bold text-xs" title="No interest on personal loan">No interest</span>
                                )}
                            </div>
                            {teamState.nextPaydayTax && (
                                <div className="flex justify-between items-center"><span className="font-medium">Tax (40%):</span><span className="font-bold text-lg text-red-400">{formatCurrency(tax)}</span></div>
                            )}
                            <div className="flex justify-between items-center"><span className="font-medium">Payday:</span><span className="font-bold text-lg text-green-400">{formatCurrency(netPayday)}</span></div>
                        </div>
                    </div>
                </div>
                {/* Table Logs Card */}
                <div className="bg-[#1a1a1a] border border-gray-800 p-3 sm:p-4 md:p-6 rounded-2xl shadow-lg space-y-4 flex flex-col min-w-0">
                    <h2 className="text-2xl font-bold text-white">Table Logs</h2>
                    <div className="flex-grow bg-[#0f0f0f] p-2 sm:p-4 rounded-xl shadow-inner text-sm text-gray-300 overflow-y-auto h-full min-h-[200px] sm:min-h-[350px] md:min-h-[500px] max-h-[40vh] sm:max-h-[60vh] md:max-h-[80vh]">
                        {logs.length > 0 ? logs.map((log, index) => (
                            <p key={index} className="mb-2 break-words whitespace-pre-line">{log}</p>
                        )) : (
                            <p className="text-center text-gray-500">No transaction history available.</p>
                        )}
                    </div>
                </div>
            </main>

            {isDealModalOpen && (
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">{dealType === 'small' ? 'Small Deal' : 'Big Deal'}</h3>
                        {/* Searchable dropdown: input with datalist so typing filters options */}
                        <div className="mb-3">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Search & Select a Deal:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={`Type to search ${dealType === 'small' ? 'small' : 'big'} deals...`}
                                    value={dealSearchText || (selectedDeal?._id ? selectedDeal.name : '')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setDealSearchText(val);
                                        const match = dealsToDisplay.find(d => d.name.toLowerCase() === val.toLowerCase());
                                        if (match) {
                                            setSelectedDeal(match);
                                            setBuyAmount('');
                                            setEmiPreview(null);
                                        } else {
                                            setSelectedDeal(null);
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md"
                                />
                                {/* Suggestions list shown inside modal */}
                                {dealsToDisplay && dealsToDisplay.length > 0 && (dealSearchText !== '' || !selectedDeal) && (
                                    <div className="mt-2 max-h-40 overflow-y-auto bg-[#0f1724] border border-gray-700 rounded-md">
                                        {suggestionList.map(deal => (
                                            <div
                                                key={deal._id}
                                                onClick={() => {
                                                    setSelectedDeal(deal);
                                                    setDealSearchText(deal.name);
                                                    setBuyAmount('');
                                                    setEmiPreview(null);
                                                }}
                                                className="px-3 py-2 text-gray-200 hover:bg-gray-700 cursor-pointer border-b border-gray-800"
                                            >
                                                {deal.name}
                                            </div>
                                        ))}
                                        {(dealSearchText && suggestionList.length === 0) && (
                                            <div className="px-3 py-2 text-gray-400">No matches</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Select a Deal:</label>
                            {/* Keep a hidden select for accessibility/case where needed - optional */}
                            <select
                                onChange={(e) => {
                                    const selected = dealsToDisplay.find(d => d._id === e.target.value);
                                    setSelectedDeal(selected);
                                    setBuyAmount('');
                                    setEmiPreview(null);
                                    setDealSearchText(selected ? selected.name : '');
                                }}
                                className="hidden"
                                value={selectedDeal?._id || ''}
                            >
                                <option value="" disabled>-- Select a deal --</option>
                                {dealsToDisplay.map((deal) => (
                                    <option key={deal._id} value={deal._id}>{deal.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedDeal && (
                            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-gray-200">
                                <p><strong>Name:</strong> {selectedDeal.name}</p>
                                <p><strong>Cost:</strong> {formatCurrency(selectedDeal.cost)}</p>
                                <p><strong>Cashflow:</strong> {formatCurrency(selectedDeal.passiveIncome)}</p>
                                <p><strong>Down Payment:</strong> {selectedDeal.downPayment !== undefined && selectedDeal.downPayment !== null ? formatCurrency(Number(selectedDeal.downPayment)) : 'N/A'}</p>
                                <div className="mt-4">
                                    <label className="block text-gray-300 text-sm font-bold mb-2">Buy Amount (≤ Cost):</label>
                                    <input type="text" inputMode="numeric" pattern="[0-9,]*" min="1" max={selectedDeal.cost} value={formatIndian(buyAmount)} onChange={e => {
                                        setBuyAmount(stripCommas(e.target.value));
                                        setEmiPreview(null);
                                    }} onWheel={e => e.currentTarget.blur()} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-gray-300 text-sm font-bold mb-2">Installment Plan:</label>
                                    <select value={installments} onChange={e => {
                                        setInstallments(parseInt(e.target.value, 10));
                                        setEmiPreview(null);
                                    }} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md">
                                        <option value={4}>4 Paydays (8% interest)</option>
                                        <option value={6}>6 Paydays (14% interest)</option>
                                        <option value={7}>7 Paydays (28% interest)</option>
                                    </select>
                                </div>
                                <div className="mt-4">
                                    <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-semibold disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={!buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || (requiredDownPayment > 0 && (isNaN(parseFloat(buyAmount)) || parseFloat(buyAmount) < requiredDownPayment))} onClick={() => {
                                        const principal = selectedDeal.cost - parseFloat(buyAmount);
                                        // Match backend EMI rates: 4->8%, 6->14%, 7->28%
                                        let rate = 0;
                                        if (installments === 4) rate = 0.08;
                                        else if (installments === 6) rate = 0.14;
                                        else if (installments === 7) rate = 0.28;
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
                        {/* Inline validation message for down payment */}
                        {selectedDeal && requiredDownPayment > 0 && buyAmount && !isNaN(parseFloat(buyAmount)) && parseFloat(buyAmount) < requiredDownPayment && (
                            <div className="text-sm text-red-400 mb-2">Minimum down payment required: {formatCurrency(requiredDownPayment)}. Increase buy amount to proceed.</div>
                        )}
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setIsDealModalOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
                                Cancel
                            </button>
                            <button
                                onClick={handleBuyDeal}
                                disabled={!selectedDeal || !buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || !installments || (selectedDeal && requiredDownPayment > 0 && (isNaN(parseFloat(buyAmount)) || parseFloat(buyAmount) < requiredDownPayment))}
                                className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedDeal || !buyAmount || buyAmount > selectedDeal.cost || buyAmount <= 0 || !installments ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Buy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAssetModalOpen && (
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Buy {assetType === 'stock' ? 'Stock' : 'Crypto'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const name = e.target.name.value;
                            const amount = parseInt(stripCommas(e.target.amount.value));
                            const price = parseFloat(stripCommas(e.target.price.value));
                            let loanAmount = assetLoanAmount ? parseFloat(assetLoanAmount) : 0;
                            handleBuyAsset(name, amount, price, loanAmount);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Name:</label>
                                <input type="text" name="name" className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" placeholder={assetType === 'stock' ? 'e.g., AAPL' : 'e.g., BTC'} required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Quantity</label>
                                    <input type="text" name="amount" inputMode="numeric" pattern="[0-9,]*" className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required min="1" onWheel={e => e.currentTarget.blur()} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Price:</label>
                                <input type="text" name="price" inputMode="decimal" pattern="[0-9.,]*" className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required min="0" onWheel={e => e.currentTarget.blur()} />
                            </div>

                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
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
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">{loanType === 'borrow' ? 'Borrow Loan' : 'Repay Loan'}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const amount = parseFloat(stripCommas(e.target.amount.value));
                            const repayType = loanType === 'repay' ? e.target.repayType.value : undefined;
                            handleLoanAction(amount, repayType);
                        }}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Amount:</label>
                                <input type="text" name="amount" inputMode="numeric" pattern="[0-9,]*" className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required min="1" onChange={e => setAssetLoanAmount(stripCommas(e.target.value))} onWheel={e => e.currentTarget.blur()} />
                                {loanType === 'borrow' && assetLoanAmount > 0 && (
                                    <div className="mt-2 text-xs text-blue-400">
                                        <div>Borrowed amount will be added to your loan principal. No immediate extra interest is applied at borrow time.</div>
                                        <div>Total loan principal: <span className="font-bold">{formatCurrency(parseFloat(assetLoanAmount))}</span></div>
                                        <div>Each payday, <span className="font-bold">18%</span> of your outstanding personal loan will be added to your expenses until fully repaid.</div>
                                    </div>
                                )}
                            </div>
                            {loanType === 'repay' && (
                                <div className="mb-4">
                                    <label className="block text-gray-300 text-sm font-bold mb-2">Repay Loan Type:</label>
                                    <select name="repayType" className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required>
                                        {/* Stock Loan and Crypto Loan removed */}
                                        <option value="personalLoan">Personal Loan</option>
                                    </select>
                                    <p className="text-xs text-blue-400 mt-2">Repaying stock/crypto/personal loan does not affect expenses.</p>
                                </div>
                            )}
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsLoanModalOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
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
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Deduct/Add Cash</h3>
                        <form onSubmit={handleCashUpdate}>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Operation:</label>
                                <select value={cashOperation} onChange={e => setCashOperation(e.target.value)} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md">
                                    <option value="add">Add</option>
                                    <option value="deduct">Deduct</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Type:</label>
                                <select value={cashType} onChange={e => setCashType(e.target.value)} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md">
                                    <option value="number">Number</option>
                                    <option value="percent">Percent</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm font-bold mb-2">Value:</label>
                                <input type="text" inputMode="numeric" pattern="[0-9,]*" min="1" value={formatIndian(cashValue)} onChange={e => setCashValue(stripCommas(e.target.value))} onWheel={e => e.currentTarget.blur()} className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md" required />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsCashModalOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">
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
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Select Penalty</h3>
                        {/* Search removed - single searchable input is below (same behavior as deals) */}
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Penalty:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type to search penalties..."
                                    value={penaltySearchText || (selectedPenaltyId ? penalties.find(p => p._id === selectedPenaltyId)?.name : '')}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setPenaltySearchText(val);
                                        const match = penalties.find(p => p.name.toLowerCase() === val.toLowerCase());
                                        if (match) {
                                            setSelectedPenaltyId(match._id);
                                        } else {
                                            setSelectedPenaltyId('');
                                        }
                                    }}
                                    className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md"
                                />
                                {(penalties && penalties.length > 0 && (penaltySearchText !== '' || !selectedPenaltyId)) && (
                                    <div className="mt-2 max-h-40 overflow-y-auto bg-[#0f1724] border border-gray-700 rounded-md">
                                        {filteredPenalties.map(p => (
                                            <div key={p._id} onClick={() => {
                                                setSelectedPenaltyId(p._id);
                                                setPenaltySearchText(p.name);
                                                setCustomPenaltyAmount('');
                                            }} className="px-3 py-2 text-gray-200 hover:bg-gray-700 cursor-pointer border-b border-gray-800">
                                                {p.name} (₹{p.amount})
                                            </div>
                                        ))}
                                        {(penaltySearchText && filteredPenalties.length === 0) && (
                                            <div className="px-3 py-2 text-gray-400">No matches</div>
                                        )}
                                    </div>
                                )}
                                {/* hidden select for accessibility */}
                                <select className="hidden" value={selectedPenaltyId} onChange={e => setSelectedPenaltyId(e.target.value)}>
                                    <option value="" disabled>-- Select a penalty --</option>
                                    {penalties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {selectedPenaltyId && (
                            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-gray-200">
                                <p><strong>Description:</strong> {penalties.find(p => p._id === selectedPenaltyId)?.description}</p>
                                <p><strong>Default Amount:</strong> ₹{penalties.find(p => p._id === selectedPenaltyId)?.amount}</p>
                            </div>
                        )}
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setIsPenaltyDialogOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">Cancel</button>
                            <button onClick={handleApplyPenalty} disabled={!selectedPenaltyId} className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedPenaltyId ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chance Selection Dialog */}
            {isChanceDialogOpen && (
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <h3 className="text-2xl font-bold text-center mb-4 text-white">Select Chance</h3>
                        {/* Search removed - single searchable input is below (same behavior as deals) */}
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Chance:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type to search chances..."
                                    value={chanceSearchText || (selectedChanceId ? chances.find(c => c._id === selectedChanceId)?.name : '')}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setChanceSearchText(val);
                                        const match = chances.find(c => c.name.toLowerCase() === val.toLowerCase());
                                        if (match) setSelectedChanceId(match._id);
                                        else setSelectedChanceId('');
                                    }}
                                    className="w-full p-2 border border-gray-700 bg-gray-800 text-gray-200 rounded-md"
                                />
                                {(chances && chances.length > 0 && (chanceSearchText !== '' || !selectedChanceId)) && (
                                    <div className="mt-2 max-h-40 overflow-y-auto bg-[#0f1724] border border-gray-700 rounded-md">
                                        {filteredChances.map(c => (
                                            <div key={c._id} onClick={() => {
                                                setSelectedChanceId(c._id);
                                                setChanceSearchText(c.name);
                                            }} className="px-3 py-2 text-gray-200 hover:bg-gray-700 cursor-pointer border-b border-gray-800">
                                                {c.name} (₹{c.amount})
                                            </div>
                                        ))}
                                        {(chanceSearchText && filteredChances.length === 0) && (
                                            <div className="px-3 py-2 text-gray-400">No matches</div>
                                        )}
                                    </div>
                                )}
                                {/* hidden select for accessibility */}
                                <select className="hidden" value={selectedChanceId} onChange={e => setSelectedChanceId(e.target.value)}>
                                    <option value="" disabled>-- Select a chance --</option>
                                    {chances.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        {selectedChanceId && (
                            <div className="bg-gray-800 p-4 rounded-lg mb-4 text-gray-200">
                                <p><strong>Description:</strong> {chances.find(c => c._id === selectedChanceId)?.description}</p>
                                <p><strong>Amount:</strong> ₹{chances.find(c => c._id === selectedChanceId)?.amount}</p>
                            </div>
                        )}
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setIsChanceDialogOpen(false)} className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600">Cancel</button>
                            <button onClick={handleApplyChance} disabled={!selectedChanceId} className={`font-semibold py-2 px-4 rounded-md text-white transition-colors ${!selectedChanceId ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>Apply</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Winner Modal */}
            {winnerTeam && (
                <div className="fixed inset-0 bg-black/75 bg-opacity flex items-center justify-center z-60">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg w-full max-w-sm text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">We have a winner!</h3>
                        <p className="text-gray-200 mb-4">Team <span className="font-bold text-indigo-300">{winnerTeam.teamName}</span> has cashflow greater than expenses and wins the game.</p>
                        <div className="flex justify-center">
                            <button onClick={() => setWinnerTeam(null)} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-semibold">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamePage;