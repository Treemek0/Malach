const { MongoClient } = require('mongodb');

// connection string should be stored in .env, e.g.:
// MONGO_URI=mongodb+srv://Treemek:<password>@malach.9wsocf6.mongodb.net/?retryWrites=true&w=majority
// MONGO_DB_NAME=malach

let client;
let database;

async function connect() {
  if (database) return database;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  database = client.db(process.env.MONGO_DB_NAME || 'malach');
  return database;
}

async function collection(name) {
  const db = await connect();
  return db.collection(name);
}

module.exports = {
  connect,
  collection
};