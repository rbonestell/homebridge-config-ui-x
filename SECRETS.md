# Secrets Management

Homebridge UI provides a secure secrets management system for storing sensitive configuration values like API keys, passwords, and tokens. This system ensures that sensitive data is encrypted and stored separately from the main `config.json` file.

## Overview

The secrets management system consists of:

- **Encrypted Storage**: Secrets are stored in encrypted JSON files using AES-256-GCM encryption
- **Keychain Integration**: Encryption keys are stored securely in the system keychain (macOS/Windows) or filesystem (Linux)
- **API Endpoints**: RESTful API for managing secrets programmatically
- **Plugin Integration**: Plugins can mark configuration fields as secrets for automatic handling

## Architecture

### Storage Layer

Secrets are stored in two locations depending on scope:

- **Homebridge-level secrets**: `~/.homebridge/.uix-secrets` (legacy) or `~/.homebridge/persist/homebridge-secrets.json`
- **Plugin-specific secrets**: `~/.homebridge/persist/{plugin-name}-secrets.json`

### Encryption

- **Algorithm**: AES-256-GCM with authenticated encryption
- **Key Management**: 32-byte keys stored in system keychain or secure filesystem location
- **Format**: Encrypted JSON with metadata including algorithm version and format

### Components

```
SecretStoreService
├── SecretStore (core encryption/decryption)
├── KeyChainService (key management)
└── File I/O with atomic operations
```

## API Reference

### Endpoints

#### Store a Secret
```http
POST /api/secrets/:secretName
POST /api/secrets/:pluginName/:secretName
Content-Type: application/json

{
  "value": "your-secret-value"
}
```

#### Retrieve a Secret
```http
GET /api/secrets/:secretName
GET /api/secrets/:pluginName/:secretName
```

Response:
```json
{
  "success": true,
  "value": "your-secret-value"
}
```

#### Delete a Secret
```http
DELETE /api/secrets/:secretName
DELETE /api/secrets/:pluginName/:secretName
```

### Authentication

All endpoints require admin authentication via JWT token or session authentication.

## Plugin Integration

### Marking Fields as Secrets

Plugin developers can mark configuration fields as secrets in their `config.schema.json`:

```json
{
  "type": "object",
  "properties": {
    "apiKey": {
      "type": "string",
      "title": "API Key",
      "secret": true,
      "description": "Your service API key"
    },
    "password": {
      "type": "string",
      "title": "Password",
      "secret": true,
      "description": "Account password"
    }
  }
}
```

### Programmatic Access

Plugins can access secrets using the Homebridge Config UI X API:

```javascript
// In your plugin
const secretValue = await this.api.getSecret('my-plugin', 'apiKey');
await this.api.setSecret('my-plugin', 'apiKey', 'new-value');
await this.api.deleteSecret('my-plugin', 'apiKey');
```

## Security Features

### Encryption Details

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256-bit (32 bytes)
- **IV/Nonce**: 96-bit random value per encryption
- **Authentication**: Built-in authentication tag prevents tampering

### Key Management

- **macOS**: Keychain Services API
- **Windows**: Windows Credential Manager
- **Linux**: Encrypted file with restricted permissions (0600)

### Security Considerations

- Keys are never stored in plain text in config files
- Secrets are encrypted both at rest and in transit
- Atomic file operations prevent corruption during writes
- Authentication required for all secret operations
- Secrets are automatically excluded from config backups

## File Formats

### Encrypted Secret File Format

```json
{
  "version": "1.0.0",
  "algorithm": "aes-256-gcm",
  "secrets": {
    "secretName": {
      "iv": "base64-encoded-iv",
      "data": "base64-encoded-encrypted-data",
      "authTag": "base64-encoded-auth-tag"
    }
  }
}
```

### Legacy Format Support

The system maintains backward compatibility with the legacy `.uix-secrets` format while automatically migrating to the new JSON format.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run secrets-specific tests
npm test test/e2e/secrets.e2e-spec.ts
```

### Environment Variables

- `UIX_STORAGE_PATH`: Override default storage location
- `UIX_INSECURE_MODE`: Disable encryption for testing (not recommended)

### File Locations

- **Storage**: `$UIX_STORAGE_PATH/persist/`
- **Keys**: System keychain or `$UIX_STORAGE_PATH/.uix-keys` (Linux)
- **Legacy**: `$UIX_STORAGE_PATH/.uix-secrets`

## Migration

### From Legacy Format

The system automatically migrates from the legacy `.uix-secrets` format to the new JSON format on first access. The migration:

1. Reads existing encrypted secrets
2. Converts to new JSON format
3. Preserves encryption and key material
4. Maintains backward compatibility

### Between Versions

Secret format versions are tracked in the JSON metadata. Future format changes will include automatic migration paths.

## Troubleshooting

### Common Issues

**Permission Errors**
```bash
# Ensure proper permissions on storage directory
chmod 700 ~/.homebridge/persist/
```

**Keychain Access Issues (macOS)**
```bash
# Reset keychain if needed
security delete-generic-password -s "Homebridge UI"
```

**Missing Secrets**
- Check file permissions in persist directory
- Verify keychain access for encryption keys
- Check logs for decryption errors

### Debug Logging

Enable debug logging for secrets:

```bash
DEBUG=SecretStore* homebridge
```

## Best Practices

### For Plugin Developers

1. **Mark sensitive fields**: Always mark API keys, passwords, and tokens as secrets
2. **Validate secret values**: Check for empty or invalid secret values
3. **Provide clear descriptions**: Help users understand what each secret is for
4. **Handle missing secrets**: Gracefully handle cases where secrets are not set

### For Users

1. **Regular backups**: While secrets are excluded from config backups, ensure keychain/key files are backed up
2. **Secure access**: Protect access to the Homebridge UI admin interface
3. **Key rotation**: Periodically update API keys and passwords stored as secrets
4. **Monitor logs**: Check logs for any secret-related errors or warnings

## Contributing

When contributing to the secrets management system:

1. **Security first**: All changes must maintain or improve security
2. **Backward compatibility**: Ensure existing secrets continue to work
3. **Test coverage**: Add tests for new functionality
4. **Documentation**: Update this documentation for any API changes

See the main [README.md](README.md) for general contribution guidelines.