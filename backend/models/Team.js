
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tablename: { type: String, required: true }, // Stores the table username
  teamName: { type: String, required: true },
  code: { type: String, required: true }, // 4-digit login code
  cash: { type: Number, default: 500000 },
  income: { type: Number, default: 500000 },
  passiveIncome: { type: Number, default: 0 },
  assets: { type: Number, default: 0 },
  expenses: { type: Number, default: 400000 },
  smallDealLoan: { type: Number, default: 0 },
  bigDealLoan: { type: Number, default: 0 },
  smallDealEmis: [{
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    totalLoan: Number,
    emi: Number,
    installmentsLeft: Number,
    interestRate: Number
  }],
  bigDealEmis: [{
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    totalLoan: Number,
    emi: Number,
    installmentsLeft: Number,
    interestRate: Number
  }],
  isAssetsFrozen: { type: Boolean, default: false },
  paydayFrozenTurn: { type: Number, default: 0 },
  deals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
  }],
  stocks: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
  }],
  crypto: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
  }],


  // Market mode multipliers
  paydayMultiplier: { type: Number, default: 1.0 },
  loanInterestRate: { type: Number, default: 0.10 },

  // Vacation status and exemption
  isVacationOn: { type: Boolean, default: false },
  vacationPaydaysLeft: { type: Number, default: 0 },

  // Personal loan for covering expenses
  personalLoan: { type: Number, default: 0 },

  // Flag for next payday tax
  nextPaydayTax: { type: Boolean, default: false },

  // Penalties and Chances
    penalties: [
    {
      penaltyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Penalty' },
      name: String,
      amount: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  chances: [
    {
      chanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chance' },
      name: String,
      amount: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  futureCounter: { type: Number, default: 0 },
  optionsCounter: { type: Number, default: 0 },

  // Payday counter for each team
  paydayCounter: { type: Number, default: 0 },
});

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;