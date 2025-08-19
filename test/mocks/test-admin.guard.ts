import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TestAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Mock an admin user for testing
    request.user = {
      id: 1,
      username: 'admin',
      name: 'Administrator',
      admin: true,
    };
    return true;
  }
}