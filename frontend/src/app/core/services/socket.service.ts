import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private auth = inject(AuthService);
  private socket?: Socket;

  private ensure(): Socket {
    if (!this.socket) this.socket = io(environment.socketUrl, { transports: ['websocket'] });
    return this.socket;
  }

  joinStaffRoom() {
    const s = this.ensure();
    const token = this.auth.token();
    if (token) s.emit('staff:join', token);
  }

  joinSession(sessionToken: string) {
    this.ensure().emit('session:join', sessionToken);
  }

  joinCustomerRoom(customerToken: string) {
    this.ensure().emit('customer:join', customerToken);
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((sub) => {
      const s = this.ensure();
      const handler = (payload: T) => sub.next(payload);
      s.on(event, handler);
      return () => s.off(event, handler);
    });
  }
}
