/**
 * Configuration types for CUI
 */

export interface ServerConfig {
  host: string;
  port: number;
}

export interface GeminiConfig {
  /**
   * Google API key for Gemini
   * Can also be set via GOOGLE_API_KEY environment variable
   */
  apiKey?: string;
  
  /**
   * Gemini model to use
   * Default: 'gemini-2.5-flash'
   */
  model?: string;
}

export interface CUIConfig {
  /**
   * Unique machine identifier
   * Format: {hostname}-{16char_hash}
   * Example: "wenbomacbook-a1b2c3d4e5f6g7h8"
   */
  machine_id: string;
  
  /**
   * Server configuration
   */
  server: ServerConfig;

  /**
   * Authentication token for API access
   * 32-character random string generated on first run
   */
  authToken: string;

  /**
   * Gemini API configuration (optional)
   */
  gemini?: GeminiConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<CUIConfig, 'machine_id' | 'authToken'> = {
  server: {
    host: 'localhost',
    port: 3001
  }
};