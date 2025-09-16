// Global market mode state
let marketMode = 'normal'; // 'bull', 'bear', 'normal'

exports.setMarketMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['bull', 'bear', 'bull-stop', 'bear-stop'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid market mode.' });
    }
    if (mode === 'bull') marketMode = 'bull';
    else if (mode === 'bear') marketMode = 'bear';
    else marketMode = 'normal';

    // Update all teams' payday/interest rates
    const teams = await Team.find({});
    for (const team of teams) {
      if (marketMode === 'bull') {
        team.paydayMultiplier = 1.25;
        team.loanInterestRate = 0.07;
      } else if (marketMode === 'bear') {
        team.paydayMultiplier = 0.75;
        team.loanInterestRate = 0.18;
      } else {
        team.paydayMultiplier = 1.0;
        team.loanInterestRate = 0.13;
      }
      await team.save();
    }
    res.status(200).json({ message: `Market mode set to ${marketMode}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
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

exports.getGameState = async (req, res) => {
  try {
    const teams = await Team.find({ tableId: req.user._id }).populate('deals');
    const logs = await TableLog.find({ tableId: req.user._id }).sort({ timestamp: -1 });
    res.json({ teams, logs });
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

  // Always reset expenses to base value before adding EMI/loan charges
  const baseExpenses = 300000;
  teamState.expenses = baseExpenses;

  // Apply market mode payday multiplier
  const paydayMultiplier = teamState.paydayMultiplier || 1.0;

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
          emiExpenseTotal += (emiObj.totalLoan * 0.10) + emiObj.emi;
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
          emiExpenseTotal += (emiObj.totalLoan * 0.10) + emiObj.emi;
          addLogEntry(teamState.tableId, `Big Deal EMI paid: ${emiObj.emi.toFixed(2)}. Remaining loan: ${emiObj.totalLoan.toFixed(2)}. Installments left: ${emiObj.installmentsLeft}`);
          return emiObj.installmentsLeft > 0 && emiObj.totalLoan > 0;
        }
        return false;
      });
      teamState.bigDealLoan -= totalBigEmiPaid;
      if (teamState.bigDealLoan < 0) teamState.bigDealLoan = 0;
    }
    // Add EMI/loan charges to base expenses if any active EMIs
    teamState.expenses = baseExpenses + emiExpenseTotal;
  const totalIncome = teamState.income + teamState.passiveIncome;
  const totalExpenses = teamState.expenses;

  if (teamState.isAssetsFrozen) {
    if (teamState.paydayFrozenTurn === 0) {
      teamState.cash -= totalExpenses;
      teamState.paydayFrozenTurn = 1;
      addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Assets are frozen. Payday income is zero. Expenses have been deducted.`);
    } else {
      teamState.isAssetsFrozen = false;
      teamState.paydayFrozenTurn = 0;
      const netPaydayIncome = totalIncome - totalExpenses;
      teamState.cash += netPaydayIncome;
      addLogEntry(teamState.tableId, `Team ${teamState.teamName}: Assets are no longer frozen. Your net payday is ${netPaydayIncome}.`);
    }
  } else {
    const netPaydayIncome = totalIncome - totalExpenses;
    teamState.cash += netPaydayIncome;
    addLogEntry(teamState.tableId, `Team ${teamState.teamName}: You received a net payday of ${netPaydayIncome}.`);
  }

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
    if (installments === 3) interestRate = 0.05;
    else if (installments === 6) interestRate = 0.10;
    else if (installments === 12) interestRate = 0.20;
    else return res.status(400).json({ message: 'Invalid installment plan.' });
    const interest = loanPrincipal * interestRate;
    const totalLoan = loanPrincipal + interest;
    // EMI calculation
    const emi = totalLoan / installments;
  // Expense increase: 10% of deal loan + EMI
  const expenseIncrease = (totalLoan * 0.10) + emi;

    universalDeal.owners.push({ tableId: team.tableId, teamId: team._id });
    await universalDeal.save();

    team.cash -= buyAmount;
    team.passiveIncome += universalDeal.passiveIncome;
    team.assets += buyAmount;
    team.deals.push(universalDeal._id);
    team.smallDealLoan += totalLoan;
    team.expenses += expenseIncrease;
    // Store EMI plan for future payday logic (custom field)
    if (!team.smallDealEmis) team.smallDealEmis = [];
    team.smallDealEmis.push({ dealId, totalLoan, emi, installmentsLeft: installments, interestRate });
    await team.save();

    addLogEntry(team.tableId, `Team ${team.teamName} purchased "${universalDeal.name}" for ${buyAmount}. Loan: ${totalLoan} (${installments} installments, ${interestRate * 100}% interest). EMI: ${emi.toFixed(2)}.`);

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
    if (installments === 3) interestRate = 0.05;
    else if (installments === 6) interestRate = 0.10;
    else if (installments === 12) interestRate = 0.20;
    else return res.status(400).json({ message: 'Invalid installment plan.' });
    const interest = loanPrincipal * interestRate;
    const totalLoan = loanPrincipal + interest;
    // EMI calculation
    const emi = totalLoan / installments;
  // Expense increase: 10% of deal loan + EMI
  const expenseIncrease = (totalLoan * 0.10) + emi;

    universalDeal.owners.push({ tableId: team.tableId, teamId: team._id });
    await universalDeal.save();

    team.cash -= buyAmount;
    team.passiveIncome += universalDeal.passiveIncome;
    team.assets += buyAmount;
    team.deals.push(universalDeal._id);
    team.bigDealLoan += totalLoan;
    team.expenses += expenseIncrease;
    // Store EMI plan for future payday logic (custom field)
    if (!team.bigDealEmis) team.bigDealEmis = [];
    team.bigDealEmis.push({ dealId, totalLoan, emi, installmentsLeft: installments, interestRate });
    await team.save();

    addLogEntry(team.tableId, `Team ${team.teamName} purchased "${universalDeal.name}" for ${buyAmount}. Loan: ${totalLoan} (${installments} installments, ${interestRate * 100}% interest). EMI: ${emi.toFixed(2)}.`);

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
  const interestRate = team.loanInterestRate || 0.13;
  const interest = loanAmount * interestRate;
      const totalLoan = loanAmount + interest;
  team.stocksLoan += totalLoan;
  team.cash -= (totalCost - loanAmount);
  if (team.cash < 0) team.cash = 0;
  // No expense increase for stock loan
  addLogEntry(team.tableId, `Team ${team.teamName} bought ${amount} units of ${name} stock for ${totalCost}. Loan: ${totalLoan} (13% interest).`);
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
  addLogEntry(team.tableId, `Team ${team.teamName} bought ${amount} units of ${name} crypto for ${totalCost}. Loan: ${totalLoan} (13% interest).`);
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
        const { teamId } = req.body;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        
        team.cash -= 10000;
        await team.save();

        addLogEntry(team.tableId, `Team ${team.teamName} paid a penalty of 10,000.`);

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
        const { teamId } = req.body;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        
        const chanceCards = [
            { title: "Bonus!", effect: () => { team.cash += 50000; } },
            { title: "Penalty", effect: () => { team.cash -= 20000; } },
        ];
        const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
        
        card.effect();
        await team.save();
        
        addLogEntry(team.tableId, `Team ${team.teamName} drew a Chance card: "${card.title}"`);
        
        const allTeams = await Team.find({ tableId: team.tableId }).populate('deals');
        const logs = await TableLog.find({ tableId: team.tableId }).sort({ timestamp: -1 });
        res.status(200).json({ teams: allTeams, logs, message: `You drew a Chance card: "${card.title}"` });
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

        team.personalLoan += loanAmount;
        team.cash += loanAmount;
        await team.save();

        addLogEntry(team.tableId, `Team ${team.teamName} borrowed a loan of ${loanAmount}.`);

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
    else loanField = 'personalLoan';

    if (team[loanField] < repayAmount) {
      return res.status(400).json({ message: 'Not enough loan outstanding to repay that amount.' });
    }

    team[loanField] -= repayAmount;
    team.cash -= repayAmount;

    // Only affect expenses for deal loans
    if (loanField === 'smallDealLoan' || loanField === 'bigDealLoan') {
      team.expenses -= repayAmount * 0.10; // Remove 10% expense for repaid amount
      if (team.expenses < 0) team.expenses = 0;
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