import { Injectable, signal } from '@angular/core';
import { AuthResponse, UserRole } from './models';
import { ApiService } from './api.service';
import { storage } from './storage';

const STORAGE_KEY = 'chai_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthResponse | null>(this.restore());

  constructor(private api: ApiService) {}

  get token(): string | null {
    return this.user()?.token ?? null;
  }

  get role(): UserRole | null {
    return this.user()?.role ?? null;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.api.login(email, password);
    this.persist(res);
    return res;
  }

  async register(name: string, email: string, password: string, role: UserRole): Promise<AuthResponse> {
    const res = await this.api.register(name, email, password, role);
    this.persist(res);
    return res;
  }

  logout(): void {
    storage.remove(STORAGE_KEY);
    this.user.set(null);
  }

  private persist(res: AuthResponse): void {
    storage.set(STORAGE_KEY, JSON.stringify(res));
    this.user.set(res);
  }

  private restore(): AuthResponse | null {
    const raw = storage.get(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  }
}
