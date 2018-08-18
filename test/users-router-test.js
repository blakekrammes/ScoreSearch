'use strict';
const express = require('express');
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const { app, runServer, closeServer } = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const expect = chai.expect;

const { Users } = require('../model');

chai.use(chaiHttp);

function seedUserData() {
	console.info('seeding user data');
	const seedData = [];

	for (let i = 1; i < 10; i++) {
		seedData.push(generateUserData());
	}
	return Users.insertMany(seedData);
}

function generateUserData() {
	return {
		username: faker.internet.userName(),
		email: faker.internet.email(),
		password: faker.random.word()
	};
}

function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('Users API resource', function() {

	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedUserData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});

	describe('Get endpoint', function() {
	
		it('should list all users on GET with correct fields', function() {
			let res;
			let userVar;
			return chai
			.request(app)
			.get('/users')
			.then(function(_res) {
				res = _res;
				expect(res).to.have.status(200);
				expect(res).to.be.json;
				expect(res.body.users).to.be.a('array');
				expect(res.body.users.length).to.be.at.least(1);
				const expectedKeys = ['id', 'username', 'email', 'password'];
				res.body.users.forEach(function(user) {
					expect(user).to.be.a('object');
					expect(user).to.include.keys(expectedKeys);
				});
				userVar = res.body.users[0];
				return Users.findById(userVar.id);
			})
			.then(function(user) {
				expect(userVar.id).to.equal(user.id);
				expect(userVar.username).to.equal(user.username);
				expect(userVar.email).to.equal(user.email);
				expect(userVar.password).to.equal(user.password);
				return Users.count();
			})
			.then(function(count) {
				expect(res.body.users).to.have.lengthOf(count);
			});
		});
	});

	describe('POST endpoint', function() {
		it('should add a new user', function() {
			const newUser = generateUserData();

			return chai.request(app)
				.post('/users')
				.send(newUser)
				.then(function(res) {
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys('id', 'username', 'email', 'password');
					expect(res.body.id).to.not.be.null;
					expect(res.body.username).to.equal(newUser.username);
					expect(res.body.email).to.equal(newUser.email);
					return Users.findById(res.body.id);
				})
				.then(function(user) {
					expect(user.username).to.equal(newUser.username);
					expect(user.email).to.equal(newUser.email);
				});
		});
	});

	describe('PUT endpoint', function() {
		it('should update fields in user object', function() {
			const updateData = {
				username: 'Bradley',
				email: 'bradley.cramer@gmail.com',
				password: 'fishsticks'
			};

			return Users
			.findOne()
			.then(function(user) {
				updateData.id = user.id;

				return chai.request(app)
					.put(`/users/${user.id}`)
					.send(updateData);
			})
			.then(function(res) {
				expect(res).to.have.status(200);

				return Users.findById(updateData.id);
			})
			.then(function(user) {
				expect(user.username).to.equal(updateData.username);
				expect(user.email).to.equal(updateData.email);
				expect(user.password).to.equal(updateData.password);
			});
		});
	});

	describe('DELETE endpoint', function() {
		it('should delete a user by id', function() {
			let user;

			return Users
				.findOne()
				.then(function(_user) {
					user = _user;
					return chai.request(app).delete(`/users${user.id}`);
				})
				.then(function(_user) {
					expect(_user).to.have.status(404);
					expect(_user.files).to.equal(undefined);
				});
		});
	});
});