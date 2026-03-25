import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const client = this.supabaseService.getClient();
    
    const { data: user, error } = await client
      .from('portal_users')
      .select('*, portal_agencies(*)')
      .eq('email', email)
      .single();

    if (error || !user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      return null;
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      agencyId: user.agency_id,
      role: user.role 
    };
    
    return {
      access_token: jwt.sign(payload, this.configService.get<string>('JWT_SECRET')!, { expiresIn: '8h' }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        agency: user.portal_agencies,
      }
    };
  }
}
