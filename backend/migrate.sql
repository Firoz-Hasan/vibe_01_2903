-- Run this against your Postgres database to create the users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  dob DATE,
  country VARCHAR(100),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now())
);
