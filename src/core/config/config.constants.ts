import { homedir } from "node:os";
import { resolve } from "node:path/posix";

export const configPath =
  process.env.UIX_CONFIG_PATH || resolve(homedir(), ".homebridge/config.json");

export const storagePath =
  process.env.UIX_STORAGE_PATH || resolve(homedir(), ".homebridge");

export const customPluginPath = process.env.UIX_CUSTOM_PLUGIN_PATH;

export const strictPluginResolution =
  process.env.UIX_STRICT_PLUGIN_RESOLUTION === "1";

/**
 * Legacy secrets storage path, for backwards compatibility
 * @deprecated Secrets should be stored using SecretStoreService
 */
export const secretPath = resolve(storagePath, ".uix-secrets");

export const authPath = resolve(storagePath, "auth.json");

export const accessoryLayoutPath = resolve(
  storagePath,
  "accessories",
  "uiAccessoriesLayout.json"
);

export const configBackupPath = resolve(storagePath, "backups/config-backups");

export const instanceBackupPath = resolve(
  storagePath,
  "backups/instance-backups"
);

export const homebridgeInsecureMode = Boolean(
  process.env.UIX_INSECURE_MODE === "1"
);
