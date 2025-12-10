// Utility để encrypt/decrypt password (có thể decrypt được)
const crypto = require('crypto');

// Lấy encryption key từ environment variable hoặc dùng default
const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!'; // Phải 32 ký tự
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt password (có thể decrypt được)
 */
function encryptPassword(password) {
  try {
    // Tạo IV (Initialization Vector) ngẫu nhiên
    const iv = crypto.randomBytes(16);
    
    // Tạo cipher
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    
    // Encrypt password
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Kết hợp IV và encrypted data (IV:encrypted)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
}
/**
 * Decrypt password
 */
function decryptPassword(encryptedPassword) {
  try {
    // Tách IV và encrypted data
    const parts = encryptedPassword.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted password format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Tạo decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    
    // Decrypt password
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
}

/**
 * Kiểm tra xem string có phải là encrypted format không
 */
function isEncrypted(str) {
  return str && str.includes(':') && str.split(':').length === 2;
}

module.exports = {
  encryptPassword,
  decryptPassword,
  isEncrypted
};

