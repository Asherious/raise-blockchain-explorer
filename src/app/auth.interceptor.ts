import { HttpRequest, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJSQUlTRSIsImlhdCI6MTc0NzM5Njk0NCwiZXhwIjoxNzc4OTMyOTQ0LCJhdWQiOiIiLCJzdWIiOiIifQ.Jc4_uW1rnKQiB7hef8hrtrKHAc07XSG_NZbSl3fkG3g`,
    },
  });
  return next(authReq);
}
