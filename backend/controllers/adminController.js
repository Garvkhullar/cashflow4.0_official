const Admin = require('../models/Admin');

exports.createAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminExists = await Admin.findOne({ username });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin username already exists' });
    }
    const admin = await Admin.create({ username, password });
    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
