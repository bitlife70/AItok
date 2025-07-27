// Simple encryption/decryption for API keys
// Note: This is basic obfuscation, not cryptographically secure
// For production, consider using Web Crypto API or server-side encryption

class SimpleEncryption {
  private key: string;

  constructor() {
    // Generate or retrieve a browser-specific key
    this.key = this.getBrowserKey();
  }

  private getBrowserKey(): string {
    // Use browser fingerprint as encryption key
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const platform = navigator.platform;
    const screenResolution = `${screen.width}x${screen.height}`;
    
    // Create a simple hash from browser characteristics
    const fingerprint = `${userAgent}-${language}-${platform}-${screenResolution}`;
    return this.simpleHash(fingerprint);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  encrypt(text: string): string {
    if (!text) return '';
    
    try {
      const key = this.key;
      let encrypted = '';
      
      for (let i = 0; i < text.length; i++) {
        const textChar = text.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = textChar ^ keyChar;
        encrypted += String.fromCharCode(encryptedChar);
      }
      
      // Base64 encode the result
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      return text; // Return original text if encryption fails
    }
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    
    try {
      // Base64 decode first
      const encrypted = atob(encryptedText);
      const key = this.key;
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        const decryptedChar = encryptedChar ^ keyChar;
        decrypted += String.fromCharCode(decryptedChar);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedText; // Return original text if decryption fails
    }
  }
}

export const encryption = new SimpleEncryption();

// Secure storage utilities
export class SecureStorage {
  private static readonly PREFIX = 'aitok_secure_';
  
  static setItem(key: string, value: string): void {
    try {
      const encrypted = encryption.encrypt(value);
      localStorage.setItem(this.PREFIX + key, encrypted);
    } catch (error) {
      console.error('Failed to securely store item:', error);
      // Fallback to regular storage
      localStorage.setItem(this.PREFIX + key, value);
    }
  }

  static getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(this.PREFIX + key);
      if (!encrypted) return null;
      
      return encryption.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to securely retrieve item:', error);
      // Fallback to regular storage
      return localStorage.getItem(this.PREFIX + key);
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Check if an item exists
  static hasItem(key: string): boolean {
    return localStorage.getItem(this.PREFIX + key) !== null;
  }

  // Get all secure storage keys
  static getKeys(): string[] {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(this.PREFIX))
      .map(key => key.substring(this.PREFIX.length));
  }
}