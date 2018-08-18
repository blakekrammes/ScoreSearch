'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();
const { localStrategy, jwtStrategy } = require('./auth/strategies')
router.use(express.json());
router.use(express.static('public/searches'));

passport.use(jwtStrategy);

mongoose.Promise = global.Promise;

const { PORT } = require('./config');
const { Users, PastSearches } = require('./model');

const jwtAuth = passport.authenticate('jwt', { session: false });

router.get('/', jwtAuth, (req, res) => {
	console.log(`Retrieving User's Searches`);
	res.sendFile(__dirname + '/public/searches/mysearches.html');
});

module.exports = router;