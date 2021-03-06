const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { roles } = require('../role')

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function validatePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

exports.grantAccess = function(action, resource) {
  return async (req, res, next) => {
    try {
      const permission = roles.can(req.user.role)[action](resource);
      if (!permission.granted) {
        return res.status(401).json({
          error: "You don't have enough permission to perform this action"
        });
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

exports.allowIfLoggedin = async (req, res, next) => {
  try {
    const user = res.locals.loggedInUser;
    if (!user)
      return res.status(401).json({
        error: "You need to be logged in to access this route"
      });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

exports.signup = async (req, res, next) => {
  try {
    const { email, password, firstname,lastname,fonction,direction,role } = req.body
    const hashedPassword = await hashPassword(password);
    const newUser = new User({  email, password:hashedPassword, firstname,lastname,fonction,direction,role: role || "basic" });
    const accessToken = jwt.sign({ userId: newUser._id }, 'RANDOM_TOKEN_SECRET', {
      expiresIn: "1d"
    });
    newUser.accessToken = accessToken;
    await newUser.save();
    res.json({
      data: newUser,
      message: "You have signed up successfully"
    })
  } catch (error) {
    next(error)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé !' });
    const validPassword = await validatePassword(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Mot de passe incorrect !' });
    const accessToken = jwt.sign({ userId: user._id }, 'RANDOM_TOKEN_SECRET', {
      expiresIn: "1d"
    });
    await User.findByIdAndUpdate(user._id, { accessToken })
    res.status(200).json({
      data: { userId: user._id, email: user.email, role: user.role },
      accessToken
    })
  } catch (error) {
    res.status(500).json({ error });
  }
}

exports.getUsers = async (req, res, next) => {
  const users = await User.find({});
  res.status(200).json({
    data: users
  });
}

exports.getUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return next(new Error('User does not exist'));
    res.status(200).json({
      data: user
    });
  } catch (error) {
    next(error)
  }
}

exports.updateUser = async (req, res, next) => {
  try {
    const { role } = req.body
    const userId = req.params.userId;
    await User.findByIdAndUpdate(userId, { role });
    const user = await User.findById(userId)
    res.status(200).json({
      data: user
    });
  } catch (error) {
    next(error)
  }
}

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    await User.findByIdAndDelete(userId);
    res.status(200).json({
      data: null,
      message: 'User has been deleted'
    });
  } catch (error) {
    next(error)
  }
}