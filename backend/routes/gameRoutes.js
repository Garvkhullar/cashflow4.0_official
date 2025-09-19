const express = require('express');
const router = express.Router();
const { getGameState, handlePayday, handleSmallDeal, handleBigDeal, getDeals, handleBuyStock, handleBuyCrypto, handleAssetFreeze, handlePenalty, handleChance, handleRoll, handleBorrowLoan, handleRepayLoan, setMarketMode, deductOrAddCash, toggleVacation, setNextPaydayTax } = require('../controllers/gameController');
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
router.post('/crypto', protect, handleBuyCrypto);
router.post('/freeze', protect, handleAssetFreeze);
router.post('/loan/borrow', protect, handleBorrowLoan);
router.post('/loan/repay', protect, handleRepayLoan);
router.post('/admin/market-mode', setMarketMode);

module.exports = router;