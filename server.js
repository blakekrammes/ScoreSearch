'user strict';
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const passport = require('passport');
const cors = require('cors');
const app = express();

const { localStrategy, jwtStrategy } = require('./auth/strategies');
const authRouter = require('./auth/router');

const { PORT, DATABASE_URL } = require('./config');

const usersRouter = require('./users-router');
const searchesRouter = require('./searches-router');
const mysearchesRouter = require('./my-searches-router');
const jsonsearchesRouter = require('./json-searches-router');

app.use(cors());
app.use(morgan('common')); 
app.use(express.static('public/home'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home/index.html');
});

// passport auth strategies
passport.use(localStrategy);
passport.use(jwtStrategy);

app.use('/users', usersRouter);
app.use('/searches', searchesRouter);
app.use('/mysearches', mysearchesRouter);
app.use('/jsonsearches', jsonsearchesRouter);
app.use('/auth', authRouter);

// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function (req, res) {
  res.status(404).json({ message: 'Not Found' });
});

let server;

function runServer(databaseUrl, port = PORT) {

	return new Promise((resolve, reject) => {
		console.log('Starting Server')
		mongoose.connect(databaseUrl, err => {
			if (err) {
				return reject(err);
			}
		})
		server = app
		.listen(port, () => {
			console.log(`Your app is listening on port ${port}`);
			resolve();
		})
		.on("error", err => {
			mongoose.disconnect();
			reject(err);
		});
	});
}

function closeServer() {
	return mongoose.disconnect().then(() => {
		return new Promise((resolve, reject) => {
			console.log('Closing Server');
			server.close(err => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
	});
}

if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };