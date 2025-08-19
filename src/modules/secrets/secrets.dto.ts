import { IsOptional, IsString, MinLength } from 'class-validator';

export class SetSecretDto {
  @IsString()
  @MinLength(1)
  secretName: string;

  @IsString()
  @MinLength(1)
  value: string;

  @IsOptional()
  @IsString()
  pluginName?: string;
}

export class SetSecretBodyDto {
  @IsString()
  @MinLength(1)
  value: string;
}

export class GetSecretDto {
  @IsString()
  @MinLength(1)
  secretName: string;

  @IsOptional()
  @IsString()
  pluginName?: string;
}

export class DeleteSecretDto {
  @IsString()
  @MinLength(1)
  secretName: string;

  @IsOptional()
  @IsString()
  pluginName?: string;
}

export interface SecretResponseDto {
  success: boolean;
  message?: string;
  value?: string;
}