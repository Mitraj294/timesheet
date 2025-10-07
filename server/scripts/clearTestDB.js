// This script clears all collections in the MongoDB database specified by MONGO_URI.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.test') });

const uri = process.env.MONGO_URI;

async function clearDatabase() {
  if (!uri) {
    console.error('MONGO_URI not set!');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  await mongoose.disconnect();
  console.log('Test database cleared.');
}

clearDatabase();
