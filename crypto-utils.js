/**
 * @file         crypto-utils.js
 * @description  Token 加密工具 — 基于 AES-256-GCM，密钥从 userData 路径派生（机器绑定）
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * 从 userData 路径派生 256-bit 密钥
 * 机器绑定：换机器或 userData 路径变更则密钥变化，原 token 不可解密
 * @param {string} userDataPath - app.getPath('userData')
 * @returns {Buffer} 32 字节密钥
 */
function deriveKey(userDataPath) {
  return crypto.createHash('sha256').update(userDataPath).digest();
}

/**
 * 加密 Token
 * @param {string} plaintext - Token 明文
 * @param {string} userDataPath - userData 路径（用于派生密钥）
 * @returns {{ iv: string, tag: string, data: string }} hex 编码的加密结果
 */
function encryptToken(plaintext, userDataPath) {
  const key = deriveKey(userDataPath);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted,
  };
}

/**
 * 解密 Token
 * @param {{ iv: string, tag: string, data: string }} ciphertext - hex 编码的加密结果
 * @param {string} userDataPath - userData 路径（用于派生密钥）
 * @returns {string} Token 明文
 */
function decryptToken(ciphertext, userDataPath) {
  const key = deriveKey(userDataPath);
  const iv = Buffer.from(ciphertext.iv, 'hex');
  const tag = Buffer.from(ciphertext.tag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext.data, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

module.exports = { encryptToken, decryptToken, deriveKey };
