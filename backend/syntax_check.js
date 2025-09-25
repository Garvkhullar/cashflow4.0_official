// Quick syntax check: require the gameController to surface any syntax errors
try {
  require('./controllers/gameController');
  console.log('gameController required successfully');
} catch (e) {
  console.error('Error requiring gameController:', e);
  process.exit(1);
}