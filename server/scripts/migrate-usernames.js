/**
 * One-time migration: generate @username for existing users without one.
 * Usage: node server/scripts/migrate-usernames.js
 *
 * Strategy: slug firstName (lat. letters only) + 4 random digits, ensure
 * uniqueness. If slug is empty (non-latin only names), fall back to
 * `user` + 4 random digits.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

function slugFirstName(firstName = '') {
  const ascii = String(firstName)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_]/g, '');
  return ascii.slice(0, 12);
}

function randomDigits(n = 4) {
  return String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
}

async function run() {
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error('MONGO_URI / MONGODB_URI env var required.');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const users = await User.find({ $or: [{ username: null }, { username: { $exists: false } }] }).select('firstName');
  console.log(`Found ${users.length} users without username.`);

  let updated = 0;
  for (const user of users) {
    let base = slugFirstName(user.firstName) || 'user';
    if (base.length < 3) base = (base + 'user').slice(0, 4);
    let candidate;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      candidate = `${base}_${randomDigits(4)}`.slice(0, 20);
      const taken = await User.findOne({ username: candidate }).select('_id').lean();
      if (!taken) break;
      candidate = null;
    }
    if (!candidate) {
      console.warn(`Could not find unique candidate for ${user._id}, skipping.`);
      continue;
    }
    await User.updateOne({ _id: user._id }, { $set: { username: candidate } });
    updated += 1;
    if (updated % 25 === 0) console.log(`Progress: ${updated}/${users.length}`);
  }

  console.log(`Migration complete. Updated ${updated} user(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
