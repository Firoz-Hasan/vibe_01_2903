const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if(!connectionString){
  console.warn('Warning: DATABASE_URL is not set. DB connections will fail until configured.');
}

const pool = new Pool({
  connectionString,
  // you can add ssl settings here for production
});

module.exports = pool;
