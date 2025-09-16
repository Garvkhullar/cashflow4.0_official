const Admin = require('../models/Admin');
exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (admin && admin.password === password) {
      res.json({
        _id: admin._id,
        username: admin.username,
        role: admin.role,
        token: generateToken(admin._id, admin.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
const Table = require('../models/Table');
const Team = require('../models/Team');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

exports.registerTable = async (req, res) => {
  const { username, password, role, team1Name, team2Name, team3Name } = req.body;
  try {
    const tableExists = await Table.findOne({ username });
    if (tableExists) {
      return res.status(400).json({ message: 'Table username already exists' });
    }
    const newTable = await Table.create({ username, password, role });

    const teams = await Team.insertMany([
      { tableId: newTable._id, teamName: team1Name },
      { tableId: newTable._id, teamName: team2Name },
      { tableId: newTable._id, teamName: team3Name },
    ]);

    newTable.teams = teams.map(team => team._id);
    await newTable.save();

    res.status(201).json({
      _id: newTable._id,
      username: newTable.username,
      teams: newTable.teams,
      role: newTable.role,
      token: generateToken(newTable._id, newTable.role),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.loginTable = async (req, res) => {
  const { username, password } = req.body;
  try {
    const table = await Table.findOne({ username }).populate('teams');
    if (table && (await table.comparePassword(password))) {
      res.json({
        _id: table._id,
        username: table.username,
        teams: table.teams,
        role: table.role,
        token: generateToken(table._id, table.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};