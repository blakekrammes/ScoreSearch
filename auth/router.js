'use strict';
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const config = require('../config');
const router = express.Router();

const createAuthToken = function(user) {
	return jwt.sign({user}, config.JWT_SECRET, {
		subject: user.username,
		expiresIn: config.JWT_EXPIRY,
		algorithm: 'HS256'
	});
};

router.use(bodyParser.json());

//user provides username/password to login
router.post('/login', (req, res) => {
	const localAuth = passport.authenticate('local', {session: false}, function(err, user, info) {
		if (err) {
			res.status(404).json(err);
			return;
		}
		if (user) {
			const authToken = createAuthToken(user.serialize());
			res.json({authToken});
		}
		else {
			res.status(401).json(info);
		}
	});
	localAuth(req, res);
});

const jwtAuth = passport.authenticate('jwt', {session: false});

router.post('/refresh', jwtAuth, (req, res) => {
	const authToken = createAuthToken(req.user);
	res.json({authToken});
});

module.exports = router; 