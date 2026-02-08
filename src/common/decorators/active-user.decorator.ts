import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ActiveUserData {
  sub: string;
  email: string;
  role?: string;
}

/**
 * Decorator to extract the active user from the request
 * Usage: @ActiveUser() user: ActiveUserData
 */
export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: ActiveUserData | undefined = request.user;

    return field ? user?.[field] : user;
  },
);
