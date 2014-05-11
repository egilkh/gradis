'use strict';

/* jshint node: true */
/* global describe, it, after */

// Some vars for later and setup.
var d = Date.now(),
    ge = process.env.NODE_ENV = 'production',
    ga = process.env.GRADIS_ADDR = 'localhost-' + d,
    gp = process.env.GRADIS_PORT = 7070,
    gs = process.env.GRADIS_SECRET = 'gradis-secret-' + d,
    gf = process.env.GRADIS_FOLDER = '/tmp/',
    gd = process.env.GRADIS_DBNAME = 'gradis-test-' + d,
    gi = 'gradis-identity-' + d;

// Requires.
var request = require('supertest'),
    assert = require('assert'),
    should = require('should'),
    rimraf = require('rimraf'),
    gradis = require('../');

describe('gradis', function () {

  describe('Config', function () {
    it('should change depending on environmentals', function () {
      gradis.config.addr.should.eql(ga);
      gradis.config.port.should.eql(gp);
      gradis.config.secret.should.eql(gs);
      gradis.config.folder.should.eql(gf);
      gradis.config.dbname.should.eql(gd);
    });
  });

  var agent = request.agent(gradis.app),
      // Craft a correct Authorization.
      authHeader = 'Basic ' + new Buffer(gi + ':' + gs).toString('base64'),
      // Craft an incorrect Authorization.
      authHeaderWrong = 'Basic ' + new Buffer('randomuser:randompassword').toString('base64');

  describe('Auth', function () {
    it('should specify WWW-Authenticate header for responses', function (done) {
      agent
        .get('/')
        .expect('WWW-Authenticate', 'Basic realm="gradis"')
        .expect(401)
        .end(done);
    });

    it('should not allow request with incorrect token', function (done) {
      agent
        .get('/')
        .set('Authorization', authHeaderWrong)
        .expect('WWW-Authenticate', 'Basic realm="gradis"')
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
        .get('/fake-and-unused-url')
        .set('Authorization', authHeader)
        .expect(404)
        .end(done);
    });

    describe('API', function () {
      it('should have self', function (done) {
        agent
          .get('/api/self')
          .set('Authorization', authHeader)
          .expect(200)
          .expect('Content-Type', 'application/json')
          .expect(function (res) {
            res.body.identity.should.be.an.instanceOf(Object);
            res.body.identity.should.have.property('name', gi);
            res.body.identity.should.have.property('created');
            res.body.identity.should.have.property('count')
              .and.be.instanceOf(Object)
              .and.equal(0);
          })
          .end(done);
      });

      it('should list identities in an array', function (done) {
        agent
          .get('/api/identity')
          .set('Authorization', authHeader)
          .expect(200)
          .expect('Content-Type', 'application/json')
          .expect(function (res) {
            res.body.should.be.instanceOf(Array)
              .and.have.lengthOf(1);

            var i = res.body[0];
            i.should.be.instanceOf(Object);
            i.should.have.property('name', gi);
          })
          .end(done);
      });

    });
  });

  // Remove the temp folder after the tests.
  after(function () {
    var path = gf + gd + '/';
    rimraf.sync(path);
  });
});
