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

router.post('/', (req, res) => {
	console.log('creating a new user');
	const requiredFields = ['username', 'email', 'password'];
	requiredFields.forEach(field => {
		if (!(field in req.body)) {
			const message = `Missing ${field} in request body`;
			console.error(message);
			return res.status(400).send(message);
		}
	});
	Users
	.findOne({ username: req.body.username })
	.then(user => {
		if (user) {
			const message = 'This username is already taken.';
			console.error(message);
			return res.status(400).send(message);
		}
		else {
			Users
			.create({
				username: req.body.username,
				email: req.body.email,
				password: req.body.password
			})
			.then(user => res.status(201).json(user.serialize()))
			.catch(err => {
				console.error(err);
				res.status(500).json({ error: 'Something went wrong' });
			});
		}
	})
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