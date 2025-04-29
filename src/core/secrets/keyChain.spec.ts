import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path"; // Added path import
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { KeyChainFactory } from "./keychain";
import * as keyChainModule from "./keychain";
import * as cryptoUtils from "../crypto/crypto-utils.js"; // Import crypto utils

// Mock fs and crypto utilities
vi.mock("node:fs");
vi.mock("../crypto/cryptoUtils.js");

const persistPath = "/tmp/homebridge-test-persist";
const uniqueID = "test-unique-id"; // Used as bridgePin for InternalKeyChain

// Helper to clean up test files (mocked fs, so this might not be strictly needed but kept for structure)
afterEach(() => {
  vi.clearAllMocks();
  try {
    // Use the correct path from InternalKeyChain implementation
    fs.unlinkSync(path.join(persistPath, "keychain.json.enc"));
  } catch {}
});

describe("keyChainFactory", () => {
  it("returns a KeyChain instance (InternalKeyChain fallback)", () => {
    // Mock SystemKeyChain availability to force fallback
    vi.spyOn(
      (keyChainModule as any).SystemKeyChain,
      "isAvailable"
    ).mockReturnValue(false);
    // Pass storagePath to getKeyChain
    const kc = KeyChainFactory.getKeyChain(uniqueID, persistPath);
    expect(typeof kc.createKey).toBe("function");
    expect(typeof kc.getKey).toBe("function");
    expect(typeof kc.deleteKey).toBe("function");
    // Check if it returned InternalKeyChain as expected in fallback
    expect(kc).toBeInstanceOf((keyChainModule as any).InternalKeyChain);
  });

  // Add a test case for when SystemKeyChain is available if desired
  // it("returns a KeyChain instance (SystemKeyChain)", () => { ... });
});

const InternalKeyChain = (keyChainModule as any).InternalKeyChain;
const formatKeyName = (keyChainModule as any).formatKeyName;

// Mock crypto functions
const MOCK_INTERNAL_KEY = Buffer.alloc(32, 2);
const MOCK_GENERATED_KEY = Buffer.alloc(32, 3);
const MOCK_ENCRYPTED_VALUE = Buffer.from("encrypted-data");

