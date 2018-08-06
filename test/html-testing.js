'use strict';
const express = require('express');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, runServer, closeServer } = require('../server');
app.use(express.static('public/searches'));
const expect = chai.expect;

chai.use(chaiHttp);

describe('index.html static page', function() {

	before(function() {
		return runServer();
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
	it('should display past searches on a GET request made to the searches endpoint', function() {
		return chai.request(app)
		.get('/searches')
		.then(function(res) {
			expect(res).to.have.status(200);
			expect(res).to.be.html;
		})
	});
});