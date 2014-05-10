'use strict';

/* jshint node: true */
/* global describe, it */

// Some vars for later and setup.
var ga = process.env.GRADIS_ADDR = 'ohnoes',
    gp = process.env.GRADIS_PORT = 7070,
    gs = process.env.GRADIS_SECRET = 'gradis-secret-' + Date.now(),
    gf = process.env.GRADIS_FOLDER = '/tmp/',
    gd = process.env.GRADIS_DBNAME = 'gradis-test-' + Date.now();

// Requires.
var request = require('supertest'),
    assert = require('assert'),
    gradis = require('../');

describe('Gradis', function () {

  describe('Config', function () {
    it('should change depending on environmentals', function (done) {
      assert.equal(ga, gradis.config.addr);
      assert.equal(gp, gradis.config.port);
      assert.equal(gs, gradis.config.secret);
      assert.equal(gf, gradis.config.folder);
      assert.equal(gd, gradis.config.dbname);
      done();
    });
  });

  var agent = request.agent(gradis.app),
      authHeader = 'Basic ' + new Buffer('gradis-test-user:' + gs).toString('base64'),
      authHeaderWrong = 'Basic ' + new Buffer('gradis-test-user:nowtherightpassword').toString('base64');

  describe('Auth', function () {
    it('should specify WWW-Authenticate header for responses', function (done) {
      agent
        .get('/')
        .expect('WWW-Authenticate', 'Basic realm="Gradis"')
        .expect(401)
        .end(done);
    });

    it('should not allow request with correct token', function (done) {
      agent
        .get('/')
        .set('Authorization', authHeaderWrong)
        .expect('WWW-Authenticate', 'Basic realm="Gradis"')
        .expect(401)
        .end(done);
    });

    it('should allow request with correct token', function (done) {
      agent
        .get('/')
        .set('Authorization', authHeader)
        .expect(function (res) {
          if(res.header['www-authenticate']) {
            throw new Error('www-authenticate header is present.');
          }
        })
        .end(done);
    });
  });

  describe('Routes', function () {
    it('should not find incorrect path', function (done) {
      agent
        .get('/')
        .set('Authorization', authHeader)
        .expect(404)
        .end(done);
    });
  });
});
