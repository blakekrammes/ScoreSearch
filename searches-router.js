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
	console.log('Retrieving Searches');
	//res.sendFile(__dirname + '/public/searches/dummysearches.html');
	PastSearches.find()
	.then(searches => {
		res.json({
			searches: searches.map(
				(search) => search.serialize())
		});
	})
	.catch(err => {
		console.error(err);
		res.status(500).json({ message: 'Internal server error' });
	});
});

router.post('/', (req, res) => {
	console.log('posting new past search');
	const requiredFields = ['music_title', 'IMSLP_links', 'username'];
	requiredFields.forEach(field => {
		if (!(field in req.body)) {
			const message = `Missing ${field} in request body`;
			console.error(message);
			return res.status(400).send(message);
		}
	});
	Users
	.find( { username: req.body.username } )
	.limit(1)
	.then(user => {
		if (user) {
			PastSearches
			.create({
				username: user[0]._id,
				music_title: req.body.music_title,
				IMSLP_links: req.body.IMSLP_links
			})
			.then(pastSearch => res.status(201).json(pastSearch.serialize()))
			.catch(err => {
				console.error(err);
				res.status(500).json({ error: 'Something went wrong '});
			});
		}
		else {
			const message = 'User not found.';
			console.error(message);
			return res.status(400).send(message);
		}
	})
	.catch(err => {
		console.error(err);
		res.status(500).json({ error: 'Something went horribly awry' });
	});
});

router.delete('/:id', (req, res) => {
	console.log('deleting past search');
	PastSearches
	.findByIdAndRemove(req.params.id)
	.then(() => {
		console.log(`Deleted past search with id ${req.params.id}`);
		res.status(204).end();
	});
});

module.exports = router;