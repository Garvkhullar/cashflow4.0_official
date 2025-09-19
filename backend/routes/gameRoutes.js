const express = require('express');
const router = express.Router();
const { getGameState, handlePayay, handleSmallDeal, handleBigDeal, getDeals, handleBuyStock, handleSellStock, handleBuyCrypto, handleAssetFreeze, handlePenalty, handleChance, handleRoll, handleBorrowLoan, handleRepayLoan, setMarketMode, deductOrAddCash, toggleVacation, setNextPaydayTax } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

router.post('/tax/next', protect, setNextPaydayTax);
router.post('/vacation/toggle', protect, toggleVacation);
router.post('/cash/update', protect, deductOrAddCash);

router.get('/state', protect, getGameState);
router.get('/deals/:type', protect, getDeals);
router.get('/market-mode', (req, res) => require('../controllers/gameController').getMarketMode(req, res));

router.post('/payday', protect, handlePayday);
router.post('/roll', protect, handleRoll);
router.post('/penalty', protect, handlePenalty);
router.post('/chance', protect, handleChance);
router.post('/deal/small', protect, handleSmallDeal);
router.post('/deal/big', protect, handleBigDeal);
router.post('/stock', protect, handleBuyStock);
router.post('/stock/sell', protect, handleSellStock);
router.post('/crypto', protect, handleBuyCrypto);
router.post('/freeze', protect, handleAssetFreeze);
router.post('/loan/borrow', protect, handleBorrowLoan);
router.post('/loan/repay', protect, handleRepayLoan);
router.post('/admin/market-mode', setMarketMode);
router.post('/future', protect, (req, res) => require('../controllers/gameController').handleFuture(req, res));
router.post('/options', protect, (req, res) => require('../controllers/gameController').handleOptions(req, res));

module.exports = router;