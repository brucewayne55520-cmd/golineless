const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Read .env file manually from workspace root
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1].trim()] = value;
  }
});

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function check() {
  try {
    // Check tables
    const columns = await sql(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log("Users table columns:", columns);
    
    const hasGoogleId = columns.some(c => c.column_name === 'google_id');
    if (!hasGoogleId) {
      console.log("google_id column NOT found. Attempting to add it...");
      await sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;`);
      console.log("google_id column added successfully!");
    } else {
      console.log("google_id column already exists.");
    }
  } catch (err) {
    console.error("Error checking or modifying database:", err);
  }
}

check();
