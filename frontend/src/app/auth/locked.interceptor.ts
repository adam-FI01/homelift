import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Sends you to the PIN screen when the server says the app is locked. */
export const lockedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && err.error?.title === 'Locked') {
        const here = router.url;
        if (!here.startsWith('/unlock'))
          router.navigate(['/unlock'], { queryParams: { next: here } });
      }
      return throwError(() => err);
    }),
  );
};
