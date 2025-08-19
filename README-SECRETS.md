# Secret Storage Implementation Guide

## Overview

This implementation provides secure storage for sensitive configuration values in Homebridge Config UI X. Secrets are encrypted using AES-256-GCM and stored separately from the main configuration file.

## Features

✅ **Backend Implementation**
- REST API endpoints for secret management
- AES-256-GCM encryption with PBKDF2 key derivation
- Cross-platform system keychain integration (macOS/Windows/Linux)
- Fallback to encrypted file storage
- Plugin-specific secret isolation

✅ **Frontend Integration**
- Automatic detection of `"secret": true` in JSON schemas
- Password field rendering with show/hide toggle
- Secure API integration for secret storage/retrieval
- Visual indicators for encrypted fields
- Automatic secret extraction during config save

✅ **User Experience**
- Clear visual indicators for secret fields
- "Value is securely stored" messaging
- Show/hide password toggles
- Preserved form validation
- Seamless integration with existing plugin config UI

## Usage for Plugin Developers

### 1. Mark Fields as Secret in Schema

Add `"secret": true` to any field in your `config.schema.json`:

```json
{
  "pluginAlias": "MyPlugin",
  "schema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "title": "API Key",
        "type": "string",
        "secret": true,
        "description": "Your secret API key"
      },
      "password": {
        "title": "Password", 
        "type": "string",
        "secret": true
      }
    }
  }
}
```

### 2. Access Secrets in Plugin Code

Use the Homebridge secrets API to retrieve values:

```javascript
// In your plugin constructor
constructor(log, config, api) {
  this.log = log;
  this.api = api;
  
  // Access secret values
  const apiKey = this.api.user.getSecret('myPluginName', 'apiKey');
  const password = this.api.user.getSecret('myPluginName', 'password');
}
```

## API Endpoints

### Store Secret
```
POST /api/secrets/:pluginName/:secretName
Body: { "value": "secret-value" }
```

### Retrieve Secret
```
GET /api/secrets/:pluginName/:secretName
Response: { "success": true, "value": "secret-value" }
```

### Delete Secret
```
DELETE /api/secrets/:pluginName/:secretName
Response: { "success": true, "message": "Secret deleted successfully" }
```

### Homebridge-Level Secrets
```
POST /api/secrets/:secretName
GET /api/secrets/:secretName  
DELETE /api/secrets/:secretName
```

## Security Features

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-512
- **System Keychain Integration**: Uses OS native keychains when available
- **Plugin Isolation**: Each plugin's secrets are stored separately
- **Atomic File Operations**: Prevents corruption during writes
- **Authentication Required**: All API endpoints require admin authentication

## File Locations

- **System Keychain**: Used when available (preferred)
- **Encrypted Files**: `<storage>/secrets.json` (Homebridge-level)
- **Plugin Secrets**: `<storage>/persist/<plugin>-secrets.json`
- **Encryption Keys**: Stored in system keychain or `<storage>/keychain.json`

## Testing

### Run E2E Tests
```bash
npm run test:e2e secrets.e2e-spec.ts
```

### Test with Mock Plugin
The included mock plugin (`homebridge-mock-plugin-with-secrets`) demonstrates:
- Basic secret fields
- Nested secret properties  
- Array items with secrets
- Mixed secret/non-secret configurations

### Manual Testing
1. Install the mock plugin
2. Configure it through the UI
3. Verify secrets are stored encrypted
4. Check that config.json doesn't contain secret values
5. Test secret retrieval and updates

## Migration

Existing configurations with sensitive data should be migrated:

1. Edit plugin configuration through the UI
2. Re-enter sensitive values in fields marked as secret
3. Save configuration
4. Verify secrets are now encrypted and removed from config.json

## Troubleshooting

### Common Issues

**Secret fields not detected:**
- Verify `"secret": true` is set in schema
- Check JSON schema syntax
- Ensure plugin name matches exactly

**Encryption errors:**
- Check system keychain availability
- Verify filesystem permissions for storage directory
- Review logs for detailed error messages

**API authentication errors:**
- Ensure user has admin privileges
- Check authentication token validity
- Verify request headers include proper authorization

### Debug Logging

Enable debug logging to troubleshoot issues:
```bash
DEBUG=homebridge:secrets npm start
```

## Implementation Notes

### Backend Architecture
- `SecretsController`: REST API endpoints
- `SecretStoreService`: Business logic layer  
- `SecretStore`: Encryption and file operations
- `KeyChainService`: Key management
- `KeyChain`: System keychain abstraction

### Frontend Architecture
- `SecretsService`: API client service
- `SchemaFormComponent`: Enhanced form rendering
- `PluginConfigComponent`: Config save/load integration
- `SecretFieldComponent`: UI component for secret fields

### Security Considerations
- Secrets are never logged or exposed in responses
- Memory is cleared after encryption/decryption
- Failed operations don't leak information
- Rate limiting should be implemented for production use
- Regular key rotation is recommended for high-security environments

## Future Enhancements

Potential improvements for future versions:
- Bulk secret operations
- Secret sharing between plugins
- Backup/restore for encrypted secrets
- Key rotation utilities
- Integration with external secret management systems
- Audit logging for secret access