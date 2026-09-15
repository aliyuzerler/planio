import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  override async canActivate(
    context: Parameters<ThrottlerGuard["canActivate"]>[0],
  ): Promise<boolean> {
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    return super.canActivate(context);
  }
}
