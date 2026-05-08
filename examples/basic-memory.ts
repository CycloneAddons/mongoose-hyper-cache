/**
 * Example: Basic Usage with Memory Provider
 * Single instance, fastest cache
 */

import mongoose from 'mongoose';
import hyper from '../src';

// Define schema
const userSchema = new mongoose.Schema({
  username: { type: String, index: true },
  email: { type: String, unique: true },
  age: Number,
  status: { type: String, default: 'active' },
});

const User = mongoose.model('User', userSchema);

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/test');
    console.log('✓ Connected to MongoDB');

    // Initialize hyper-cache with memory provider
    const cache = await hyper.init(mongoose, {
      provider: 'memory',
      warmOnStartup: true,
      debug: true,
    });

    // Wait for initialization
    await cache.ready;
    console.log('✓ Cache ready');

    // Create sample data
    const newUser = await User.create({
      username: 'john',
      email: 'john@example.com',
      age: 30,
    });
    console.log('✓ Created user:', newUser._id);

    // Read from cache (now synchronous, no await needed)
    console.log('\n--- Reads from Cache (0ms!) ---');
    const user = User.findById(newUser._id) as any;
    console.log('✓ Found user via findById:', user?.username);

    const users = User.find({ age: { $gte: 25 } }) as any[];
    console.log('✓ Found users via find:', users.length);

    const activeUsers = User.find({ status: 'active' }) as any[];
    console.log('✓ Found active users:', activeUsers.length);

    // Update document
    console.log('\n--- Write Operations (30-40ms) ---');
    await User.updateOne({ _id: newUser._id }, { age: 31 });
    console.log('✓ Updated user');

    // Verify update in cache (immediate, no re-fetch)
    const updatedUser = User.findById(newUser._id) as any;
    console.log('✓ Update synced to cache, new age:', updatedUser?.age);

    // Cache stats
    console.log('\n--- Cache Stats ---');
    const stats = cache.stats();
    console.log('Stats:', stats);

    // Cleanup
    await cache.destroy();
    await mongoose.disconnect();
    console.log('\n✓ Disconnected');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
