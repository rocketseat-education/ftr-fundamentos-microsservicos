import * as argon2 from 'argon2'

export class PasswordService {
  static async hash(password: string): Promise<string> {
    return argon2.hash(password)
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch (error) {
      // If verification fails due to invalid hash format, return false
      return false
    }
  }

  /**
   * Check if a hash needs to be rehashed with current parameters
   * Useful for upgrading security parameters over time
   */
  static needsRehash(hash: string): boolean {
    try {
      return argon2.needsRehash(hash)
    } catch (error) {
      // If we can't parse the hash, it definitely needs rehashing
      return true
    }
  }
}
