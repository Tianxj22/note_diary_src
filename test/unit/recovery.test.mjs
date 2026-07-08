/**
 * @file         recovery.test.mjs
 * @description  Unit tests for crash recovery (F-032 auto-save) — recovery JSON read/write/clear
 * @author       tianxj22
 * @created      2026-07-08
 * @version      1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ---- test helpers (replicate main process recovery logic) ----

const tmpDir = path.join(os.tmpdir(), 'nd-recovery-test-' + Date.now());

function writeRecovery(notesDir, data) {
  var recoveryPath = path.join(notesDir, '.recovery.json');
  fs.writeFileSync(recoveryPath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

function readRecovery(notesDir) {
  var recoveryPath = path.join(notesDir, '.recovery.json');
  if (!fs.existsSync(recoveryPath)) return null;
  try {
    var raw = fs.readFileSync(recoveryPath, 'utf-8');
    var data = JSON.parse(raw);
    if (!data || !data.filePath || !data.content) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function clearRecovery(notesDir) {
  var recoveryPath = path.join(notesDir, '.recovery.json');
  if (fs.existsSync(recoveryPath)) {
    fs.unlinkSync(recoveryPath);
  }
  return true;
}

// ---- setup / teardown ----

beforeEach(function () {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
});

afterEach(function () {
  // Clean up recovery file between tests
  var recoveryPath = path.join(tmpDir, '.recovery.json');
  try { if (fs.existsSync(recoveryPath)) fs.unlinkSync(recoveryPath); } catch (_) {}
});

// ---- tests ----

describe('recovery:write', function () {
  it('U-139: writeRecovery creates .recovery.json with valid data', function () {
    var data = {
      filePath: '/tmp/test-note.html',
      content: '<p>hello world</p>',
      title: 'Test Note',
      timestamp: 1719700000000,
    };
    var ok = writeRecovery(tmpDir, data);
    expect(ok).toBe(true);
    var recoveryPath = path.join(tmpDir, '.recovery.json');
    expect(fs.existsSync(recoveryPath)).toBe(true);
    var raw = fs.readFileSync(recoveryPath, 'utf-8');
    var parsed = JSON.parse(raw);
    expect(parsed.filePath).toBe('/tmp/test-note.html');
    expect(parsed.content).toBe('<p>hello world</p>');
    expect(parsed.title).toBe('Test Note');
    expect(parsed.timestamp).toBe(1719700000000);
  });

  it('U-140: writeRecovery overwrites previous recovery data', function () {
    writeRecovery(tmpDir, { filePath: '/a', content: 'first', title: 'A', timestamp: 1 });
    writeRecovery(tmpDir, { filePath: '/b', content: 'second', title: 'B', timestamp: 2 });
    var data = readRecovery(tmpDir);
    expect(data.filePath).toBe('/b');
    expect(data.content).toBe('second');
  });
});

describe('recovery:read', function () {
  it('U-141: readRecovery returns null when no recovery file exists', function () {
    var data = readRecovery(tmpDir);
    expect(data).toBeNull();
  });

  it('U-142: readRecovery returns parsed data when file exists', function () {
    writeRecovery(tmpDir, { filePath: '/tmp/x.html', content: '<p>test</p>', title: 'X', timestamp: 1 });
    var data = readRecovery(tmpDir);
    expect(data).not.toBeNull();
    expect(data.filePath).toBe('/tmp/x.html');
    expect(data.content).toBe('<p>test</p>');
  });

  it('U-143: readRecovery returns null for invalid JSON (do not throw)', function () {
    var recoveryPath = path.join(tmpDir, '.recovery.json');
    fs.writeFileSync(recoveryPath, 'not json{{', 'utf-8');
    var result = readRecovery(tmpDir);
    expect(result).toBeNull();
  });

  it('U-144: readRecovery returns null when missing filePath field', function () {
    writeRecovery(tmpDir, { content: 'test', title: 'X', timestamp: 1 });
    var data = readRecovery(tmpDir);
    expect(data).toBeNull();
  });

  it('U-145: readRecovery returns null when missing content field', function () {
    writeRecovery(tmpDir, { filePath: '/x.html', title: 'X', timestamp: 1 });
    var data = readRecovery(tmpDir);
    expect(data).toBeNull();
  });
});

describe('recovery:clear', function () {
  it('U-146: clearRecovery removes .recovery.json', function () {
    writeRecovery(tmpDir, { filePath: '/tmp/x.html', content: 'test', title: 'X', timestamp: 1 });
    expect(fs.existsSync(path.join(tmpDir, '.recovery.json'))).toBe(true);
    clearRecovery(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.recovery.json'))).toBe(false);
  });

  it('U-147: clearRecovery does not throw when file does not exist', function () {
    expect(function () {
      clearRecovery(tmpDir);
    }).not.toThrow();
  });
});

describe('recovery round-trip', function () {
  it('U-148: full write → read → clear cycle', function () {
    var data = { filePath: '/notes/diary.html', content: '<h1>Diary</h1><p>Today...</p>', title: 'My Diary', timestamp: Date.now() };
    writeRecovery(tmpDir, data);
    var read = readRecovery(tmpDir);
    expect(read.filePath).toBe(data.filePath);
    expect(read.content).toBe(data.content);
    clearRecovery(tmpDir);
    expect(readRecovery(tmpDir)).toBeNull();
  });
});
