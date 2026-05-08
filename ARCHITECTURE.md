# Architecture Documentation

## Overview

mongoose-hyper-cache implements a high-performance caching layer for Mongoose that transforms read patterns in your MongoDB applications. The architecture follows these principles:

- **Write-Through Cache**: All writes go to MongoDB AND cache simultaneously
- **Read-Only Cache**: All reads come from cache (never MongoDB for cached data)
- **Automatic Patching**: Mongoose methods are transparently patched - no code changes needed
- **Multi-Provider**: Pluggable caching backends (Memory, Redis, Hybrid)

## Core Components

### 1. Providers (`/src/providers`)

Each provider implements the `CacheProvider` interface.

#### MemoryProvider
- Uses LRU cache for in-memory storage
- **Synchronous operations** - no async overhead
- Best for single-instance applications
- Data lost on restart

```
Request → Memory (Fast, < 1ms)
```

#### RedisProvider
- Remote cache for distributed deployments
- **Async operations** - network round trip
- Shared across instances
- Persistent between restarts

```
Request → Redis (Medium, 5-50ms)
```

#### HybridProvider
- Combines Memory + Redis
- **Intelligent fallback**: Memory → Redis → Failure
- Best for production deployments
- Balances speed and reliability

```
Request
  ├→ Memory (< 1ms) ✓ return
  ├→ Redis (5-50ms, on miss) ✓ return + populate memory
  └→ Error (on miss)
```

### 2. Query Engine (`/src/query-engine`)

In-memory MongoDB query evaluator supporting:

#### QueryOperators
Evaluates MongoDB operators against cached documents:
- Comparison: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- Membership: `$in`, `$nin`, `$all`
- Logical: `$and`, `$or`, `$nor`, `$not`
- Advanced: `$regex`, `$type`, `$exists`, `$elemMatch`, `$size`

#### DocumentMatcher
Filters collections using operators:
- `find()` - match multiple documents with sorting/limiting
- `findOne()` - match single document
- `findById()` - direct ID lookup
- `exists()` - check existence
- `count()` - count matches

### 3. Cache Manager (`/src/cache`)

Orchestrates document storage, collection tracking, and indexing.

#### CacheManager Methods

**Document Operations**
```typescript
cacheDocument(modelName, doc) // Store lean document
getDocument(modelName, id)      // Retrieve document
deleteDocument(modelName, id)   // Remove document
```

**Collection Operations**
```typescript
addToCollection(modelName, id)       // Track document in collection
removeFromCollection(modelName, id)  // Untrack document
getCollectionIds(modelName)          // Get all document IDs
clearCollection(modelName)           // Clear collection cache
```

**Query Operations**
```typescript
find(modelName, filter, options)
findOne(modelName, filter)
findById(modelName, id)
countDocuments(modelName, filter)
exists(modelName, filter)

// Synchronous variants
findSync(modelName, filter)
findOneSync(modelName, filter)
findByIdSync(modelName, id)
```

#### IndexBuilder
Auto-builds indexes from Mongoose schema:

```typescript
// Scans schema for indexed fields
schema.eachPath(path, schemaType) {
  if (schemaType.options.index === true) {
    buildIndex(path)
  }
}
```

**Index Structure**:
```
index:ModelName:fieldName:fieldValue → [docIds]
```

### 4. Startup/Warm (`/src/startup`)

#### WarmLoader
Preloads all documents into cache on startup.

**Flow**:
```
1. Model.find({}).lean()     // Fetch all docs (lean = no hydration)
2. For each doc:
   a. cacheDocument()        // Store in cache
   b. addToCollection()      // Track in collection
3. IndexBuilder.build()      // Build field indexes
4. Ready for reads
```

**Key Performance Details**:
- Uses `.lean()` - ~10x faster than hydrated documents
- Builds indexes in memory - future queries don't scan all docs
- Respects `warmCollections` and `maxWarmDocuments` options

### 5. Mongoose Patching (`/src/patch`)

#### QueryPatcher
Patches Query methods to intercept and serve from cache.

**Patched Methods**:
```
Query.find()          → CacheManager.find()
Query.findOne()       → CacheManager.findOne()
Query.findById()      → CacheManager.findById()
Query.countDocuments()→ CacheManager.countDocuments()
Query.exists()        → CacheManager.exists()
```

**Plus Synchronous Methods**:
```
Model.findSync()      // Returns cached docs synchronously
Model.findOneSync()   // Returns single doc synchronously
Model.findByIdSync()  // Returns doc by ID synchronously
```

**Execution Flow**:
```
User.find({status: 'active'})
  ↓
QueryPatcher intercepts
  ↓
Try CacheManager.find()
  ├→ Success: return cached results ✓
  └→ Failure: fall back to MongoDB
```

#### WritePatcher
Patches write methods to sync with cache.

**Patched Methods**:
```
Model.create()           → MongoDB + cache
Model.updateOne()        → MongoDB + cache
Model.updateMany()       → MongoDB + cache
Model.deleteOne()        → MongoDB + cache
Model.deleteMany()       → MongoDB + cache
Model.findByIdAndUpdate()→ MongoDB + cache
Model.findByIdAndDelete()→ MongoDB + cache
```

