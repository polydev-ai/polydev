/**
 * Polydev AI V2 - Authentication Integration with Zero-Knowledge Encryption
 *
 * This module integrates the encryption library with the authentication flow:
 * 1. Signup: Initialize encryption, store salt in database
 * 2. Login: Unlock encryption with password
 * 3. Session management: Auto-lock on idle, unlock screen
 * 4. Logout: Clear all encryption keys
 *
 * Security:
 * - Password never sent to server
 * - Master key never sent to server unencrypted
 * - Server compromise does NOT expose user data
 */

import {
  initializeEncryption,
  unlockEncryption,
  isEncryptionUnlocked,
  lockEncryption,
  logoutEncryption,
  getEncryptionEngine,
} from '@/lib/crypto';

/**
 * Encryption session state
 */
interface EncryptionSessionState {
  isUnlocked: boolean;
  lastActivityTime: number;
  autoLockTimeoutMs: number; // Default: 15 minutes
}

/**
 * Singleton encryption session manager
 */
class EncryptionSessionManager {
  private state: EncryptionSessionState;
  private activityCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      isUnlocked: false,
      lastActivityTime: Date.now(),
      autoLockTimeoutMs: 15 * 60 * 1000, // 15 minutes
    };
  }

  /**
   * Start monitoring user activity for auto-lock
   */
  startActivityMonitoring(): void {
    // Update activity time on user interaction
    if (typeof window !== 'undefined') {
      const updateActivity = () => {
        this.state.lastActivityTime = Date.now();
      };

      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('click', updateActivity);
      window.addEventListener('scroll', updateActivity);
    }

    // Check for idle timeout every 30 seconds
    this.activityCheckInterval = setInterval(() => {
      this.checkIdleTimeout();
    }, 30 * 1000);
  }

  /**
   * Stop monitoring user activity
   */
  stopActivityMonitoring(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  /**
   * Check if user has been idle too long and lock session
   */
  private checkIdleTimeout(): void {
    if (!this.state.isUnlocked) {
      return; // Already locked
    }

    const idleTime = Date.now() - this.state.lastActivityTime;

    if (idleTime >= this.state.autoLockTimeoutMs) {
      console.log('[EncryptionAuth] Auto-locking due to inactivity');
      this.lockSession();

      // Trigger UI update (custom event)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('encryption:locked', {
          detail: { reason: 'idle_timeout' }
        }));
      }
    }
  }

  /**
   * Set auto-lock timeout
   * @param minutes - Minutes of inactivity before auto-lock
   */
  setAutoLockTimeout(minutes: number): void {
    this.state.autoLockTimeoutMs = minutes * 60 * 1000;
  }

  /**
   * Lock the encryption session
   */
  lockSession(): void {
    lockEncryption();
    this.state.isUnlocked = false;
  }

  /**
   * Update session state
   */
  updateState(isUnlocked: boolean): void {
    this.state.isUnlocked = isUnlocked;
    this.state.lastActivityTime = Date.now();
  }

  /**
   * Get current session state
   */
  getState(): EncryptionSessionState {
    return { ...this.state };
  }
}

// Singleton instance
const sessionManager = new EncryptionSessionManager();

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize encryption for new user (on signup)
 *
 * Steps:
 * 1. Generate master key and encrypt with password
 * 2. Store encrypted key in IndexedDB
 * 3. Return salt to store in Supabase users table
 *
 * @param password - User's master password
 * @returns Object with keyId and salt (store salt in database!)
 */
export async function signupWithEncryption(
  password: string
): Promise<{ keyId: string; salt: string }> {
  try {
    console.log('[EncryptionAuth] Initializing encryption for new user');

    // Validate password strength
    if (!isPasswordStrong(password)) {
      throw new Error(
        'Password too weak. Must be at least 12 characters with uppercase, lowercase, numbers, and symbols.'
      );
    }

    // Initialize encryption
    const { keyId, salt } = await initializeEncryption(password);

    // Update session state
    sessionManager.updateState(true);

    // Start activity monitoring
    sessionManager.startActivityMonitoring();

    console.log('[EncryptionAuth] Encryption initialized successfully');

    return { keyId, salt };
  } catch (error) {
    console.error('[EncryptionAuth] Signup error:', error);
    throw error;
  }
}

/**
 * Unlock encryption for existing user (on login)
 *
 * Steps:
 * 1. Fetch user's salt from database (before calling this)
 * 2. Derive key from password + salt
 * 3. Decrypt master key from IndexedDB
 * 4. Load master key into memory
 *
 * @param password - User's master password
 * @returns true if unlock successful, false if wrong password
 */
export async function loginWithEncryption(password: string): Promise<boolean> {
  try {
    console.log('[EncryptionAuth] Attempting to unlock encryption');

    const success = await unlockEncryption(password);

    if (success) {
      // Update session state
      sessionManager.updateState(true);

      // Start activity monitoring
      sessionManager.startActivityMonitoring();

      console.log('[EncryptionAuth] Encryption unlocked successfully');
    } else {
      console.warn('[EncryptionAuth] Wrong password');
    }

    return success;
  } catch (error) {
    console.error('[EncryptionAuth] Login error:', error);
    throw error;
  }
}

