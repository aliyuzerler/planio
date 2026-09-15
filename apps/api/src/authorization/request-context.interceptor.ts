import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import type { AuthorizedRequest } from "./request-authorization-context.interface";
import { RequestContextService } from "./request-context.service";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const authorization = context
      .switchToHttp()
      .getRequest<AuthorizedRequest>().authorization;
    if (!authorization) {
      return next.handle();
    }

    return new Observable((subscriber) =>
      this.requestContext.run(authorization, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
