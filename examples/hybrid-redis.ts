/**
 * Example: Hybrid Provider (Memory + Redis)
 * Best for multi-instance deployments
 */

import mongoose from 'mongoose';
import hyper from '../src';

const postSchema = new mongoose.Schema({
  title: { type: String, index: true },
  author: mongoose.Schema.Types.ObjectId,
  content: String,
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/blog');
    console.log('✓ Connected to MongoDB');

    // Initialize with Hybrid provider
    const cache = await hyper.init(mongoose, {
      provider: 'memory+redis', // Memory + Redis backup
      warmOnStartup: true,
      warmCollections: ['Post'], // Only warm this collection
      maxWarmDocuments: 5000, // Cap at 5K documents
      watch: true, // Enable change streams for sync
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      debug: true,
    });

    await cache.ready;
    console.log('✓ Hybrid cache ready');

    // Create posts
    console.log('\n--- Creating Posts ---');
    for (let i = 0; i < 5; i++) {
      await Post.create({
        title: `Post ${i + 1}`,
        content: `Content for post ${i + 1}`,
        likes: Math.floor(Math.random() * 1000),
      });
    }
    console.log('✓ Created 5 posts');

    // Complex queries using cache (now synchronous)
    console.log('\n--- Reading from Cache (0ms!) ---');
    const popularPosts = Post.find({ likes: { $gte: 500 } }) as any[];
    console.log('✓ Found popular posts:', popularPosts.length);

    const recentPosts = Post.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }) as any[];
    console.log('✓ Found recent posts:', recentPosts.length);

    // Synchronous reads (no await)
    console.log('\n--- Synchronous Reads ---');
    const allPosts = Post.find({}) as any[];
    console.log('Total posts in cache:', allPosts.length);

    const topPost = Post.findOne({ likes: { $gte: 800 } }) as any;
    console.log('Top post:', topPost?.title);

    // Bulk updates (write sync)
    console.log('\n--- Bulk Updates ---');
    await Post.updateMany(
      { likes: { $lt: 100 } },
      { $set: { likes: 100 } }
    );
    console.log('✓ Updated low-like posts');

    // Verify through cache
    const lowLikePosts = Post.find({ likes: 100 }) as any[];
    console.log('Posts with updated likes:', lowLikePosts.length);

    // Stats
    console.log('\n--- Cache Stats ---');
    console.log(cache.stats());

    await cache.destroy();
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
