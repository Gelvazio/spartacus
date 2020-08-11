import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CxOAuthService } from '../../auth/user-auth/facade/cx-oauth-service';
import {
  InterceptorUtil,
  USE_CUSTOMER_SUPPORT_AGENT_TOKEN,
} from '../../occ/utils/interceptor-util';
import { AsmAuthHeaderService } from '../services/asm-auth.header.service';

const OAUTH_ENDPOINT = '/authorizationserver/oauth/token';

// TODO: Rethink the current naming of this one (different responsibilities)
@Injectable({ providedIn: 'root' })
export class CSAgentTokenInterceptor implements HttpInterceptor {
  constructor(
    protected oAuthService: CxOAuthService,
    protected authHeaderService: AsmAuthHeaderService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const isCSAgentTokenRequest = this.authHeaderService.isCSAgentTokenRequest(
      request
    );
    const hasAuthorizationHeader = this.authHeaderService.getAuthorizationHeader(
      request
    );

    if (!hasAuthorizationHeader && isCSAgentTokenRequest) {
      request = request.clone({
        setHeaders: {
          ...this.authHeaderService.createAuthorizationHeader(
            isCSAgentTokenRequest
          ),
        },
      });
      request = InterceptorUtil.removeHeader(
        USE_CUSTOMER_SUPPORT_AGENT_TOKEN,
        request
      );
    }

    return !isCSAgentTokenRequest
      ? next.handle(request)
      : next.handle(request).pipe(
          catchError((errResponse: any) => {
            if (errResponse instanceof HttpErrorResponse) {
              switch (errResponse.status) {
                case 401: // Unauthorized
                  if (this.isExpiredToken(errResponse)) {
                    return this.authHeaderService.handleExpiredAccessToken(
                      request,
                      next,
                      true
                    );
                  } else if (
                    // Refresh expired token
                    // Check that the OAUTH endpoint was called and the error is for refresh token is expired
                    errResponse.url.includes(OAUTH_ENDPOINT) &&
                    errResponse.error.error === 'invalid_token'
                  ) {
                    this.authHeaderService.handleExpiredRefreshToken(true);
                    return of<HttpEvent<any>>();
                  }

                  break;
                case 400: // Bad Request
                  if (
                    errResponse.url.includes(OAUTH_ENDPOINT) &&
                    errResponse.error.error === 'invalid_grant'
                  ) {
                    if (request.body.get('grant_type') === 'refresh_token') {
                      // refresh token fail, force user logout
                      this.authHeaderService.handleExpiredRefreshToken(true);
                    }
                  }
                  break;
              }
            }
            return throwError(errResponse);
          })
        );
  }

  protected isExpiredToken(resp: HttpErrorResponse): boolean {
    return resp.error?.errors?.[0]?.type === 'InvalidTokenError';
  }
}
