import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type {
  AuthorizedRequest,
  RequestAuthorizationContext,
} from "./request-authorization-context.interface";

export const CurrentAuthorization = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestAuthorizationContext => {
    const authorization = context
      .switchToHttp()
      .getRequest<AuthorizedRequest>().authorization;

    if (!authorization) {
      throw new Error("Authorization context is unavailable.");
    }
    return authorization;
  },
);
