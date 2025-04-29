import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";
import { KeyChain } from "./keychain";
import { decryptAes, encryptAes } from "../crypto/crypto-utils.js";
import { readJSONSync, writeJsonSync } from "fs-extra";

export interface SecretsFileFormat {
  version: 1;
  data: Record<string, string>;
}

export class SecretStore {
  public readonly keychain: KeyChain;
  private filePath: string;
  private secrets: Record<string, string>;
  private baseKey: Buffer;

  constructor(
    keychain: KeyChain,
    storagePath: string,
    uniqueID: string,
    pluginName?: string
  ) {
    this.keychain = keychain;
    this.baseKey = this.keychain.getKey(uniqueID);
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
        `${sanitizedPluginName}-secrets.json.enc`
      );
    } else {
      // Store top-level homebridge secrets
      this.filePath = path.resolve(storagePath, `secrets.json.enc`);
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
      this.secrets = readJSONSync(this.filePath, { encoding: "utf8" });
    } catch (e: any) {
      console.error(`Failed to load secrets: ${e.message}`);
    }
  }

  /**
   * Save secrets to disk
   */
  private saveSecretsToDisk(): void {
    try {
      writeJsonSync(this.filePath, this.secrets, {
        spaces: 2,
        encoding: "utf8",
      });
    } catch (e: any) {
      console.error(`Failed to save secrets: ${e.message}`);
    }
  }
}
