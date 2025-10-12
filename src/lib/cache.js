/**
 * Simple cache implementation with TTL support
 */
export class Cache {
  constructor(ttl = 5 * 60 * 1000) {
    this.ttl = ttl;
    this.data = null;
    this.timestamp = null;
  }

  get() {
    if (this.data && this.timestamp && Date.now() - this.timestamp < this.ttl) {
      return this.data;
    }
    return null;
  }

  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  }

  clear() {
    this.data = null;
    this.timestamp = null;
  }

  isValid() {
    return this.data !== null && this.timestamp !== null && Date.now() - this.timestamp < this.ttl;
  }
}