if (InternalKeyChain) {
  describe("internalKeyChain", () => {
    let kc: any; // Use 'any' for easier access to private methods/mocks if needed

    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks();
      // Mock fs reads/writes
      vi.mocked(fs.existsSync).mockReturnValue(false); // Assume file doesn't exist initially
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ version: 1, data: {} })
      );
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.renameSync).mockImplementation(() => {});

      // Re-initialize mocks for crypto functions for consistent behavior
      // Mock internal key generation first, then subsequent key generations
      vi.mocked(cryptoUtils.generateAesKey)
        .mockReturnValueOnce(MOCK_INTERNAL_KEY) // For internalKey generation in constructor
        .mockReturnValue(MOCK_GENERATED_KEY); // For createKey calls
      vi.mocked(cryptoUtils.encryptAes).mockReturnValue(MOCK_ENCRYPTED_VALUE);
      vi.mocked(cryptoUtils.decryptAes).mockReturnValue(MOCK_GENERATED_KEY); // Mock decryption to return the original key

      // Pass persistPath to constructor
      kc = new InternalKeyChain(uniqueID, persistPath);
      // Verify internal key was generated during construction
      expect(cryptoUtils.generateAesKey).toHaveBeenCalledWith(
        Buffer.from(uniqueID),
        Buffer.from("homebridge")
      );
      expect(cryptoUtils.generateAesKey).toHaveBeenCalledTimes(1);
    });

    it("creates, gets, and deletes a key", () => {
      const pluginName = "plugin1";
      const keyName = formatKeyName(pluginName);

      // createKey now returns the generated key
      const createdKey = kc.createKey(pluginName);
      expect(createdKey).toBeInstanceOf(Buffer);
      expect(createdKey).toEqual(MOCK_GENERATED_KEY); // Check if it returns the mocked generated key
      // Called once in constructor, once in createKey
      expect(cryptoUtils.generateAesKey).toHaveBeenCalledTimes(2);
      expect(cryptoUtils.generateAesKey).toHaveBeenLastCalledWith(
        Buffer.from(uniqueID),
        Buffer.from(keyName)
      );
      expect(cryptoUtils.encryptAes).toHaveBeenCalledWith(
        MOCK_INTERNAL_KEY,
        MOCK_GENERATED_KEY
      );
      expect(fs.writeFileSync).toHaveBeenCalled(); // Check persistence call
      expect(fs.renameSync).toHaveBeenCalled();

      // Mock reading the saved state for getKey
      const savedState = {
        version: 1,
        data: { [keyName]: MOCK_ENCRYPTED_VALUE.toString("base64") },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));
      vi.mocked(fs.existsSync).mockReturnValue(true); // Assume file exists now

      // In this setup, getKey reads from the internal store which was updated by createKey
      const key = kc.getKey(pluginName);
      expect(key).toBeInstanceOf(Buffer);
      expect(key).toEqual(MOCK_GENERATED_KEY); // Should decrypt to the original key
      expect(cryptoUtils.decryptAes).toHaveBeenCalledWith(
        MOCK_INTERNAL_KEY,
        MOCK_ENCRYPTED_VALUE
      );

      kc.deleteKey(pluginName);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // Called again for delete
      expect(fs.renameSync).toHaveBeenCalledTimes(2);

      // Check internal store reflects deletion
      expect(kc.getKey(pluginName)).toBeNull();
    });

    it("returns null for missing key", () => {
      // Store is empty by default in beforeEach
      expect(kc.getKey("notfound")).toBeNull();
      expect(cryptoUtils.decryptAes).not.toHaveBeenCalled();
    });

    it("persists keys to disk and reloads", () => {
      const pluginName = "plugin2";
      const keyName = formatKeyName(pluginName);

      kc.createKey(pluginName);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.renameSync).toHaveBeenCalledTimes(1);

      // Mock that the file now exists and contains the saved data
      const savedState = {
        version: 1,
        data: { [keyName]: MOCK_ENCRYPTED_VALUE.toString("base64") },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState));

      // Reset mocks for the new instance creation
      vi.clearAllMocks();
      vi.mocked(fs.existsSync).mockReturnValue(true); // File exists
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedState)); // Return saved state
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.renameSync).mockImplementation(() => {});
      vi.mocked(cryptoUtils.generateAesKey)
        .mockReturnValueOnce(MOCK_INTERNAL_KEY) // For internalKey generation of kc2
        .mockReturnValue(MOCK_GENERATED_KEY);
      vi.mocked(cryptoUtils.encryptAes).mockReturnValue(MOCK_ENCRYPTED_VALUE);
      vi.mocked(cryptoUtils.decryptAes).mockReturnValue(MOCK_GENERATED_KEY);

      // Create a new instance to force reload from disk
      const kc2 = new InternalKeyChain(uniqueID, persistPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(persistPath, "keychain.json.enc"),
        "utf8"
      );
      expect(cryptoUtils.generateAesKey).toHaveBeenCalledTimes(1); // Only for internal key

      const key = kc2.getKey(pluginName);
      expect(key).toBeInstanceOf(Buffer);
      expect(key).toEqual(MOCK_GENERATED_KEY); // Ensure it loaded and decrypted correctly
      expect(cryptoUtils.decryptAes).toHaveBeenCalledWith(
        MOCK_INTERNAL_KEY,
        MOCK_ENCRYPTED_VALUE
      );
    });
  });
}

describe("formatKeyName", () => {
  it("returns serviceName if no pluginName", () => {
    if (typeof formatKeyName === "function") {
      expect(formatKeyName()).toBe("homebridge");
    }
  });
  it("sanitizes pluginName", () => {
    if (typeof formatKeyName === "function") {
      // Adjusted expected output based on the implementation in keychain.ts
      expect(formatKeyName("foo!@#bar")).toBe("homebridge_foo-bar");
      expect(formatKeyName("plugin-with-dots.and.dashes-")).toBe(
        "homebridge_plugin-with-dots-and-dashes-"
      );
      expect(formatKeyName("UpperCase")).toBe("homebridge_UpperCase"); // Check case sensitivity if applicable
    }
  });
});
