import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../core/auth/guards/admin.guard';
import { SecretStoreService } from '../../core/secrets/secret-store.service';
import {
  DeleteSecretDto,
  GetSecretDto,
  SecretResponseDto,
  SetSecretDto,
  SetSecretBodyDto,
} from './secrets.dto';

@UseGuards(AdminGuard)
@Controller('api/secrets')
export class SecretsController {
  constructor(
    private readonly secretStoreService: SecretStoreService,
    private readonly logger: Logger,
  ) {}

  /**
   * Set a secret value
   * POST /api/secrets/:pluginName/:secretName
   * Body: { value: string }
   */
  @Post(':pluginName/:secretName')
  async setSecret(
    @Param('pluginName') pluginName: string,
    @Param('secretName') secretName: string,
    @Body() body: SetSecretBodyDto,
  ): Promise<SecretResponseDto> {
    try {
      this.secretStoreService.setSecret(secretName, body.value, pluginName);
      this.logger.log(
        `Secret ${secretName} set for plugin ${pluginName}`,
        SecretsController.name,
      );
      return {
        success: true,
        message: 'Secret stored successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to set secret ${secretName} for plugin ${pluginName}: ${error.message}`,
        error.stack,
        SecretsController.name,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get a secret value
   * GET /api/secrets/:pluginName/:secretName
   */
  @Get(':pluginName/:secretName')
  async getSecret(
    @Param('pluginName') pluginName: string,
    @Param('secretName') secretName: string,
  ): Promise<SecretResponseDto> {
    try {
      const value = this.secretStoreService.getSecret(secretName, pluginName);
      if (value === null) {
        return {
          success: false,
          message: 'Secret not found',
        };
      }
      return {
        success: true,
        value,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get secret ${secretName} for plugin ${pluginName}: ${error.message}`,
        error.stack,
        SecretsController.name,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete a secret value
   * DELETE /api/secrets/:pluginName/:secretName
   */
  @Delete(':pluginName/:secretName')
  async deleteSecret(
    @Param('pluginName') pluginName: string,
    @Param('secretName') secretName: string,
  ): Promise<SecretResponseDto> {
    try {
      this.secretStoreService.deleteSecret(secretName, pluginName);
      this.logger.log(
        `Secret ${secretName} deleted for plugin ${pluginName}`,
        SecretsController.name,
      );
      return {
        success: true,
        message: 'Secret deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete secret ${secretName} for plugin ${pluginName}: ${error.message}`,
        error.stack,
        SecretsController.name,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Set a homebridge-level secret
   * POST /api/secrets/:secretName
   * Body: { value: string }
   */
  @Post(':secretName')
  async setHomebridgeSecret(
    @Param('secretName') secretName: string,
    @Body() body: SetSecretBodyDto,
  ): Promise<SecretResponseDto> {
    try {
      this.secretStoreService.setSecret(secretName, body.value);
      this.logger.log(
        `Homebridge secret ${secretName} set`,
        SecretsController.name,
      );
      return {
        success: true,
        message: 'Secret stored successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to set homebridge secret ${secretName}: ${error.message}`,
        error.stack,
        SecretsController.name,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get a homebridge-level secret
   * GET /api/secrets/:secretName
   */
  @Get(':secretName')
  async getHomebridgeSecret(
    @Param('secretName') secretName: string,
  ): Promise<SecretResponseDto> {
    try {
      const value = this.secretStoreService.getSecret(secretName);
      if (value === null) {
        return {
          success: false,
          message: 'Secret not found',
        };
      }
      return {
        success: true,
        value,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get homebridge secret ${secretName}: ${error.message}`,
        error.stack,
        SecretsController.name,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete a homebridge-level secret
   * DELETE /api/secrets/:secretName
   */
  @Delete(':secretName')
  async deleteHomebridgeSecret(
    @Param('secretName') secretName: string,
  ): Promise<SecretResponseDto> {
    try {
      this.secretStoreService.deleteSecret(secretName);
      this.logger.log(
        `Homebridge secret ${secretName} deleted`,
        SecretsController.name,
      );
      return {
        success: true,
        message: 'Secret deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete homebridge secret ${secretName}: ${error.message}`,
        error.stack,
        SecretsController.name,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }
}