**Write Flow**:
```
await User.updateOne({_id}, {name: 'new'})
  ↓
Execute on MongoDB
  ↓
Fetch updated document
  ↓
CacheManager.cacheDocument()
  ↓
Done
```

### 6. Write Sync (`/src/sync`)

#### WriteSync
Executes write operations with MongoDB + cache synchronization.

**Operations**:
- `create()` - Insert → cache → collection tracking
- `updateOne()` - MongoDB update → fetch → cache
- `updateMany()` - MongoDB update → fetch all → cache all
- `deleteOne()` - Record doc → MongoDB delete → cache remove
- `deleteMany()` - Record docs → MongoDB delete → cache remove all

#### ChangeStreamWatcher
Optional MongoDB change streams for distributed sync.

**Flow**:
```
Instance A writes to MongoDB
  ↓
Change stream event
  ↓
Instance B watcher sees change
  ↓
Instance B fetches + caches
  ↓
Consistent across instances
```

**Supported Operations**:
- `insert` - Fetch and cache new document
- `update` - Fetch and sync updated document
- `delete` - Remove from cache
- `replace` - Fetch and sync replaced document
- `invalidate` - Clear collection cache

## Storage Schema

### Key Naming
```
doc:ModelName:docId              Document storage
collection:ModelName             Collection member IDs
index:ModelName:field:value      Field value → doc IDs
```

### Example
For User model with documents:
```
{_id: 1, name: 'John', email: 'john@example.com'}
{_id: 2, name: 'Jane', email: 'jane@example.com'}
```

Storage becomes:
```
doc:User:1 → {_id: 1, name: 'John', email: 'john@example.com'}
doc:User:2 → {_id: 2, name: 'Jane', email: 'jane@example.com'}

collection:User → [1, 2]

index:User:email:john@example.com → [1]
index:User:email:jane@example.com → [2]
```

## Query Resolution

### Indexed Query Only
```
User.find({email: 'john@example.com'})
  ├→ Look up index:User:email:john@example.com
  └→ Get [1] (doc IDs)
  └→ Fetch doc:User:1
  └→ Return {_id: 1, ...}
```

### Filter Query (no index)
```
User.find({age: {$gte: 18}})
  ├→ No index, scan all collection
  └→ collection:User → [1, 2, 3, ...]
  └→ Fetch all docs
  └→ Apply filter (age >= 18)
  └→ Return matching docs
```

## Initialization Sequence

```
1. createProvider()
   └→ Memory/Redis/Hybrid instance

2. CacheManager(provider)
   └→ Wrapper around provider

3. mongoose.modelNames()
   └→ Discover all models

4. IF warmOnStartup:
   a. WarmLoader.warmCollections()
      ├→ Model.find({}).lean() for each collection
      ├→ cacheDocument() each doc
      └→ buildIndex() from schema
   
   b. Models ready to serve from cache

5. QueryPatcher.patchFind/findOne/findById...
   └→ All reads redirect to CacheManager

6. WritePatcher.patchCreate/update/delete...
   └→ All writes sync MongoDB + cache

7. IF watch:
   └→ ChangeStreamWatcher.watchModel()
      └→ Listen for changes from other instances

8. Ready!
```

## Performance Characteristics

### Memory Provider (Single Instance)
```
Operation           Time
findByIdSync()      < 0.1ms     (direct lookup)
findSync()          1-5ms       (scan + filter)
findById()          < 1ms       (cache + return)
find()              5-10ms      (scan cache + filter)
create()            50ms        (MongoDB + cache write)
updateOne()         60ms        (MongoDB + cache sync)
```

### Redis Provider (Distributed)
```
Operation       Time
get(key)        5-50ms          (network)
find()          10-100ms        (multiple round trips)
create()        60-80ms         (MongoDB + Redis)
```

### Hybrid Provider (Memory + Redis)
```
Operation           Time
Hit in Memory       < 1ms
Miss in Memory,
hit in Redis        10-50ms
Fall back to
MongoDB             50-100ms
```

## Trade-offs

### Advantages
✅ Dramatically faster reads (10-100x)
✅ No cache invalidation logic needed
✅ Synchronous reads possible
✅ Transparent to application code
✅ Distributed support (Redis)

### Disadvantages
❌ Warm startup takes time
❌ Memory overhead for large collections
❌ Writes slightly slower (dual-write)
❌ Change stream overhead with `watch: true`
❌ Eventual consistency with `watch: false`

## Memory Estimation

Per document estimate:
```
Small doc (5 fields):    ~2 KB
Medium doc (20 fields):  ~5 KB
Large doc (50+ fields):  ~15 KB
+ Index overhead:        ~1 KB per field per doc
```

**Example**: 10,000 documents, 10 fields each
```
Docs:        10,000 × 5 KB = 50 MB
Indexes:     10,000 × 10 KB = 100 MB
Total:       ~150 MB
```

## Future Optimization

Potential enhancements:
- Binary serialization (MessagePack) - reduce memory
- Pagination in find() - reduce memory per query
- Selective field indexing
- Custom index strategies (hash, range trees)
- Distributed index tracking
- Query optimization with cost analysis
