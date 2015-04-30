/* jshint node: true */
'use strict';

module.exports = function () {
  return {
    addr: process.env.GRADIS_ADDR || 'localhost',
    port: parseInt(process.env.GRADIS_PORT || '3000', 10),

    secret: process.env.GRADIS_SECRET || 'gradis',
    folder: process.env.GRADIS_FOLDER || process.cwd() + '/folder/', // Yeah, yeah.
    dbname: process.env.GRADIS_DBNAME || 'db',

    env: process.env.NODE_ENV || 'development'
  };
};
