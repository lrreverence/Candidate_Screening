/**
 * Cookie-based storage adapter for Supabase
 * Implements the same interface as localStorage but uses cookies instead
 * Handles large values by splitting across multiple cookies if needed (4KB limit per cookie)
 */

class CookieStorage {
  constructor() {
    this.prefix = 'sb-'
    this.maxCookieSize = 4000 // 4KB limit (leaving some buffer)
    this.chunkSize = 3800 // Safe chunk size after encoding overhead
  }

  /**
   * Get a cookie value by name
   */
  getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop().split(';').shift()
    }
    return null
  }

  /**
   * Get all cookies that match a pattern (for chunked values)
   */
  getAllCookies(prefix) {
    const cookies = {}
    const allCookies = document.cookie.split(';')
    
    allCookies.forEach(cookie => {
      const trimmed = cookie.trim()
      if (trimmed.startsWith(prefix)) {
        const [name, ...valueParts] = trimmed.split('=')
        cookies[name] = valueParts.join('=')
      }
    })
    
    return cookies
  }

  /**
   * Set a cookie with optional expiration
   */
  setCookie(name, value, days = 365) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    const expires = `expires=${date.toUTCString()}`
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`
  }

  /**
   * Remove a cookie
   */
  removeCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
  }

  /**
   * Get item from storage (localStorage interface)
   * Handles both single cookie and chunked cookies
   */
  getItem(key) {
    try {
      const cookieName = this.prefix + key
      
      // Check if it's a chunked value
      const chunk0 = this.getCookie(cookieName + '_0')
      if (chunk0 !== null) {
        // Reconstruct chunked value
        const chunks = []
        let chunkIndex = 0
        let chunk = this.getCookie(cookieName + '_' + chunkIndex)
        
        while (chunk !== null) {
          chunks.push(chunk)
          chunkIndex++
          chunk = this.getCookie(cookieName + '_' + chunkIndex)
        }
        
        if (chunks.length > 0) {
          const encodedValue = chunks.join('')
          return decodeURIComponent(encodedValue)
        }
      }
      
      // Try single cookie
      const value = this.getCookie(cookieName)
      return value ? decodeURIComponent(value) : null
    } catch (error) {
      console.error('Error getting cookie:', error)
      return null
    }
  }

  /**
   * Set item in storage (localStorage interface)
   * Splits large values across multiple cookies if needed
   */
  setItem(key, value) {
    try {
      const cookieName = this.prefix + key
      
      // First, remove any existing chunks
      this.removeItem(key)
      
      // Encode the value to handle special characters
      const encodedValue = encodeURIComponent(value)
      
      // Check if we need to chunk the value
      if (encodedValue.length > this.maxCookieSize) {
        // Split into chunks
        const chunks = []
        for (let i = 0; i < encodedValue.length; i += this.chunkSize) {
          chunks.push(encodedValue.slice(i, i + this.chunkSize))
        }
        
        // Store each chunk as a separate cookie
        chunks.forEach((chunk, index) => {
          this.setCookie(cookieName + '_' + index, chunk, 365)
        })
      } else {
        // Store as single cookie
        this.setCookie(cookieName, encodedValue, 365)
      }
    } catch (error) {
      console.error('Error setting cookie:', error)
    }
  }

  /**
   * Remove item from storage (localStorage interface)
   * Removes both single cookie and all chunks if chunked
   */
  removeItem(key) {
    try {
      const cookieName = this.prefix + key
      
      // Remove single cookie
      this.removeCookie(cookieName)
      
      // Remove all chunks
      let chunkIndex = 0
      let chunk = this.getCookie(cookieName + '_' + chunkIndex)
      while (chunk !== null) {
        this.removeCookie(cookieName + '_' + chunkIndex)
        chunkIndex++
        chunk = this.getCookie(cookieName + '_' + chunkIndex)
      }
    } catch (error) {
      console.error('Error removing cookie:', error)
    }
  }
}

export default CookieStorage

