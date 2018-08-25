'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
router.use(express.json());
router.use(express.static('public/searches'));

mongoose.Promise = global.Promise;

const { PORT } = require('./config');
const { Users, PastSearches } = require('./model');

router.get('/', (req, res) => {
	console.log('Retrieving Users');
	// res.sendFile(__dirname + '/public/searches/dummysearches.html');
	Users.find()
	.then(users => {
		res.json({
			users: users.map(
				(user) => user.serialize())
		});
	})
	.catch(err => {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	});
});

router.get('/:username', (req, res) => {
  	Users
    .findOne({username: req.params.username})
    .then(user => res.json(user.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'something went wrong' });
    });
});

router.post('/', (req, res) => {
	console.log('creating a new user');
	const requiredFields = ['username', 'email', 'password'];
	requiredFields.forEach(field => {
		if (!(field in req.body)) {
			console.error(`Missing ${field} in request body`);
			return res.status(422).json({
				code: 422,
				reason: 'Validation Error',
				message: 'Missing Field',
				location: field
			});
		}
		if ((field in req.body) && typeof req.body[field] !== 'string') {
			console.error(`${field} needs to be a string`);
			return res.status(422).json({
				code: 422,
				reason: 'Validation Error',
				message: 'Incorrect field type: expected string',
				location: field
			});
		}
	});
	const trimmedFields = ['username', 'password'];
	const nonTrimmedField = trimmedFields.find(
		field => req.body[field].trim() !== req.body[field]);

	if (nonTrimmedField) {
		return res.status(422).json({
			code: 422,
			reason: 'Validation Error',
			message: 'Username and password cannot start or end with whitespace',
			location: nonTrimmedField
		});
	}

	const sizedFields = {
		username: {
			min: 1
		},
		password: {
			min: 8,

			max: 72
		}
	};
	const tooSmallField = Object.keys(sizedFields).find(
		field =>
			'min' in sizedFields[field] &&
				req.body[field].trim().length < sizedFields[field].min
	);
	const tooLargeField = Object.keys(sizedFields).find(
		field => 
			'max' in sizedFields[field] && 
				req.body[field].trim().length > sizedFields[field].max
	);

	if (tooSmallField || tooLargeField) {
		return res.status(422).json({
			code: 422,
			reason: 'Validation Error',
			message: tooSmallField
				? `${tooSmallField} must be at least ${sizedFields[tooSmallField]
				  .min} characters long`
				: `${tooLargeField} can only be ${sizedFields[tooLargeField]
				  .max} characters long`,
			location: tooSmallField || tooLargeField
		});
	}

  	let { username, password, email = '' } = req.body;
  	// trim only email since username/password have already been checked for whitespace
  	email = email.trim();

	return Users
	.findOne({ username: req.body.username })
	.then(user => {
		if (user) {
			const message = 'This username is already taken.';
			console.error(message);
			return Promise.reject({
				code: 422,
				reason: 'Validation Error',
				message: 'Username already taken',
				location: 'username'
			});
		}
		return Users.hashPassword(password);
	})
	.then(hash => {
		return Users
		.create({
			username,
			email,
			password: hash
		});
	})
	.then(user => res.status(201).json(user.serialize()))		
	.catch(err => {
		if (err.reason === 'Validation Error') {
			return res.status(err.code).json(err);
		}
		res.status(500).json({code: 500, message: 'Internal Server Error'});
	});
});

router.put('/:id', (req, res) => {
	if (!(req.body.id)) {
		res.status(400).json({
			error: 'Please provide the user id in the request body'
		});
	}
	if (!(req.params.id && req.params.id === req.body.id)) {
		res.status(400).json({
			error: 'Request path id and request body id values must match'
		});
	}
	const updated = {};
	const updateableFields = ['username', 'email', 'password'];
	updateableFields.forEach(field => {
		if (field in req.body) {
			updated[field] = req.body[field];
		}
	});
	Users
	.findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
	.then(updatedUser => res.status(200).json(updatedUser.serialize()))
	.catch(err => res.status(500).json({ message: err }));
});

router.delete('/:id', (req, res) => {
	console.log('deleting user');
	Users
	.findByIdAndRemove(req.params.id)
	.then(() => {
		console.log(`Deleted user with id ${req.params.id}`);
		res.status(204).end();
	});
});

module.exports = router;