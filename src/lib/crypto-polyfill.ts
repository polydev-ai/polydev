// Crypto polyfill for server environments
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  const crypto = require('crypto')
  
  // Polyfill the Web Crypto API for server environments
  globalThis.crypto = {
    getRandomValues: (array: any) => {
      return crypto.randomFillSync(array)
    },
    randomUUID: () => {
      return crypto.randomUUID()
    },
    subtle: {
      digest: async (algorithm: string, data: BufferSource) => {
        const hash = crypto.createHash(algorithm.toLowerCase().replace('-', ''))
        hash.update(data)
        return hash.digest()
      }
    }
  } as any
}

export {}