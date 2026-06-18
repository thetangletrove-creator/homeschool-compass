/**
 * Hybrid encryption utilities for the ZK Provider Portal.
 *
 * Uses RSA-OAEP (2048-bit) + AES-256-GCM for hybrid encryption:
 *   - The large profile payload is encrypted with a random AES-GCM key.
 *   - The AES key itself is encrypted with the parent's RSA public key.
 *   - The resulting ciphertext bundle is stored server-side — the server only
 *     sees base64 noise.
 *
 * RSA-OAEP limitations (2048-bit key, SHA-256, no label):
 *   - Max plaintext per encrypt() call: ~214 bytes (key_size/8 - 2*hash_size - 2)
 *   - This is why we use hybrid — the AES key is tiny, the profile can be megabytes.
 *
 * Web Crypto API — browser only. These functions throw if called server-side.
 */

// ── Key Generation ─────────────────────────────────────────────────────────

/**
 * Generate a new RSA-OAEP-2048-SHA256 key pair.
 * Wraps crypto.subtle.generateKey.
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable — needed to export/import
    ["encrypt", "decrypt"],
  )
}

// ── Key Serialization ──────────────────────────────────────────────────────

/**
 * Export a public key as a hex-encoded SPKI string.
 * Suitable for embedding in a URL hash fragment.
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", publicKey)
  return bytesToHex(new Uint8Array(spki))
}

/**
 * Import a hex-encoded SPKI string back into a CryptoKey.
 */
export async function importPublicKey(hex: string): Promise<CryptoKey> {
  const spki = hexToBytes(hex)
  return crypto.subtle.importKey(
    "spki",
    spki,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  )
}

/**
 * Export a private key as a hex-encoded PKCS#8 string.
 * Stored in localStorage for the web MVP.
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey)
  return bytesToHex(new Uint8Array(pkcs8))
}

/**
 * Import a hex-encoded PKCS#8 string back into a CryptoKey.
 */
export async function importPrivateKey(hex: string): Promise<CryptoKey> {
  const pkcs8 = hexToBytes(hex)
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  )
}

// ── Hybrid Encryption ──────────────────────────────────────────────────────

export type EncryptedBundle = {
  /** RSA-OAEP-encrypted AES-GCM key (base64) */
  encryptedKey: string
  /** AES-GCM initialization vector (base64) */
  iv: string
  /** AES-GCM authentication tag (base64) */
  tag: string
  /** AES-GCM ciphertext (base64) */
  ciphertext: string
}

/**
 * Encrypt a JSON-serializable payload using hybrid encryption.
 *
 * 1. Serializes payload to JSON bytes
 * 2. Generates random AES-256-GCM key + IV
 * 3. Encrypts payload with AES-GCM
 * 4. Encrypts the AES key with RSA-OAEP (public key)
 * 5. Returns: { encryptedKey (AES key, RSA-encrypted), iv, tag, ciphertext }
 *
 * @param publicKey  The parent's RSA public key
 * @param payload    Any JSON-serializable value
 */
export async function encryptPayload(
  publicKey: CryptoKey,
  payload: unknown,
): Promise<EncryptedBundle> {
  // 1. Serialize
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))

  // 2. AES-GCM key + IV
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 3. Encrypt payload with AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext,
  )

  // AES-GCM appends the tag to the ciphertext — split them
  // Tag is always 16 bytes for GCM
  const encryptedArray = new Uint8Array(encrypted)
  const tag = encryptedArray.slice(encryptedArray.length - 16)
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16)

  // 4. Encrypt AES key with RSA-OAEP
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey)
  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawAesKey,
  )

  return {
    encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
    iv: bytesToBase64(iv),
    tag: bytesToBase64(tag),
    ciphertext: bytesToBase64(ciphertext),
  }
}

/**
 * Decrypt a payload previously encrypted with encryptPayload.
 *
 * 1. Decrypts the AES key using RSA-OAEP (private key)
 * 2. Reconstructs the AES-GCM ciphertext (ciphertext + tag)
 * 3. Decrypts the payload
 * 4. Parses and returns the original JSON value
 *
 * @param privateKey  The parent's RSA private key
 * @param bundle      The EncryptedBundle from the server
 */
export async function decryptPayload<T = unknown>(
  privateKey: CryptoKey,
  bundle: EncryptedBundle,
): Promise<T> {
  // 1. Decrypt AES key
  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBytes(bundle.encryptedKey),
  )

  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  )

  // 2. Reconstruct full AES ciphertext (ciphertext + tag)
  const ciphertext = base64ToBytes(bundle.ciphertext)
  const tag = base64ToBytes(bundle.tag)
  const fullCiphertext = new Uint8Array(ciphertext.length + tag.length)
  fullCiphertext.set(ciphertext)
  fullCiphertext.set(tag, ciphertext.length)

  // 3. Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(bundle.iv) },
    aesKey,
    fullCiphertext,
  )

  // 4. Parse
  const json = new TextDecoder().decode(decrypted)
  return JSON.parse(json) as T
}

// ── LocalStorage Key Management (Web MVP) ──────────────────────────────────

const STORAGE_KEY = "hc_provider_keypair"

export type StoredKeyPair = {
  publicKeyHex: string
  privateKeyHex: string
}

/**
 * Load the keypair from localStorage, generating one if none exists.
 * Call once on parent dashboard mount.
 */
export async function loadOrCreateKeypair(): Promise<{
  publicKeyHex: string
  privateKeyHex: string
}> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as StoredKeyPair
    } catch {
      // Corrupted — regenerate
    }
  }

  // Generate fresh keypair
  const keypair = await generateKeyPair()
  const publicKeyHex = await exportPublicKey(keypair.publicKey)
  const privateKeyHex = await exportPrivateKey(keypair.privateKey)

  const data: StoredKeyPair = { publicKeyHex, privateKeyHex }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

/**
 * Get the imported private key from a stored hex string.
 */
export async function getDecryptionKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    const { privateKeyHex } = JSON.parse(stored) as StoredKeyPair
    return importPrivateKey(privateKeyHex)
  } catch {
    return null
  }
}

/**
 * Get the imported public key from a stored hex string.
 */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    const { publicKeyHex } = JSON.parse(stored) as StoredKeyPair
    return importPublicKey(publicKeyHex)
  } catch {
    return null
  }
}

// ── Hex / Base64 Utilities ─────────────────────────────────────────────────

const HEX_CHARS = "0123456789abcdef"

function bytesToHex(bytes: Uint8Array): string {
  let hex = ""
  for (const b of bytes) {
    hex += HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f]
  }
  return hex
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
