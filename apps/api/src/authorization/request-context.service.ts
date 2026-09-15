import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type {
  RequestAuthorizationContext,
  TenantMembershipContext,
} from "./request-authorization-context.interface";

@Injectable()
export class RequestContextService {
  private readonly storage =
    new AsyncLocalStorage<RequestAuthorizationContext>();

  run<T>(context: RequestAuthorizationContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): RequestAuthorizationContext | undefined {
    return this.storage.getStore();
  }

  requireTenant(): TenantMembershipContext {
    const tenant = this.get()?.tenant;
    if (!tenant) {
      throw new InternalServerErrorException({
        message: "Tenant context is required for this operation.",
        code: "TENANT_CONTEXT_UNAVAILABLE",
      });
    }
    return tenant;
  }
}
