import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Observable, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private auth       = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private socket?: Socket;

  private ensure(): Socket | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    if (!this.socket) this.socket = io(environment.socketUrl, { transports: ['websocket'] });
    return this.socket;
  }

  joinStaffRoom() {
    const s = this.ensure();
    const token = this.auth.token();
    if (s && token) s.emit('staff:join', token);
  }

  joinSession(sessionToken: string) {
    this.ensure()?.emit('session:join', sessionToken);
  }

  joinCustomerRoom(customerToken: string) {
    this.ensure()?.emit('customer:join', customerToken);
  }

  on<T>(event: string): Observable<T> {
    const s = this.ensure();
    if (!s) return EMPTY;
    return new Observable<T>((sub) => {
      const handler = (payload: T) => sub.next(payload);
      s.on(event, handler);
      return () => s.off(event, handler);
    });
  }
}
