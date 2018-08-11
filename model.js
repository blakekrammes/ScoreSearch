'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const userSchema = mongoose.Schema({
	username: {type: String, required: true},
	email: {type: String, required: true},
	password: {type: String, required: true}
});

const pastSearchSchema = mongoose.Schema({
	username: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
	music_title: {type: String},
	IMSLP_links: [String]
});

pastSearchSchema.pre('find', function(next) {
	this.populate('username');
	next();
});

pastSearchSchema.pre('findOne', function(next) {
	this.populate('username')
});

pastSearchSchema.pre('findById', function(next) {
	this.populate('username');
	next();
});

pastSearchSchema.pre('findByIdAndUpdate', function(next) {
	this.populate('username');
	next();
});


pastSearchSchema.methods.serialize = function() {
		return {
			id: this._id,
			username: this.username.username,
			music_title: this.music_title,
			IMSLP_links: this.IMSLP_links
		};
};

userSchema.methods.serialize = function() {
	return {
		id: this._id,
		username: this.username,
		email: this.email,
		password: this.password
	};
};

const Users = mongoose.model('Users',userSchema);
const PastSearches = mongoose.model('PastSearches', pastSearchSchema);

module.exports = { Users, PastSearches };