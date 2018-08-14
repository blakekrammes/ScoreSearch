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

router.get('/:id', (req, res) => {
  PastSearches
    .find({_id: req.params.id})
    .then(searches => res.json(searches[0].serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'something went horribly awry' });
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
	.then(users => {
		if (users) {
			PastSearches
			.create({
				user: users[0]._id,
				music_title: req.body.music_title,
				IMSLP_links: req.body.IMSLP_links
			})
			.then(function(search) {
				PastSearches.find({_id: search._id}, function(err, results) {
					res.status(201).json(results[0].serialize());
				})
			})
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