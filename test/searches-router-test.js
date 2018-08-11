'use strict';
const express = require('express');
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const { app, runServer, closeServer } = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const expect = chai.expect;
const { Users, PastSearches } = require('../model');
chai.use(chaiHttp);

function seedPastSearchData() {
	console.info('seeding past search data');
	return Users.create({
		username: 'Bradley',
		email: 'brad@netsky.com',
		password: 'jargon'
		})
		.then(function(user) {
			for (let i = 0; i < 3; i++) {
				return generatePastSearchData(user);
			}
		})
		.catch(function(err) {
			console.error(err);
		})
}

function generatePastSearchData(user) { 
		return PastSearches.create({
			username: user._id,
			music_title: faker.lorem.words(),
			IMSLP_links: [faker.internet.domainWord(), faker.internet.domainWord(), faker.internet.domainWord()]
		})
		.catch(function(err) {
			console.error(err);
		}) 
}

function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('PastSearches API resource', function() {

	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedPastSearchData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});

	describe('Get endpoint', function() {
	
		it('should list all past searches on GET with correct fields', function() {
			let res;
			let pastSearchVar;
			return chai
			.request(app)
			.get('/searches')
			.then(function(_res) {
				res = _res;
				expect(res).to.have.status(200);
				expect(res).to.be.json;
				expect(res.body.searches).to.be.a('array');
				expect(res.body.searches.length).to.be.at.least(1);
				const expectedKeys = ['id', 'username', 'music_title', 'IMSLP_links'];
				res.body.searches.forEach(function(search) {
					expect(search).to.be.a('object');
					expect(search).to.include.keys(expectedKeys);
				});
				pastSearchVar = res.body.searches[0];
				return PastSearches.find({ _id: pastSearchVar.id })
			})
			.then(function(search) {
				expect(JSON.stringify(pastSearchVar.id)).to.eql(JSON.stringify(search[0]._id));
				expect(JSON.stringify(pastSearchVar.username)).to.eql(JSON.stringify(search[0].username.username));
				expect(pastSearchVar.music_title).to.eql(search[0].music_title);
				expect(pastSearchVar.IMSLP_links).to.eql(search[0].IMSLP_links);
				return PastSearches.count();
			})
			.then(function(count) {
				expect(res.body.searches).to.have.lengthOf(count);
			});
		});
	});

	describe('POST endpoint', function() {
		it('should add a new past search', function() {

			return Users.create({
				username: 'Brandon',
				email: 'bradon@netsky.com',
				password: 'jargonlift'
				})
				.then(function(user) {
					return PastSearches.create({
						user_id: user._id,
						music_title: faker.lorem.words(),
						IMSLP_links: [faker.internet.domainWord(), faker.internet.domainWord(), faker.internet.domainWord()]
					})
					.then(function(search) {
						let newPastSearch = search.serialize();
						return chai.request(app)
							.post('/searches')
							.send(newPastSearch)
							.then(function(res) {
								expect(res).to.have.status(201);
								expect(res).to.be.json;
								expect(res.body).to.be.a('object');
								expect(res.body).to.include.keys('id', 'username', 'email', 'password');
								expect(res.body.id).to.not.be.null;
								expect(res.body.user_id).to.equal(newPastSearch.user_id);
								expect(res.body.music_title).to.equal(newPastSearch.music_title);
								expect(res.body.IMSLP_links).to.eql(newPastSearch.IMSLP_links);
								return PastSearches.findById(res.body.id);
							})
							.then(function(search) {
								console.log('search is__________', search);
								console.lo('newPastSearch is________', newPastSearch);
								expect(search.user_id).to.equal(newPastSearch.user_id);
								expect(search.music_title).to.equal(newPastSearch.music_title);
								expect(search.IMSLP_links).to.equal(newPastSearch.IMSLP_links);
							})
					})										
				})
				.catch(function(err) {
					console.error(err);
				}) 
		});
	});

	describe('DELETE endpoint', function() {
		it('should delete a past search by id', function() {
			let search;
			return PastSearches
				.find()
				.then(function(_search) {
					search = _search[0];
					return chai.request(app).delete(`/searches${search.id}`);
				})
				.then(function(_search) {
					expect(_search).to.have.status(404);
					expect(_search.files).to.equal(undefined);
				})
		});
	});
});