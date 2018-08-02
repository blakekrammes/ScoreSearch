'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, runServer, closeServer } = require('../server');

const expect = chai.expect;

chai.use(chaiHttp);

describe('index.html static page', function() {

	before(function() {
		return runServer();
	});

	after(function() {
		return closeServer();
	});
	
	it('should display the static index.html page on server load', function() {
		return chai.request(app)
		.get('/')
		.then(function(res) {
			expect(res).to.have.status(200);
			expect(res).to.be.html;
		})
	});
});