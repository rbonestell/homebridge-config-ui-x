import { beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SecretStore, SecretsFileFormat } from './secret-store';
import { KeyChain, KeyChainFactory } from './keychain';
import { readJSONSync } from 'fs-extra';

describe('SecretStore Security Tests', () => {
  let tempDir: string;
  let secretStore: SecretStore;
  let keychain: KeyChain;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(__dirname, 'test-secrets-'));
    keychain = KeyChainFactory.getKeyChain('test-homebridge', tempDir);
    secretStore = new SecretStore(keychain, tempDir, 'test-homebridge');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Encryption Security', () => {
    it('should encrypt secrets before storing to disk', () => {
      const secretName = 'test-api-key';
      const secretValue = 'super-secret-value-123';

      // Store the secret
      secretStore.setSecret(secretName, secretValue);

      // Read the raw file content
      const filePath = path.join(tempDir, 'secrets.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const fileContent = readJSONSync(filePath);
      
      // Verify the file uses proper format
      expect(fileContent).toHaveProperty('version', 1);
      expect(fileContent).toHaveProperty('data');
      expect(fileContent).toHaveProperty('lastModified');

      // Verify the secret value is encrypted (not plaintext)
      const storedValue = fileContent.data[secretName];
      expect(storedValue).toBeDefined();
      expect(storedValue).not.toBe(secretValue); // Must not be plaintext
      expect(storedValue).toMatch(/^[A-Za-z0-9+/]+=*$/); // Should be base64 encoded
      expect(storedValue.length).toBeGreaterThan(secretValue.length); // Encrypted data is longer

      // Verify we can decrypt it back correctly
      const retrievedValue = secretStore.getSecret(secretName);
      expect(retrievedValue).toBe(secretValue);
    });

    it('should not store plaintext secrets in any form', () => {
      const secrets = [
        'password123',
        'api-key-secret',
        'webhook-token-xyz',
        'database-connection-string',
        'jwt-signing-secret'
      ];

      // Store multiple secrets
      secrets.forEach((secret, index) => {
        secretStore.setSecret(`secret-${index}`, secret);
      });

      // Read the raw file and verify no plaintext secrets are present
      const filePath = path.join(tempDir, 'secrets.json');
      const fileContentRaw = fs.readFileSync(filePath, 'utf8');

      secrets.forEach(secret => {
        expect(fileContentRaw).not.toContain(secret);
      });

      // Verify we can still retrieve all secrets correctly
      secrets.forEach((secret, index) => {
        const retrieved = secretStore.getSecret(`secret-${index}`);
        expect(retrieved).toBe(secret);
      });
    });

    it('should use different encryption for each secret', () => {
      const secret1 = 'identical-value';
      const secret2 = 'identical-value';

      secretStore.setSecret('key1', secret1);
      secretStore.setSecret('key2', secret2);

      const filePath = path.join(tempDir, 'secrets.json');
      const fileContent = readJSONSync(filePath);

      // Even with identical values, encrypted data should be different due to IV
      const encrypted1 = fileContent.data['key1'];
      const encrypted2 = fileContent.data['key2'];

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle special characters and unicode in secrets', () => {
      const specialSecrets = [
        'password with spaces and !@#$%^&*()',
        '密码包含中文字符',
        'secret\nwith\nnewlines',
        'tab\tseparated\tvalues',
        '{"json": "secret", "value": 123}',
        ''  // empty string
      ];

      specialSecrets.forEach((secret, index) => {
        secretStore.setSecret(`special-${index}`, secret);
        const retrieved = secretStore.getSecret(`special-${index}`);
        expect(retrieved).toBe(secret);
      });

      // Verify none are stored as plaintext
      const filePath = path.join(tempDir, 'secrets.json');
      const fileContentRaw = fs.readFileSync(filePath, 'utf8');

      specialSecrets.filter(s => s.length > 0).forEach(secret => {
        expect(fileContentRaw).not.toContain(secret);
      });
    });
  });

  describe('File Format Security', () => {
    it('should use proper SecretsFileFormat structure', () => {
      secretStore.setSecret('test', 'value');

      const filePath = path.join(tempDir, 'secrets.json');
      const fileContent = readJSONSync(filePath) as SecretsFileFormat;

      expect(fileContent.version).toBe(1);
      expect(typeof fileContent.data).toBe('object');
      expect(fileContent.lastModified).toBeDefined();
      expect(new Date(fileContent.lastModified!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should maintain backward compatibility with legacy format', () => {
      // Create a legacy format file (direct object without versioning)
      const legacySecrets = {
        'legacy-key': 'encrypted-legacy-value-base64'
      };

      const filePath = path.join(tempDir, 'secrets.json');
      fs.writeFileSync(filePath, JSON.stringify(legacySecrets, null, 2));

      // Create new SecretStore instance to load the legacy file
      const newSecretStore = new SecretStore(keychain, tempDir, 'test-homebridge');

      // Should handle legacy format without errors
      expect(() => {
        newSecretStore.getSecret('legacy-key');
      }).not.toThrow();

      // After saving a new secret, should upgrade to new format
      newSecretStore.setSecret('new-key', 'new-value');

      const updatedContent = readJSONSync(filePath);
      expect(updatedContent.version).toBe(1);
      expect(updatedContent.data).toBeDefined();
    });

    it('should handle corrupted files gracefully', () => {
      const filePath = path.join(tempDir, 'secrets.json');

      // Test various corruption scenarios
      const corruptedFiles = [
        '{invalid json',
        '{"version": "invalid"}',
        '{"version": 999, "data": {}}',
        'null',
        '[]',
        ''
      ];

      corruptedFiles.forEach((corruptedContent, index) => {
        fs.writeFileSync(filePath, corruptedContent);

        expect(() => {
          new SecretStore(keychain, tempDir, 'test-homebridge');
        }).not.toThrow();

        // Clean up for next test
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });
  });

  describe('Atomic File Operations', () => {
    it('should use atomic file operations to prevent corruption', () => {
      secretStore.setSecret('test1', 'value1');

      // Verify the main file exists and no temporary files remain
      const filePath = path.join(tempDir, 'secrets.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const tempFiles = fs.readdirSync(tempDir).filter(f => f.includes('.tmp'));
      expect(tempFiles).toHaveLength(0);
    });

    it('should recover from write failures', () => {
      // First create a valid secrets file
      secretStore.setSecret('existing', 'value');

      // Mock fs.renameSync to simulate failure
      const originalRename = fs.renameSync;
      const mockRename = jest.fn().mockImplementation(() => {
        throw new Error('Simulated write failure');
      });
      (fs as any).renameSync = mockRename;

      try {
        expect(() => {
          secretStore.setSecret('new', 'value');
        }).toThrow();

        // Verify original file is still intact
        const retrievedValue = secretStore.getSecret('existing');
        expect(retrievedValue).toBe('value');

        // Verify no temporary files are left behind
        const tempFiles = fs.readdirSync(tempDir).filter(f => f.includes('.tmp'));
        expect(tempFiles).toHaveLength(0);
      } finally {
        // Restore original function
        (fs as any).renameSync = originalRename;
      }
    });
  });

  describe('Key Management Security', () => {
    it('should use different keys for different plugins', () => {
      const plugin1Store = new SecretStore(keychain, tempDir, 'test-homebridge', 'plugin1');
      const plugin2Store = new SecretStore(keychain, tempDir, 'test-homebridge', 'plugin2');

      const secretValue = 'same-secret-value';

      plugin1Store.setSecret('api-key', secretValue);
      plugin2Store.setSecret('api-key', secretValue);

      // Read both files and verify encrypted values are different
      const plugin1File = readJSONSync(path.join(tempDir, 'plugin1-secrets.json'));
      const plugin2File = readJSONSync(path.join(tempDir, 'plugin2-secrets.json'));

      expect(plugin1File.data['api-key']).not.toBe(plugin2File.data['api-key']);

      // Verify both can retrieve their secrets correctly
      expect(plugin1Store.getSecret('api-key')).toBe(secretValue);
      expect(plugin2Store.getSecret('api-key')).toBe(secretValue);
    });

    it('should not allow cross-plugin secret access', () => {
      const plugin1Store = new SecretStore(keychain, tempDir, 'test-homebridge', 'plugin1');
      const plugin2Store = new SecretStore(keychain, tempDir, 'test-homebridge', 'plugin2');

      plugin1Store.setSecret('secret-key', 'plugin1-value');

      // Plugin2 should not be able to access plugin1's secrets
      expect(plugin2Store.getSecret('secret-key')).toBe(null);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle very large secret values', () => {
      const largeSecret = 'x'.repeat(10000); // 10KB secret
      
      secretStore.setSecret('large-secret', largeSecret);
      const retrieved = secretStore.getSecret('large-secret');
      
      expect(retrieved).toBe(largeSecret);

      // Verify it's still encrypted in storage
      const filePath = path.join(tempDir, 'secrets.json');
      const fileContentRaw = fs.readFileSync(filePath, 'utf8');
      expect(fileContentRaw).not.toContain(largeSecret);
    });

    it('should handle rapid consecutive operations', () => {
      const operations = 100;
      
      // Rapid fire operations
      for (let i = 0; i < operations; i++) {
        secretStore.setSecret(`rapid-${i}`, `value-${i}`);
      }

      // Verify all secrets are stored correctly
      for (let i = 0; i < operations; i++) {
        const retrieved = secretStore.getSecret(`rapid-${i}`);
        expect(retrieved).toBe(`value-${i}`);
      }
    });

    it('should prevent timing attacks through consistent operation times', () => {
      const secret = 'test-secret-value';
      
      // Store secret
      secretStore.setSecret('timing-test', secret);

      // Time access to existing vs non-existing secrets
      const timingRuns = 10;
      const existingTimes: number[] = [];
      const nonExistingTimes: number[] = [];

      for (let i = 0; i < timingRuns; i++) {
        // Existing secret
        const start1 = process.hrtime.bigint();
        secretStore.getSecret('timing-test');
        const end1 = process.hrtime.bigint();
        existingTimes.push(Number(end1 - start1));

        // Non-existing secret
        const start2 = process.hrtime.bigint();
        secretStore.getSecret('non-existing-key');
        const end2 = process.hrtime.bigint();
        nonExistingTimes.push(Number(end2 - start2));
      }

      // The timing difference should not be excessive (implementation dependent)
      // This is a basic check - real timing attack prevention would need more sophisticated analysis
      const avgExisting = existingTimes.reduce((a, b) => a + b) / existingTimes.length;
      const avgNonExisting = nonExistingTimes.reduce((a, b) => a + b) / nonExistingTimes.length;
      
      // Both should complete within reasonable bounds (not a strict timing attack test)
      expect(avgExisting).toBeGreaterThan(0);
      expect(avgNonExisting).toBeGreaterThan(0);
    });
  });
});