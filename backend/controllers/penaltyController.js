const Penalty = require('../models/Penalty');

exports.getPenalties = async (req, res) => {
  try {
    const penalties = await Penalty.find({});
    res.status(200).json({ penalties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load penalties' });
  }
};
