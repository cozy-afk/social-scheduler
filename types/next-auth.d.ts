import 'next-auth';
import { UserRole } from './models';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      agencyId?: string;
      discordId?: string;
    };
  }
}
