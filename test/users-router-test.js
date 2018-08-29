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
				const expectedKeys = ['id', 'username', 'email'];
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
				return Users.count();
			})
			.then(function(count) {
				expect(res.body.users).to.have.lengthOf(count);
			});
		});
	});

	describe('POST endpoint', function() {
		it('should add a new user', function() {
			const newUser = {
				username: 'ferdinand',
				email: 'ferdinand@gmail.com',
				password: 'ferdinand'
			};
			return chai.request(app)
				.post('/users')
				.send(newUser)
				.then(function(res) {
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys('id', 'username', 'email');
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
		it('should throw signup error on invalid username type', function() {
			const invalidUser = {
				username: ['hello', 'my', 'name', 'is', 'bob'],
				email: 'bob@bob.com',
				password: 'bob'
			};
			return chai.request(app)
			.post('/users')
			.send(invalidUser)
			.then(function(res) {
				expect(res.status).to.equal(422);
				expect(res.body.reason).to.equal('Validation Error')
				expect(res.body.message).to.equal('Incorrect field type: expected string');
				expect(res.body.location).to.equal('username');
			});
		});
		it('should throw signup error if username has whitespace', function() {
			const spaceyUser = {
				username: '   bobby',
				email: 'bobby@netspace.com',
				password: 'billybobby'
			};
			return chai.request(app)
			.post('/users')
			.send(spaceyUser)
			.then(function(res) {
				expect(res.status).to.equal(422);
				expect(res.body.reason).to.equal('Validation Error');
				expect(res.body.message).to.equal('Username and password cannot start or end with whitespace');
				expect(res.body.location).to.equal('username');
			});
		});
		it('should throw signup error if password has whitespace', function() {
			const spaceyUser = {
				username: 'bobby',
				email: 'bobby@netspace.com',
				password: '   bobby'
			};
			return chai.request(app)
			.post('/users')
			.send(spaceyUser)
			.then(function(res) {
				expect(res.status).to.equal(422);
				expect(res.body.reason).to.equal('Validation Error');
				expect(res.body.message).to.equal('Username and password cannot start or end with whitespace');
				expect(res.body.location).to.equal('password');
			});
		});
		it('should throw error if password is less than 8 characters', function() {
			const passUser = {
				username: 'mousey',
				email: 'anon@mouse.com',
				password: 'mouse'
			};
			return chai.request(app)
			.post('/users')
			.send(passUser)
			.then(function(res) {
				expect(res.status).to.equal(422);
				expect(res.body.reason).to.equal('Validation Error');
				expect(res.body.message).to.equal('Password must be at least 8 characters long');
				expect(res.body.location).to.equal('password');
			});
		});
		it('should throw error if password is more than 72 characters', function() {
			const passwordyUser = {
				username: 'morris',
				email: 'morey@house.com',
				password: 'housemousestringwingthingswingtrimswimgymshimcrablabslabrunfuntonwonruntonwon'
			};
			return chai.request(app)
			.post('/users')
			.send(passwordyUser)
			.then(function(res) {
				expect(res.status).to.equal(422);
				expect(res.body.reason).to.equal('Validation Error');
				expect(res.body.message).to.equal('Password can only be 72 characters long');
				expect(res.body.location).to.equal('password');
			});
		});
		it('should trim the email address if inputted with whitespace', function() {
			const trimUser = {
				username: 'florist',
				email: 'floral@flowers.com    ',
				password: 'flourbaking'
			};
			return chai.request(app)
			.post('/users')
			.send(trimUser)
			.then(function(res) {
				expect(res.status).to.equal(201);
				expect(res.body.email).to.equal(trimUser.email.trim());
			});
		});
		it('should reject a new user request if username is taken', function() {
			const origUser = {
				username: 'therealcarmen',
				email: 'carmensandiego@netfly.com',
				password: 'carmenspassword'
			};
			const imposterUser = {
				username: 'therealcarmen',
				email: 'reallycarmensandiego@netfly.com',
				password: 'carmenssecretpassword'
			};
			return chai.request(app)
			.post('/users')
			.send(origUser)
			.then(function(res) {
				return chai.request(app)
				.post('/users')
				.send(imposterUser)
				.then(function(res) {
					expect(res.status).to.equal(422);
					expect(res.body.reason).to.equal('Validation Error');
					expect(res.body.message).to.equal('Username already taken');
					expect(res.body.location).to.equal('username');
				});
			});
		});
		it('should login an existing user, return a JWT and access the protected past searches endpoint', function() {
			const tokenUser = {
				username: 'jason',
				email: 'jjsun@object.com',
				password: 'bluejays'
			};
			const userCred = {
				username: 'jason',
				password: 'bluejays'
			};
			return chai.request(app)
			.post('/users')
			.send(tokenUser)
			.then(function(res) {
				return chai.request(app)
				.post('/auth/login')
				.send(userCred)
				.then(function(tokenRes) {
					expect(tokenRes.body).to.include.key('authToken');
					expect(tokenRes.body.authToken).to.be.a('string');
					expect(tokenRes.body.authToken.length).to.have.gt(100);
					let date = new Date();
    				let dateString = date.toString();
    				let truncatedDateString = dateString.substring(0, dateString.length -36);
					const pastSearch = {
						username: 'jason',
						music_title: 'the danube waltz',
						IMSLP_links: ['link1', 'link2', 'link3'],
						creation: truncatedDateString
					};
					return chai.request(app)
					.post('/searches')
					.send(pastSearch)
					.then(function(searchRes) {
						let token = tokenRes.body.authToken;
						return chai.request(app)
						.get('/searches/currentuser')
						.set('Authorization', `Bearer ${token}`)
						.then(function(userSearchesRes) {
							expect(userSearchesRes.body.searches).to.be.an('array');
							expect(userSearchesRes.body.searches[0]).to.include.keys('id', 'username', 'music_title', 'IMSLP_links');
							expect(userSearchesRes.body.searches[0].username).to.equal(pastSearch.username);
							expect(userSearchesRes.body.searches[0].music_title).to.equal(pastSearch.music_title);
							expect(userSearchesRes.body.searches[0].IMSLP_links).to.eql(pastSearch.IMSLP_links);
						})
					});
				});
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