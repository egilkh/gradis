#!/usr/bin/env node
//
// A webapp for logging numerical data and showing graphs of the data.
//

// Hint
// ----

// Hint/Lint should know we are using Node.js.
/* jslint node: true */

// We prefer strict hint/lint.
'use strict';

// Requires
// --------

var express = require('express'),
    level = require('level'),

    expressBodyParser = require('body-parser'),
    expressCompress = require('compression'),
    expressAuth = require('express-http-auth'),

    // Server configuration.
    config = {
      addr: process.env.GRADIS_ADDR || 'localhost',
      port: process.env.GRADIS_PORT || 3000,

      secret: process.env.GRADIS_SECRET || 'gradis',
      folder: process.env.GRADIS_FOLDER || __dirname + '/folder/', // Yeah, yeah.
      dbname: process.env.GRADIS_DBNAME || 'db',

      env: process.env.NODE_ENV || 'development'
    },

    app = express(),
    db = level(config.folder + config.dbname, {
      valueEncoding: 'json',
      keyEncoding: 'utf8'
    });

// Helpers
// -------
db.readRange = function (prefix, cb) {
  var results = [];

  this.createReadStream({
    start: prefix,
    end: prefix + '~'
  }).on('data', function (data) {
    results.push(data.value);
  }).on('error', function (err) {
    return cb(err);
  }).on('end', function() {
    cb(null, results);
  });
};

db.getOrCreate = function (key, value, cb) {
  db.get(key, function (err, val) {
    if (err && err.notFound) {
      db.put(key, value, function (err) {
        if (err) {
          return cb(err);
        }

        return cb(null, value);
      });
    } else if (err) {
      return cb(err);
    } else {
      return cb(err, val);
    }
  });
};

// App configuration and middleware
// --------------------------------
app.set('env', config.env);

if (config.env === 'production') {
  // Trust the proxy.
  app.enable('trust proxy');
}

// Enable gzip compression.
app.use(expressCompress());

// Ensure Authentication.
app.use(expressAuth.realm('gradis'));

// Ensure password is same as secret.
app.use(function (req, res, next) {
  if(req.username && req.password !== config.secret) {
    // @todo This causes a inf loop, we can solve that later.
    return res
      .header('WWW-Authenticate', 'Basic realm="gradis"')
      .send(401)
      .end();
  }

  return next();
});

// Let static handle files first.
app.use(express.static(__dirname + '/public'));

// Ensure DB can be used before serving any requests.
app.use(function (req, res, next) {
  return next(db.isOpen() ? null : new Error('DB is not ready yet.'));
});

// Create entry for identity if it doesn't exist.
app.use(function (req, res, next) {
  var key = 'identity:' + req.username,
      identity = {
        name: req.username,
        created: Date.now(),
        count: 0
      };

  db.getOrCreate(key, identity, function (err, identity) {
    if (err) {
      return next(err);
    }

    req.identity = identity;
    next();
  });
});

// Routes
// ------
app.get('/api/self', function (req, res) {
  res.json(200, {identity: req.identity});
});

app.get('/api/identity', function (req, res) {
  db.readRange('identity:', function (err, identities) {
    res.json(200, identities);
  });
});

// 404 handler.
app.use(function (req, res) {
  var message = 'Cannot ' + req.method + ' ' + req.path;
  res.json(404, { code: 404, message: message });
});

// Error handler.
app.use(function (err, req, res, next) {
  // Let next be unused here.
  // jshint unused: false
  res.json(500, { code: 500, message: err.message, stack: err.stack.split('\n') });
});

// Check if we are run directly or included.
if (require.main === module) {
  // Start the app.
  app.listen(config.port, config.addr, function() {
    console.log('%s: App started on %s:%d in %s mode.', Date(Date.now()), config.addr, config.port, config.env);
  });
} else {
  module.exports = {
    config: config,
    app: app,
    db: db
  };
}

