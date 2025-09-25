// Sell crypto for a team
exports.handleSellCrypto = async (req, res) => {
  try {
    const { teamId, name, quantity, price } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.isAssetsFrozen) {
      return res.status(403).json({ message: 'Assets are frozen. Cannot sell crypto.' });
    }
    // Find the crypto
    const cryptoIdx = team.crypto.findIndex(c => c.name === name);
    if (cryptoIdx === -1) return res.status(400).json({ message: 'Crypto not found.' });
    const crypto = team.crypto[cryptoIdx];
    if (quantity > crypto.amount) return res.status(400).json({ message: 'Not enough crypto quantity to sell.' });
    // Calculate proceeds
    const proceeds = price * quantity;
    // Update crypto amount or remove if all sold
    if (quantity === crypto.amount) {
      team.crypto.splice(cryptoIdx, 1);
    } else {
      team.crypto[cryptoIdx].amount -= quantity;
    }
    // Update cash and assets
    team.cash += proceeds;

    team.assets -= crypto.purchasePrice * quantity;
    if (team.assets < 0) team.assets = 0;
    await addLogEntry(team.tableId, `Team ${team.teamName} sold ${quantity} units of ${name} crypto at ${price} each for ${proceeds}.`);
    await team.save();
    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Sell stocks for a team
exports.handleSellStock = async (req, res) => {
  try {
    const { teamId, name, quantity, price } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.isAssetsFrozen) {
      return res.status(403).json({ message: 'Assets are frozen. Cannot sell stocks.' });
    }
    // Find the stock
    const stockIdx = team.stocks.findIndex(s => s.name === name);
    if (stockIdx === -1) return res.status(400).json({ message: 'Stock not found.' });
    const stock = team.stocks[stockIdx];
    if (quantity > stock.amount) return res.status(400).json({ message: 'Not enough stock quantity to sell.' });
    // Calculate proceeds
    const proceeds = price * quantity;
    // Update stock amount or remove if all sold
    if (quantity === stock.amount) {
      team.stocks.splice(stockIdx, 1);
    } else {
      team.stocks[stockIdx].amount -= quantity;
    }
    // Update cash and assets
    team.cash += proceeds;
    team.assets -= stock.purchasePrice * quantity;
    if (team.assets < 0) team.assets = 0;
    await addLogEntry(team.tableId, `Team ${team.teamName} sold ${quantity} units of ${name} stock at ${price} each for ${proceeds}.`);
    await team.save();
    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Set next payday tax for a team
exports.setNextPaydayTax = async (req, res) => {
  try {
    const { teamId } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
  team.nextPaydayTax = true;
  await team.save();
  addLogEntry(team.tableId, `Team ${team.teamName}: TAX button clicked. Next payday will apply 40% tax.`);
  res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Toggle vacation on/off for a team
exports.toggleVacation = async (req, res) => {
  try {
    const { teamId, status } = req.body; // status: true (on) or false (off)
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.isVacationOn = !!status;
    team.vacationPaydaysLeft = status ? 4 : 0;
    await team.save();
    await addLogEntry(team.tableId, `Team ${team.teamName} vacation turned ${status ? 'ON' : 'OFF'}. Tax exemption for next ${team.vacationPaydaysLeft} paydays.`);
    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Deduct or add cash to a team by percentage or number
exports.deductOrAddCash = async (req, res) => {
  try {
    const { teamId, value, type, operation } = req.body;
    // type: 'percent' or 'number'; operation: 'add' or 'deduct'
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    let change = 0;
    if (type === 'percent') {
      change = team.cash * (parseFloat(value) / 100);
    } else {
      change = parseFloat(value);
    }
    if (isNaN(change) || change < 0) {
      return res.status(400).json({ message: 'Invalid value.' });
    }

    if (operation === 'deduct') {
      if (team.cash < change) {
        return res.status(400).json({ message: 'Not enough cash to deduct.' });
      }
      team.cash -= change;
      await addLogEntry(team.tableId, `Team ${team.teamName} deducted ${change} cash (${type}).`);
    } else if (operation === 'add') {
      team.cash += change;
      await addLogEntry(team.tableId, `Team ${team.teamName} added ${change} cash (${type}).`);
    } else {
      return res.status(400).json({ message: 'Invalid operation.' });
    }
    await team.save();

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Global market mode state
let marketMode = 'normal'; // 'bull', 'bear', 'normal'

// Expose current market mode
exports.getMarketMode = (req, res) => {
  res.json({ mode: marketMode });
};

exports.setMarketMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['bull', 'bear', 'bull-stop', 'bear-stop'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid market mode.' });
    }
    if (mode === 'bull') marketMode = 'bull';
    else if (mode === 'bear') marketMode = 'bear';
    else if (mode === 'bull-stop' || mode === 'bear-stop') marketMode = 'normal';
    else marketMode = 'normal';

    // Update all teams' payday/interest rates
    const teams = await Team.find({});
    for (const team of teams) {
      // Only adjust the payday multiplier per market mode. Do NOT modify loanInterestRate here.
      if (marketMode === 'bull') {
        team.paydayMultiplier = 1.25;
      } else if (marketMode === 'bear') {
        team.paydayMultiplier = 0.75;
      } else {
        team.paydayMultiplier = 1.0;
      }
      await team.save();
    }
    // Log market mode change for each unique tableId
    const uniqueTableIds = [...new Set(teams.map(t => t.tableId?.toString()).filter(Boolean))];
    const logMsg = `Market mode set to ${marketMode}`;
    await Promise.all(uniqueTableIds.map(tableId => TableLog.create({ tableId, message: logMsg })));
    res.status(200).json({ message: logMsg });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Helper for personal loan interest (fixed). Market mode no longer alters personal loan interest.
const getMarketPersonalRate = () => {
  return 0.18; // Fixed 18% personal loan interest charged each payday
};
const mongoose = require('mongoose');
const Team = require('../models/Team');
const Deal = require('../models/Deal');
const TableLog = require('../models/TableLog');

const addLogEntry = async (tableId, message) => {
    try {
        await TableLog.create({ tableId, message });
    } catch (error) {
        console.error("Error saving log to database:", error);
    }
};

// Helper to compute expenses for a team object (doesn't fetch from DB)
const computeExpensesForTeam = (team) => {
    const baseExpenses = 350000;
    let emiExpenseTotal = 0;
    if (team.smallDealEmis && Array.isArray(team.smallDealEmis)) {
      team.smallDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
    }
    if (team.bigDealEmis && Array.isArray(team.bigDealEmis)) {
      team.bigDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
    }
  const personalLoanInterest = (team.personalLoan && typeof team.personalLoan === 'number') ? team.personalLoan * 0.18 : 0;
    return Math.round(baseExpenses + emiExpenseTotal + personalLoanInterest);
};

exports.getGameState = async (req, res) => {
  try {
    const teams = await Team.find({ tableId: req.user._id }).populate('deals');
    // Recompute expenses for each team before returning so UI sees immediate EMI additions
    const teamsWithComputed = teams.map(t => {
      const teamObj = t.toObject ? t.toObject() : t;
      teamObj.expenses = computeExpensesForTeam(teamObj);
      return teamObj;
    });
    const logs = await TableLog.find({ tableId: req.user._id }).sort({ timestamp: -1 });
    res.json({ teams: teamsWithComputed, logs });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDeals = async (req, res) => {
    try {
        const { type } = req.params;
        const deals = await Deal.find({ dealType: type });
        res.json({ deals });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.handlePayday = async (req, res) => {
  try {
    const { teamId } = req.body;
    const teamState = await Team.findById(teamId);

    if (!teamState) {
      return res.status(404).json({ message: 'Team not found' });
    }

  // Decrement future and options counters
  if (teamState.futureCounter > 0) {
    teamState.futureCounter -= 1;
    if (teamState.futureCounter === 0) {
      await addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Future has expired.`);
    }
  }
  if (teamState.optionsCounter > 0) {
    teamState.optionsCounter -= 1;
    if (teamState.optionsCounter === 0) {
      await addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Options has expired.`);
    }
  }

  // Always reset expenses to base value before adding EMI/loan charges
  let baseExpenses = 350000;
  teamState.expenses = baseExpenses;

  // Vacation tax exemption logic
  let taxExempt = false;
  if (teamState.isVacationOn && teamState.vacationPaydaysLeft > 0) {
    taxExempt = true;
    teamState.vacationPaydaysLeft -= 1;
    if (teamState.vacationPaydaysLeft === 0) {
      teamState.isVacationOn = false;
      await addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Vacation ended. Tax exemption expired.`);
    } else {
      await addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Vacation ON. Tax exemption for this payday. ${teamState.vacationPaydaysLeft} paydays left.`);
    }
  }

  // Apply market mode payday multiplier (persisted on team)
  const paydayMultiplier = typeof teamState.paydayMultiplier === 'number' ? teamState.paydayMultiplier : 1.0;

    // Process EMIs for small deals
    let emiExpenseTotal = 0;
    if (teamState.smallDealEmis && Array.isArray(teamState.smallDealEmis)) {
      let totalSmallEmiPaid = 0;
      teamState.smallDealEmis = teamState.smallDealEmis.filter(emiObj => {
        if (emiObj.installmentsLeft > 0 && emiObj.totalLoan > 0) {
          emiObj.totalLoan -= emiObj.emi;
          emiObj.installmentsLeft -= 1;
          if (emiObj.totalLoan < 0) emiObj.totalLoan = 0;
          totalSmallEmiPaid += emiObj.emi;
          // Only count the EMI itself as an expense (removed automatic 10% of total loan)
          emiExpenseTotal += emiObj.emi;
          addLogEntry(teamState.tableId, `Small Deal EMI paid: ${emiObj.emi.toFixed(2)}. Remaining loan: ${emiObj.totalLoan.toFixed(2)}. Installments left: ${emiObj.installmentsLeft}`);
          return emiObj.installmentsLeft > 0 && emiObj.totalLoan > 0;
        }
        return false;
      });
      teamState.smallDealLoan -= totalSmallEmiPaid;
      if (teamState.smallDealLoan < 0) teamState.smallDealLoan = 0;
    }
    if (teamState.bigDealEmis && Array.isArray(teamState.bigDealEmis)) {
      let totalBigEmiPaid = 0;
      teamState.bigDealEmis = teamState.bigDealEmis.filter(emiObj => {
        if (emiObj.installmentsLeft > 0 && emiObj.totalLoan > 0) {
          emiObj.totalLoan -= emiObj.emi;
          emiObj.installmentsLeft -= 1;
          if (emiObj.totalLoan < 0) emiObj.totalLoan = 0;
          totalBigEmiPaid += emiObj.emi;
          // Only count the EMI itself as an expense (removed automatic 10% of total loan)
          emiExpenseTotal += emiObj.emi;
          addLogEntry(teamState.tableId, `Big Deal EMI paid: ${emiObj.emi.toFixed(2)}. Remaining loan: ${emiObj.totalLoan.toFixed(2)}. Installments left: ${emiObj.installmentsLeft}`);
          return emiObj.installmentsLeft > 0 && emiObj.totalLoan > 0;
        }
        return false;
      });
      teamState.bigDealLoan -= totalBigEmiPaid;
      if (teamState.bigDealLoan < 0) teamState.bigDealLoan = 0;
    }
    // Add EMI/loan charges to base expenses if any active EMIs
    let personalLoanInterest = 0;
    if (teamState.personalLoan && teamState.personalLoan > 0) {
      // Personal loan interest charged each payday is 18% of outstanding personalLoan
      personalLoanInterest = teamState.personalLoan * 0.18;
    }
    teamState.expenses = baseExpenses + emiExpenseTotal + personalLoanInterest;
  // Calculate net payday (income + passiveIncome - expenses), then apply paydayMultiplier
  const totalIncome = teamState.income + teamState.passiveIncome;
  const totalExpenses = teamState.expenses;
  let netPaydayIncome = (totalIncome - totalExpenses) * paydayMultiplier;
  if (personalLoanInterest > 0) {
    addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Personal loan interest of ${personalLoanInterest.toFixed(2)} added to expenses.`);
  }
  // Apply 40% tax ONLY if nextPaydayTax is true
  let tax = 0;
  if (teamState.nextPaydayTax) {
    tax = Math.round(netPaydayIncome * 0.40);
    netPaydayIncome -= tax;
    teamState.nextPaydayTax = false;
    addLogEntry(teamState.tableId, `Team ${teamState.teamName}: 40% tax applied on payday. Tax deducted: ${tax}`);
  }

  if (teamState.isAssetsFrozen) {
    if (teamState.paydayFrozenTurn === 0) {
      // Asset freeze: only expenses deducted
      if (teamState.cash < totalExpenses) {
        const shortfall = totalExpenses - teamState.cash;
        teamState.personalLoan += shortfall;
        teamState.cash = 0;
        addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Assets frozen. Not enough cash for expenses. Personal loan taken: ${shortfall}.`);
      } else {
        teamState.cash -= totalExpenses;
      }
      teamState.paydayFrozenTurn = 1;
      addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Assets are frozen. Payday income is zero. Expenses have been deducted.`);
    } else {
      teamState.isAssetsFrozen = false;
      teamState.paydayFrozenTurn = 0;
      teamState.cash += netPaydayIncome;
      addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Assets are no longer frozen. Your net payday is ${netPaydayIncome}.`);
    }
  } else {
    // Normal payday: add net income, but if cash < expenses, create personal loan for shortfall
    if (teamState.cash + netPaydayIncome < 0) {
      // This case is rare, but if netPaydayIncome is negative and cash is not enough
      const shortfall = Math.abs(teamState.cash + netPaydayIncome);
      teamState.personalLoan += shortfall;
      teamState.cash = 0;
      addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Not enough cash for expenses. Personal loan taken: ${shortfall}.`);
    } else {
      teamState.cash += netPaydayIncome;
    }
  addLogEntry(teamState.tableId, `Team ${teamState.teamName}: You received a net payday of ${netPaydayIncome}. ${tax > 0 ? `Tax deducted: ${tax}` : ''}`);
  }

  // Increment payday counter
  teamState.paydayCounter = (typeof teamState.paydayCounter === 'number' ? teamState.paydayCounter : 0) + 1;
  await teamState.save();
    
    const allTeams = await Team.find({ tableId: teamState.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: teamState.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleRoll = async (req, res) => {
  try {
    const { teamId } = req.body;
    const teamState = await Team.findById(teamId);
    if (!teamState) return res.status(404).json({ message: 'Team not found' });
    
    const rollResult = Math.floor(Math.random() * 6) + 1;
    const events = ['Chance', 'Small Deal', 'Big Deal', 'Stock', 'Crypto', 'Payday'];
    const event = events[rollResult - 1];
    
    addLogEntry(teamState.tableId, `Team ${teamState.teamName} rolled a ${rollResult}. Landing on: ${event}.`);
    
    const allTeams = await Team.find({ tableId: teamState.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: teamState.tableId }).sort({ timestamp: -1 });
    res.json({ teams: allTeams, event, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleSmallDeal = async (req, res) => {
  try {
    const { teamId, dealId, buyAmount, installments } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.isAssetsFrozen) {
      return res.status(403).json({ message: 'Assets are frozen. Cannot buy deals.' });
    }

    const universalDeal = await Deal.findById(dealId);
    if (!universalDeal) {
      return res.status(404).json({ message: 'Deal not found.' });
    }

    const dealAlreadyOwned = universalDeal.owners.some(owner => owner.tableId.toString() === team.tableId.toString());
    if (dealAlreadyOwned) {
      return res.status(409).json({ message: 'This deal is already owned by a team on this table.' });
    }

    if (buyAmount > universalDeal.cost || buyAmount <= 0) {
      return res.status(400).json({ message: 'Invalid buy amount.' });
    }
    if (team.cash < buyAmount) {
      return res.status(400).json({ message: 'Not enough cash to buy this deal.' });
    }

    // Calculate loan and interest
    const loanPrincipal = universalDeal.cost - buyAmount;
    let interestRate = 0;
  // Supported installment plans and their interest rates:
  // 4 paydays -> 8%, 6 paydays -> 14%, 7 paydays -> 28%
  if (installments === 4) interestRate = 0.08;
  else if (installments === 6) interestRate = 0.14;
  else if (installments === 7) interestRate = 0.28;
  else return res.status(400).json({ message: 'Invalid installment plan. Supported plans: 4, 6, 7 paydays.' });
    const interest = loanPrincipal * interestRate;
    const totalLoan = loanPrincipal + interest;
    // EMI calculation
    const emi = totalLoan / installments;
    // Expense increase: only the EMI amount is added to expenses (no 10% of total loan)
    const expenseIncrease = emi;

    universalDeal.owners.push({ tableId: team.tableId, teamId: team._id });
    await universalDeal.save();

    team.cash -= buyAmount;
    team.passiveIncome += universalDeal.passiveIncome;
    team.assets += buyAmount;
    team.deals.push(universalDeal._id);
    team.smallDealLoan += totalLoan;
    // Store EMI plan for future payday logic (custom field) BEFORE recomputing expenses
    if (!team.smallDealEmis) team.smallDealEmis = [];
    // Defensive: avoid adding duplicate EMI entries for the same deal
    if (!team.smallDealEmis.some(e => e.dealId && e.dealId.toString() === dealId.toString())) {
      team.smallDealEmis.push({ dealId, totalLoan, emi, installmentsLeft: installments, interestRate });
    } else {
      // if a matching EMI already exists, log for debugging
      await addLogEntry(team.tableId, `Duplicate EMI prevented for deal ${dealId} on team ${team.teamName}.`);
    }
    // Recompute expenses to avoid any legacy or duplicate additions: base + sum(all EMIs) + personal loan interest
    {
      const baseExpenses = 350000;
      let emiExpenseTotal = 0;
      if (team.smallDealEmis && Array.isArray(team.smallDealEmis)) {
        team.smallDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
      }
      if (team.bigDealEmis && Array.isArray(team.bigDealEmis)) {
        team.bigDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
      }
    const personalLoanInterest = (team.personalLoan && typeof team.personalLoan === 'number') ? team.personalLoan * 0.18 : 0;
    team.expenses = Math.round(baseExpenses + emiExpenseTotal + personalLoanInterest);
    }
  await team.save();
  // Log immediate expense update for visibility/debugging
  await addLogEntry(team.tableId, `Team ${team.teamName} purchased "${universalDeal.name}" for ${buyAmount}. Loan: ${totalLoan} (${installments} installments, ${interestRate * 100}% interest). EMI: ${emi.toFixed(2)}. Expenses updated to: ${team.expenses}.`);

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleBigDeal = async (req, res) => {
  try {
    const { teamId, dealId, buyAmount, installments } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.isAssetsFrozen) {
      return res.status(403).json({ message: 'Assets are frozen. Cannot buy deals.' });
    }

    const universalDeal = await Deal.findById(dealId);
    if (!universalDeal) {
      return res.status(404).json({ message: 'Deal not found.' });
    }

    const dealAlreadyOwned = universalDeal.owners.some(owner => owner.tableId.toString() === team.tableId.toString());
    if (dealAlreadyOwned) {
      return res.status(409).json({ message: 'This deal is already owned by a team on this table.' });
    }

    if (buyAmount > universalDeal.cost || buyAmount <= 0) {
      return res.status(400).json({ message: 'Invalid buy amount.' });
    }
    if (team.cash < buyAmount) {
      return res.status(400).json({ message: 'Not enough cash to buy this deal.' });
    }

    // Calculate loan and interest
    const loanPrincipal = universalDeal.cost - buyAmount;
    let interestRate = 0;
  // Supported installment plans and their interest rates:
  // 4 paydays -> 8%, 6 paydays -> 14%, 7 paydays -> 28%
  if (installments === 4) interestRate = 0.08;
  else if (installments === 6) interestRate = 0.14;
  else if (installments === 7) interestRate = 0.28;
  else return res.status(400).json({ message: 'Invalid installment plan. Supported plans: 4, 6, 7 paydays.' });
    const interest = loanPrincipal * interestRate;
    const totalLoan = loanPrincipal + interest;
    // EMI calculation
    const emi = totalLoan / installments;
    // Expense increase: only the EMI amount is added to expenses (no 10% of total loan)
    const expenseIncrease = emi;

    universalDeal.owners.push({ tableId: team.tableId, teamId: team._id });
    await universalDeal.save();

    team.cash -= buyAmount;
    team.passiveIncome += universalDeal.passiveIncome;
    team.assets += buyAmount;
    team.deals.push(universalDeal._id);
    team.bigDealLoan += totalLoan;
    // Store EMI plan for future payday logic (custom field) BEFORE recomputing expenses
    if (!team.bigDealEmis) team.bigDealEmis = [];
    // Defensive: avoid adding duplicate EMI entries for the same deal
    if (!team.bigDealEmis.some(e => e.dealId && e.dealId.toString() === dealId.toString())) {
      team.bigDealEmis.push({ dealId, totalLoan, emi, installmentsLeft: installments, interestRate });
    } else {
      await addLogEntry(team.tableId, `Duplicate EMI prevented for deal ${dealId} on team ${team.teamName}.`);
    }
    // Recompute expenses to avoid any legacy or duplicate additions: base + sum(all EMIs) + personal loan interest
    {
      const baseExpenses = 350000;
      let emiExpenseTotal = 0;
      if (team.smallDealEmis && Array.isArray(team.smallDealEmis)) {
        team.smallDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
      }
      if (team.bigDealEmis && Array.isArray(team.bigDealEmis)) {
        team.bigDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
      }
  const personalLoanInterest = (team.personalLoan && typeof team.personalLoan === 'number') ? team.personalLoan * 0.18 : 0;
      team.expenses = Math.round(baseExpenses + emiExpenseTotal + personalLoanInterest);
    }
  await team.save();
  // Log immediate expense update for visibility/debugging
  await addLogEntry(team.tableId, `Team ${team.teamName} purchased "${universalDeal.name}" for ${buyAmount}. Loan: ${totalLoan} (${installments} installments, ${interestRate * 100}% interest). EMI: ${emi.toFixed(2)}. Expenses updated to: ${team.expenses}.`);

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleBuyStock = async (req, res) => {
  try {
    const { teamId, name, amount, price, loanAmount, installments } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.isAssetsFrozen) {
      return res.status(403).json({ message: 'Assets are frozen. Cannot buy stocks.' });
    }

    const totalCost = price * amount;
    if (loanAmount && loanAmount > 0) {
      // User requested loan for stock purchase
  const interestRate = team.loanInterestRate || 0.10;
  const interest = loanAmount * interestRate;
      const totalLoan = loanAmount + interest;
  team.stocksLoan += totalLoan;
  team.cash -= (totalCost - loanAmount);
  if (team.cash < 0) team.cash = 0;
  // No expense increase for stock loan
  addLogEntry(team.tableId, `Team ${team.teamName} bought ${amount} units of ${name} stock for ${totalCost}. Loan: ${totalLoan} (10% interest).`);
    } else {
      // No loan, pay with cash
      if (team.cash < totalCost) {
        return res.status(400).json({ message: 'Not enough cash to buy this stock.' });
      }
      team.cash -= totalCost;
      addLogEntry(team.tableId, `Team ${team.teamName} bought ${amount} units of ${name} stock for ${totalCost}.`);
    }

    const newStock = {
      name,
      amount,
      purchasePrice: price,
    };
    team.assets += totalCost;
    team.stocks.push(newStock);
    await team.save();

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleBuyCrypto = async (req, res) => {
  try {
    const { teamId, name, amount, price, loanAmount, installments } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.isAssetsFrozen) {
      return res.status(403).json({ message: 'Assets are frozen. Cannot buy crypto.' });
    }

    const totalCost = price * amount;
    if (loanAmount && loanAmount > 0) {
  const interestRate = team.loanInterestRate || 0.13;
  const interest = loanAmount * interestRate;
      const totalLoan = loanAmount + interest;
  team.cryptoLoan += totalLoan;
  team.cash -= (totalCost - loanAmount);
  if (team.cash < 0) team.cash = 0;
  // No expense increase for crypto loan
  addLogEntry(team.tableId, `Team ${team.teamName} bought ${amount} units of ${name} crypto for ${totalCost}. Loan: ${totalLoan} (10% interest).`);
    } else {
      if (team.cash < totalCost) {
        return res.status(400).json({ message: 'Not enough cash to buy this crypto.' });
      }
      team.cash -= totalCost;
      addLogEntry(team.tableId, `Team ${team.teamName} bought ${amount} units of ${name} crypto for ${totalCost}.`);
    }

    const newCrypto = {
      name,
      amount,
      purchasePrice: price,
    };
    team.assets += totalCost;
    team.crypto.push(newCrypto);
    await team.save();

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleAssetFreeze = async (req, res) => {
    try {
        const { teamId } = req.body;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        
        team.isAssetsFrozen = true;
        team.paydayFrozenTurn = 0;
        await team.save();

        addLogEntry(team.tableId, `Team ${team.teamName} has had their assets frozen.`);
        
        const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
        const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
        res.status(200).json({ teams: allTeams, logs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.handlePenalty = async (req, res) => {
  try {
    const { teamId, penaltyId, amount } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const Penalty = require('../models/Penalty');
    const penalty = await Penalty.findById(penaltyId);
    if (!penalty) return res.status(404).json({ message: 'Penalty not found' });

    // Use custom amount if provided, else default penalty amount
    const penaltyAmount = amount ? parseInt(amount) : penalty.amount;
    team.cash -= penaltyAmount;
    // Save penalty history
    if (!team.penalties) team.penalties = [];
    team.penalties.push({
      penaltyId: penalty._id,
      name: penalty.name,
      amount: penaltyAmount,
      date: new Date()
    });
    await team.save();

    addLogEntry(team.tableId, `Team ${team.teamName} penalty: ${penalty.name} - ₹${penaltyAmount}. ${penalty.description}`);

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleChance = async (req, res) => {
  try {
    const { teamId, chanceId } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const Chance = require('../models/Chance');
    const chance = await Chance.findById(chanceId);
    if (!chance) return res.status(404).json({ message: 'Chance not found' });

    team.cash += chance.amount;
    // Save chance history
    if (!team.chances) team.chances = [];
    team.chances.push({
      chanceId: chance._id,
      name: chance.name,
      amount: chance.amount,
      date: new Date()
    });
    await team.save();

    addLogEntry(team.tableId, `Team ${team.teamName} chance: ${chance.name} +₹${chance.amount}. ${chance.description}`);

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs, message: `You drew a Chance card: "${chance.name}"` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.handleBorrowLoan = async (req, res) => {
    try {
        const { teamId, amount } = req.body;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        
    const loanAmount = parseFloat(amount);
    if (isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({ message: 'Invalid loan amount.' });
    }

    // Add borrowed principal to personal loan (no immediate interest applied at borrow time)
    team.personalLoan += loanAmount;
    team.cash += loanAmount;

    // Update expenses to immediately reflect any change in outstanding personal loan
    let baseExpenses = 350000;
    let emiExpenseTotal = 0;
    if (team.smallDealEmis && Array.isArray(team.smallDealEmis)) {
      team.smallDealEmis.forEach(emiObj => {
        emiExpenseTotal += emiObj.emi;
      });
    }
    if (team.bigDealEmis && Array.isArray(team.bigDealEmis)) {
      team.bigDealEmis.forEach(emiObj => {
        emiExpenseTotal += emiObj.emi;
      });
    }
    // Personal loan interest charged on paydays is 18% of outstanding principal; reflect it in expenses immediately
    let personalLoanInterestNow = (team.personalLoan && typeof team.personalLoan === 'number') ? team.personalLoan * 0.18 : 0;
    team.expenses = baseExpenses + emiExpenseTotal + personalLoanInterestNow;
    await team.save();

  await addLogEntry(team.tableId, `Team ${team.teamName} borrowed a loan of ${loanAmount}. Personal loan interest is 18% and will be charged each payday; expenses updated: ${team.expenses}.`);
    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.handleRepayLoan = async (req, res) => {
  try {
    const { teamId, amount, repayType } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const repayAmount = parseFloat(amount);
    if (isNaN(repayAmount) || repayAmount <= 0) {
      return res.status(400).json({ message: 'Invalid repayment amount.' });
    }
    if (team.cash < repayAmount) {
      return res.status(400).json({ message: 'Not enough cash to repay that amount.' });
    }

  let loanField = null;
  if (repayType === 'smallDealLoan') loanField = 'smallDealLoan';
  else if (repayType === 'bigDealLoan') loanField = 'bigDealLoan';
  else if (repayType === 'stocksLoan') loanField = 'stocksLoan';
  else if (repayType === 'cryptoLoan') loanField = 'cryptoLoan';
  else if (repayType === 'personalLoan') loanField = 'personalLoan';

    if (team[loanField] < repayAmount) {
      return res.status(400).json({ message: 'Not enough loan outstanding to repay that amount.' });
    }

    team[loanField] -= repayAmount;
    team.cash -= repayAmount;

    // If personal loan repayment, immediately recompute expenses to reflect 18% of the remaining principal
    if (loanField === 'personalLoan') {
      // Ensure not negative
      if (team.personalLoan < 0) team.personalLoan = 0;
      const baseExpenses = 350000;
      let emiExpenseTotal = 0;
      if (team.smallDealEmis && Array.isArray(team.smallDealEmis)) {
        team.smallDealEmis.forEach(emiObj => {
          emiExpenseTotal += emiObj.emi;
        });
      }
      if (team.bigDealEmis && Array.isArray(team.bigDealEmis)) {
        team.bigDealEmis.forEach(emiObj => {
          emiExpenseTotal += emiObj.emi;
        });
      }
      if (team.personalLoan > 0) {
        const personalLoanInterestNow = team.personalLoan * 0.18;
        team.expenses = Math.round(baseExpenses + emiExpenseTotal + personalLoanInterestNow);
        addLogEntry(team.tableId, `Team ${team.teamName}: Personal loan repayment of ${repayAmount} received. Outstanding principal: ${team.personalLoan}. Expenses updated: ${team.expenses}.`);
      } else {
        // fully repaid
        team.expenses = Math.round(baseExpenses + emiExpenseTotal);
        addLogEntry(team.tableId, `Team ${team.teamName} has fully repaid personal loan. 18% interest removed from expenses. Expenses updated: ${team.expenses}.`);
      }
    }
    await team.save();

    addLogEntry(team.tableId, `Team ${team.teamName} repaid ${repayAmount} of ${loanField}.`);

    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Toggle 'Future' counter
exports.toggleFuture = async (req, res) => {
  try {
    const { teamId } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.futureCounter > 0) {
      team.futureCounter = 0; // Turn off
      await addLogEntry(team.tableId, `Team ${team.teamName} turned off Future.`);
    } else {
      team.futureCounter = 4; // Turn on
      await addLogEntry(team.tableId, `Team ${team.teamName} turned on.`);
    }

    await team.save();
    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle 'Options' counter
exports.toggleOptions = async (req, res) => {
  try {
    const { teamId } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.optionsCounter > 0) {
      team.optionsCounter = 0; // Turn off
      await addLogEntry(team.tableId, `Team ${team.teamName} turned off Options.`);
    } else {
      team.optionsCounter = 4; // Turn on
      await addLogEntry(team.tableId, `Team ${team.teamName} turned on.`);
    }

    await team.save();
    const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
    const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
    res.status(200).json({ teams: allTeams, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};