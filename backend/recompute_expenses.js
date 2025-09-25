require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./models/Team');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cashflow';

const recompute = async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    const teams = await Team.find({});
    console.log(`Found ${teams.length} teams`);
    let changed = 0;
    for (const team of teams) {
      const baseExpenses = 350000;
      let emiExpenseTotal = 0;
      if (Array.isArray(team.smallDealEmis)) {
        team.smallDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
      }
      if (Array.isArray(team.bigDealEmis)) {
        team.bigDealEmis.forEach(e => { if (e && typeof e.emi === 'number') emiExpenseTotal += e.emi; });
      }
  const personalLoanInterest = (team.personalLoan && typeof team.personalLoan === 'number') ? team.personalLoan * 0.18 : 0;
  const newExpenses = Math.round(baseExpenses + emiExpenseTotal + personalLoanInterest);
      if (team.expenses !== newExpenses) {
        console.log(`Updating team ${team.teamName || team._id}: expenses ${team.expenses} -> ${newExpenses}`);
        team.expenses = newExpenses;
        await team.save();
        changed += 1;
      }
    }
    console.log(`Done. Teams updated: ${changed}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during recompute:', err);
    process.exit(1);
  }
};

recompute();
