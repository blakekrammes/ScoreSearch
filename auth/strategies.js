'use strict';
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const { Users } = require('../model');
const { JWT_SECRET } = require('../config');

const localStrategy = new LocalStrategy((username, password, callback) => {
	let user;
	Users.findOne({ username: username })
	.then(_user => {
		user = _user;
		if(!user) {
			return Promise.reject({
				reason: 'Login Error',
				message: 'Incorrect username or password'
			});
		}
		return user.validatePassword(password);
	})
	.then(isValid => {
		if (!isValid) {
			return Promise.reject({
				reason: 'Login Error',
				message: 'Invalid username or password'
			});
		}
		return callback(null, user);
	})
	.catch(err => {
		if (err.reason === 'Login Error') {
			// console.log('the error in login is ', err.message);
			// console.log('callback is ', callback);
			return callback(null, false, err.message);
		}
		return callback(err, false);
	});
});

const jwtStrategy = new JwtStrategy(
	{
		secretOrKey: JWT_SECRET,
		// look for the JWT as a Bearer auth header
		jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
		// only allow HS256 tokens - the same as the ones we've issued
		algorithms: ['HS256']
	},
	(payload, done) => { 
		done(null, payload.user);
	}
);

module.exports = { localStrategy, jwtStrategy };
