/**
 * @file         crypto-utils.test.mjs
 * @description  crypto-utils.js 加密工具模块的单元测试
 * @author       tianxj22
 * @created      2026-06-29
 * @updated      2026-06-29
 * @version      1.0.0
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cryptoUtils = require('../../crypto-utils.js');

describe('crypto-utils', () => {
  const testPath = '/home/user/.config/note-diary';

  describe('deriveKey', () => {
    it('U-52: 相同路径应派生相同密钥', () => {
      const key1 = cryptoUtils.deriveKey(testPath);
      const key2 = cryptoUtils.deriveKey(testPath);
      expect(key1.equals(key2)).toBe(true);
    });

    it('U-53: 不同路径应派生不同密钥', () => {
      const key1 = cryptoUtils.deriveKey('/path/one');
      const key2 = cryptoUtils.deriveKey('/path/two');
      expect(key1.equals(key2)).toBe(false);
    });

    it('U-54: 派生密钥应为 32 字节 (256-bit)', () => {
      const key = cryptoUtils.deriveKey(testPath);
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });
  });

  describe('encryptToken / decryptToken', () => {
    it('U-55: 加密后解密应还原原始明文', () => {
      const plaintext = 'ghp_testTokenValue123456';
      const encrypted = cryptoUtils.encryptToken(plaintext, testPath);
      const decrypted = cryptoUtils.decryptToken(encrypted, testPath);
      expect(decrypted).toBe(plaintext);
    });

    it('U-56: 加密结果应包含 iv/tag/data 三个 hex 字段', () => {
      const encrypted = cryptoUtils.encryptToken('test-token', testPath);
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('data');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.tag).toBe('string');
      expect(typeof encrypted.data).toBe('string');
    });

    it('U-57: 相同明文两次加密结果应不同（随机IV）', () => {
      const plaintext = 'my-secret-token';
      const enc1 = cryptoUtils.encryptToken(plaintext, testPath);
      const enc2 = cryptoUtils.encryptToken(plaintext, testPath);
      // data 字段应不同（因随机IV）
      expect(enc1.data).not.toBe(enc2.data);
      // 但都应能正确解密
      expect(cryptoUtils.decryptToken(enc1, testPath)).toBe(plaintext);
      expect(cryptoUtils.decryptToken(enc2, testPath)).toBe(plaintext);
    });

    it('U-58: 不同 userDataPath 加密的 Token 互不能解密', () => {
      const plaintext = 'cross-machine-token';
      const encrypted = cryptoUtils.encryptToken(plaintext, '/path/machine-a');

      // 用不同路径解密应抛出异常（认证失败）
      expect(() => {
        cryptoUtils.decryptToken(encrypted, '/path/machine-b');
      }).toThrow();
    });

    it('U-59: 空字符串 Token 可正常加解密', () => {
      const encrypted = cryptoUtils.encryptToken('', testPath);
      const decrypted = cryptoUtils.decryptToken(encrypted, testPath);
      expect(decrypted).toBe('');
    });

    it('U-60: 长 Token（典型的 GitHub PAT）可正常加解密', () => {
      // 模拟 GitHub Fine-grained token 长度
      const longToken = 'github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
      const encrypted = cryptoUtils.encryptToken(longToken, testPath);
      const decrypted = cryptoUtils.decryptToken(encrypted, testPath);
      expect(decrypted).toBe(longToken);
    });
  });
});
