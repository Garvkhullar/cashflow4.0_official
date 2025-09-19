const Chance = require('../models/Chance');

exports.getChances = async (req, res) => {
  try {
    const chances = await Chance.find({});
    res.status(200).json({ chances });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load chances' });
  }
};
