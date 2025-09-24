// Team login with teamName and 4-digit code
exports.loginTeam = async (req, res) => {
  const { teamName, code } = req.body;
  try {
    const team = await Team.findOne({ teamName, code });
    if (!team) {
      return res.status(401).json({ message: 'Invalid team name or code' });
    }
  // Issue a JWT for the team (with teamId and role 'team') - 12 hour session
  const token = jwt.sign({ id: team._id, role: 'team' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({
      _id: team._id,
      teamName: team.teamName,
      tableId: team.tableId,
      role: 'team',
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
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
    expiresIn: '12h',
  });
};

exports.registerTable = async (req, res) => {
  let { username, password, role, team1Name, team2Name, team3Name } = req.body;
  // Trim whitespace from left and right for username and team names
  username = typeof username === 'string' ? username.trim() : username;
  team1Name = typeof team1Name === 'string' ? team1Name.trim() : team1Name;
  team2Name = typeof team2Name === 'string' ? team2Name.trim() : team2Name;
  team3Name = typeof team3Name === 'string' ? team3Name.trim() : team3Name;
  try {
  const tableExists = await Table.findOne({ username });
    if (tableExists) {
      return res.status(400).json({ message: 'Table username already exists' });
    }
    const newTable = await Table.create({ username, password, role });

    // Helper to generate a random 4-digit code as a string
    const genCode = () => Math.floor(1000 + Math.random() * 9000).toString();

    const teams = await Team.insertMany([
      { tableId: newTable._id, tablename: username, teamName: team1Name, code: genCode() },
      { tableId: newTable._id, tablename: username, teamName: team2Name, code: genCode() },
      { tableId: newTable._id, tablename: username, teamName: team3Name, code: genCode() },
    ]);

    newTable.teams = teams.map(team => team._id);
    await newTable.save();

    // Return the team codes for login
    res.status(201).json({
      _id: newTable._id,
      username: newTable.username,
      teams: teams.map(t => ({ _id: t._id, teamName: t.teamName, code: t.code })),
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