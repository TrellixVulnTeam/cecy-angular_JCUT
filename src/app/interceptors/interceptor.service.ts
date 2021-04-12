import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpParams, HttpRequest} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {AuthService} from '../services/auth/auth.service';
import {Token} from '../models/auth/token';
import {Router} from '@angular/router';
import {NgxSpinnerService} from 'ngx-spinner';
import {tryCatch} from 'rxjs/internal-compatibility';
import {URL} from '../../environments/environment';
import {Institution} from '../models/ignug/institution';
import {User} from '../models/auth/user';
import {Role} from '../models/auth/role';

@Injectable({
    providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {

    constructor(private _authService: AuthService, private _router: Router, private _spinner: NgxSpinnerService) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        let headers = new HttpHeaders();
        let params = req.params;
        if (localStorage.getItem('token')) {
            headers = headers.append('Accept', 'application/json')
                .append('Authorization', 'Bearer ' + (JSON.parse(localStorage.getItem('token')) as Token).access_token);
            if (!req.params.has('page')) {
                params = params.append('page', '1');
            }
            if (localStorage.getItem('institution')) {
                params = params.append('institution',
                    (JSON.parse(localStorage.getItem('institution')) as Institution).id.toString());
            }
            if (localStorage.getItem('user')) {
                params = params.append('user',
                    (JSON.parse(localStorage.getItem('user')) as User).id.toString());
            }
            if (localStorage.getItem('role')) {
                params = params.append('role',
                    (JSON.parse(localStorage.getItem('role')) as Role).id.toString());
            }
        } else {
            headers = headers.append('Accept', 'application/json');
            params = params.append('page', '1');
        }
        if (req.url === URL + 'api/logs') {
            return next.handle(req.clone({headers})).pipe(catchError(error => {
                return throwError(error);
            }));
        }
        if (req.url.indexOf('reports') >= 0) {
            return next.handle(req.clone({headers, params, responseType: 'blob'})).pipe(catchError(error => {
                return throwError(error);
            }));
        }
        return next.handle(req.clone({headers, params})).pipe(catchError(error => {
            if (error.status === 401 || error.status === 423) {
                this._authService.removeLogin();
                this._router.navigate(['/auth/login']);
            }

            if (error.status === 403) {
                this._router.navigate(['/auth/login']);
            }
            if (error.status !== 401 && error.status !== 403 && error.status !== 404 && error.status !== 423) {
                this._authService.logs(error);
            }
            return throwError(error);
        }));
    }

    errors(error: HttpErrorResponse) {
        if (error.status === 4030 || error.status === 4040 || error.status === 4230) {
            this._authService.removeLogin();
            this._router.navigate(['/auth/login']);
        }
        this._authService.logs(error);
        return throwError(error);
    }
}
