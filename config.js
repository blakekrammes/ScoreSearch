'use strict';
exports.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost/ScoreSearch-production';
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost/ScoreSearch-development';
exports.PORT = process.env.PORT || 8080;