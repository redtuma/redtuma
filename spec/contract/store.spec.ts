import { InMemoryStore } from '@redtuma/core'
import { runStoreConformance } from '../src/store-conformance'

// The reference store must satisfy the shared contract. Adapter packages
// (store-pg, store-libsql) can run the same suite against their own factory.
runStoreConformance('InMemoryStore', () => new InMemoryStore())