/**
 * Logout: Clear all encryption keys
 *
 * Steps:
 * 1. Clear master key from memory
 * 2. Delete encrypted key from IndexedDB
 * 3. Stop activity monitoring
 */
export async function logoutWithEncryption(): Promise<void> {
  try {
    console.log('[EncryptionAuth] Logging out and clearing encryption keys');

    // Stop activity monitoring
    sessionManager.stopActivityMonitoring();

    // Clear encryption keys
    await logoutEncryption();

    // Update session state
    sessionManager.updateState(false);

    console.log('[EncryptionAuth] Logout complete');
  } catch (error) {
    console.error('[EncryptionAuth] Logout error:', error);
    throw error;
  }
}

/**
 * Lock encryption session (on idle or manual lock)
 *
 * Clears master key from memory but keeps encrypted key in IndexedDB.
 * User can unlock with password without re-initializing.
 */
export function lockEncryptionSession(): void {
  console.log('[EncryptionAuth] Locking encryption session');
  sessionManager.lockSession();
}

/**
 * Check if encryption is currently unlocked
 */
export function isSessionUnlocked(): boolean {
  return isEncryptionUnlocked();
}

/**
 * Set auto-lock timeout
 * @param minutes - Minutes of inactivity before auto-lock (default: 15)
 */
export function setAutoLockTimeout(minutes: number): void {
  sessionManager.setAutoLockTimeout(minutes);
}

/**
 * Get current encryption session state
 */
export function getEncryptionSessionState(): EncryptionSessionState {
  return sessionManager.getState();
}

/**
 * Validate password strength
 * Requirements:
 * - At least 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one symbol
 */
export function isPasswordStrong(password: string): boolean {
  if (password.length < 12) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSymbol;
}

/**
 * Get password strength feedback
 */
export function getPasswordStrength(password: string): {
  score: number; // 0-5
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 12) score++;
  else feedback.push('Use at least 12 characters');

  if (password.length >= 16) score++;

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  else feedback.push('Add symbols (!@#$%^&*)');

  // Check for common patterns
  if (/^[0-9]+$/.test(password)) {
    score = Math.min(score, 1);
    feedback.push('Avoid using only numbers');
  }

  if (/^[a-zA-Z]+$/.test(password)) {
    score = Math.min(score, 2);
    feedback.push('Add numbers and symbols');
  }

  // Check for sequential characters
  if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def/i.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid sequential characters');
  }

  return { score, feedback };
}

// ============================================================================
// React Hooks (for use in components)
// ============================================================================

/**
 * React hook for encryption session state
 * Usage:
 * ```tsx
 * const { isUnlocked, lock, unlock } = useEncryptionSession();
 * ```
 */
export function useEncryptionSession() {
  // Note: This is a basic implementation
  // In a real React app, you'd use useState/useEffect

  return {
    isUnlocked: isSessionUnlocked(),
    lock: lockEncryptionSession,
    unlock: loginWithEncryption,
    getState: getEncryptionSessionState,
  };
}

// ============================================================================
// Event Listeners for UI Integration
// ============================================================================

/**
 * Listen for encryption lock events
 * Usage:
 * ```typescript
 * onEncryptionLocked((event) => {
 *   if (event.reason === 'idle_timeout') {
 *     // Show unlock screen
 *   }
 * });
 * ```
 */
export function onEncryptionLocked(
  callback: (event: { reason: 'idle_timeout' | 'manual' }) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for server-side
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    callback(customEvent.detail);
  };

  window.addEventListener('encryption:locked', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('encryption:locked', handler);
  };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Check if user has ever initialized encryption (has a master key)
 * Returns true if they have a master key stored, false otherwise
 */
export async function hasEncryptionInitialized(): Promise<boolean> {
  try {
    const engine = getEncryptionEngine();
    // Try to get the latest master key from IndexedDB
    const keyStore = (engine as any).keyStore;
    const bundle = await keyStore.getLatestMasterKey();
    return bundle !== null;
  } catch (error) {
    console.error('[EncryptionAuth] Error checking initialization:', error);
    return false;
  }
}

/**
 * Initialize encryption auth system
 * Call this in your app's main entry point (e.g., _app.tsx)
 *
 * IMPORTANT: For existing users who haven't set up encryption,
 * this will NOT force them to unlock - encryption is opt-in.
 */
export async function initializeEncryptionAuth(): Promise<void> {
  console.log('[EncryptionAuth] Initializing encryption auth system');

  // Check if user has ever initialized encryption
  const hasInit = await hasEncryptionInitialized();

  if (!hasInit) {
    console.log('[EncryptionAuth] User has not initialized encryption - skipping auto-lock');
    return;
  }

  // Check if user has existing encrypted session
  if (isEncryptionUnlocked()) {
    console.log('[EncryptionAuth] Found existing unlocked session');
    sessionManager.updateState(true);
    sessionManager.startActivityMonitoring();
  } else {
    console.log('[EncryptionAuth] Encryption initialized but session locked');
  }
}
