'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
router.use(express.json());
router.use(express.static('public/searches'));
mongoose.Promise = global.Promise;

const { PORT } = require('./config');

router.get('/', (req, res) => {
	console.log('Retrieving Searches');
	res.sendFile(__dirname + '/public/searches/dummysearches.html');
});

module.exports = router;