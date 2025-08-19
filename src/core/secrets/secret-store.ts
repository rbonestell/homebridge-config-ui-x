import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { KeyChain } from "./keychain";
import { decryptAes, encryptAes } from "../crypto/crypto-utils";
import { readJSONSync, writeJsonSync } from "fs-extra";

export interface SecretsFileFormat {
  version: 1;
  data: Record<string, string>;
  createdAt?: string;
  lastModified?: string;
}

export class SecretStore {
  public readonly keychain: KeyChain;
  private filePath: string;
  private secrets: Record<string, string> = {};
  private baseKey: Buffer;

  constructor(
    keychain: KeyChain,
    storagePath: string,
    uniqueID: string,
    pluginName?: string
  ) {
    this.keychain = keychain;
    this.baseKey = this.getOrCreateSecretEncryptionKey(pluginName);
    this.setFilePath(storagePath, pluginName);
    this.loadSecretsFromDisk();
  }

  /**
   * Store a secret value under this plugin
   */
  public setSecret(secretName: string, plaintextValue: string): void {
    const encryptedValue = encryptAes(
      this.baseKey,
      Buffer.from(plaintextValue, "utf8")
    );

    if (!this.secrets) {
      this.secrets = {};
    }
    this.secrets[secretName] = encryptedValue.toString("base64");
    this.saveSecretsToDisk();
  }

  /**
   * Load a secret value under this plugin
   */
  public getSecret(secretName: string): string | null {
    if (!this.secrets) {
      return null;
    }
    const encryptedValue = this.secrets[secretName];
    if (!encryptedValue) {
      return null;
    }
    const decryptedValue = decryptAes(
      this.baseKey,
      Buffer.from(encryptedValue, "base64")
    );
    return decryptedValue.toString("utf8");
  }

  /**
   * Delete a secret value under this plugin
   */
  public deleteSecret(secretName: string): void {
    const pluginSecrets = this.secrets;
    if (pluginSecrets && pluginSecrets[secretName]) {
      delete pluginSecrets[secretName];
      this.saveSecretsToDisk();
    }
  }

  /**
   * Set the path to the appropriate secrets file
   * @param pluginName - The name of the plugin for which to get the file path
   * @param storagePath - The path to the secrets file storage directory
   */
  private setFilePath(storagePath: string, pluginName?: string): void {
    if (pluginName) {
      // Normalize the plugin name to be valid for use in a valid filename
      let sanitizedPluginName = pluginName.replace(/[^a-z0-9]/gi, "-");
      sanitizedPluginName = sanitizedPluginName.replace(/-+/g, "-");

      // Store plugin-specific secrets
      this.filePath = path.resolve(
        storagePath,
        `${sanitizedPluginName}-secrets.json`
      );
    } else {
      // Store top-level homebridge secrets
      this.filePath = path.resolve(storagePath, `secrets.json`);
    }
  }

  /**
   * Load secrets from disk if the secrets file exists
   */
  private loadSecretsFromDisk(): void {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    try {
      const fileContent = readJSONSync(this.filePath, { encoding: "utf8" });
      
      // Handle both new format with versioning and legacy format for backward compatibility
      if (fileContent && typeof fileContent === 'object') {
        if (fileContent.version === 1 && fileContent.data) {
          // New format with SecretsFileFormat
          this.secrets = fileContent.data;
        } else if (!fileContent.version && !fileContent.data) {
          // Legacy format - direct object with encrypted secrets
          this.secrets = fileContent;
        } else {
          console.warn(`Unknown secrets file format version: ${fileContent.version}`);
          this.secrets = {};
        }
      } else {
        this.secrets = {};
      }
    } catch (e: any) {
      console.error(`Failed to load secrets: ${e.message}`);
      this.secrets = {};
    }
  }

  /**
   * Save secrets to disk using proper SecretsFileFormat and atomic operations
   */
  private saveSecretsToDisk(): void {
    const now = new Date().toISOString();
    
    // Create properly formatted secrets file
    const secretsFile: SecretsFileFormat = {
      version: 1,
      data: this.secrets,
      createdAt: now, // This will be overwritten on subsequent saves
      lastModified: now,
    };

    // Use atomic file operations for safety
    const tempFileName = `${path.basename(this.filePath)}.${randomUUID()}.tmp`;
    const tempFilePath = path.resolve(path.dirname(this.filePath), tempFileName);

    try {
      // Write to temporary file first
      writeJsonSync(tempFilePath, secretsFile, {
        spaces: 2,
        encoding: "utf8",
      });

      // Atomically rename to final destination
      fs.renameSync(tempFilePath, this.filePath);
    } catch (e: any) {
      console.error(`Failed to save secrets: ${e.message}`);
      
      // Clean up temporary file if it exists
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw e;
    }
  }

  /**
   * Get or create a secret encryption key using KeyChainFactory
   * @param uniqueID Installation-unique identifier which to use in key derivation
   * @returns A Buffer containing the secret encryption key
   */
  private getOrCreateSecretEncryptionKey(pluginName?: string): Buffer {
    const key =
      this.keychain.getKey(pluginName || "homebridge") ??
      this.keychain.createKey(pluginName || "homebridge");
    return key;
  }
}
