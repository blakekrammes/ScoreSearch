'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
router.use(express.json());
router.use(express.static('public/searches'));

mongoose.Promise = global.Promise;

const { PORT } = require('./config');
const { Users, PastSearches } = require('./model');

router.get('/:id', (req, res) => {
	console.log(`Retrieving Json Searches by User ID`);
	PastSearches.find({user: req.params.id})
	.limit(10)
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

module.exports = router;