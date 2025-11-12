import { Buffer } from 'buffer'

// Make Buffer available globally for libraries that expect it
// This is needed for mobile compatibility where Node.js Buffer is not available
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}
