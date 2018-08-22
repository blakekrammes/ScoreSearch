'use strict';
const express = require('express');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, runServer, closeServer } = require('../server');
const {TEST_DATABASE_URL} = require('../config');
app.use(express.static('public/home'));
const expect = chai.expect;

chai.use(chaiHttp);

describe('html static page', function() {

	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	after(function() {
		return closeServer();
	});
	
	it('should display the home page on a GET request made to the home page', function() {
		return chai.request(app)
		.get('/')
		.then(function(res) {
			expect(res).to.have.status(200);
			expect(res).to.be.html;
		})
	});
});