/**
 * @file         vitest.config.mjs
 * @description  Vitest 测试运行器配置
 * @author       tianxj22
 * @created      2024-06-24
 * @updated      2024-06-24
 * @version      1.0.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.mjs'],
    testTimeout: 15000,
    pool: 'threads',
    fileParallelism: false,
  },
});
