import { runStoreConformance } from '@redtuma/spec/store-conformance'
import { DurableObjectStore, MemoryKVStorage } from '../src'

// The Durable Object store must satisfy exactly the same Store contract as the
// reference InMemoryStore. Same suite, different adapter.
runStoreConformance('DurableObjectStore', () => new DurableObjectStore(new MemoryKVStorage()))
