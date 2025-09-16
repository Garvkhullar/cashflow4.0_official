const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  teamName: { type: String, required: true },
  cash: { type: Number, default: 500000 },
  income: { type: Number, default: 450000 },
  passiveIncome: { type: Number, default: 0 },
  assets: { type: Number, default: 0 },
  stocksLoan: { type: Number, default: 0 },
  cryptoLoan: { type: Number, default: 0 },
  expenses: { type: Number, default: 300000 },
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

  // Vacation status and exemption
  isVacationOn: { type: Boolean, default: false },
  vacationPaydaysLeft: { type: Number, default: 0 },

  // Personal loan for covering expenses
  personalLoan: { type: Number, default: 0 },

  // Flag for next payday tax
  nextPaydayTax: { type: Boolean, default: false },
});

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;