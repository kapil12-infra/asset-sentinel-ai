import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthResponse, User } from '@asset-sentinel/shared';
import { PrismaService } from '../core/prisma.service';
import { UsersService } from '../core/users.service';
import { LoginDto, RegisterDto, UpdateMeDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private users: UsersService,
  ) {}

  sign(user: { id: string; email: string }): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
    });
    return { token: await this.sign(user), user: this.users.toUser(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { token: await this.sign(user), user: this.users.toUser(user) };
  }

  async me(id: string): Promise<User> {
    return this.users.toUser(await this.users.require(id));
  }

  async updateMe(id: string, dto: UpdateMeDto): Promise<User> {
    const data: UpdateMeDto = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.role !== undefined) data.role = dto.role.trim();
    if (dto.org !== undefined) data.org = dto.org.trim();
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken && taken.id !== id) throw new ConflictException('That email is already in use');
      data.email = email;
    }
    return this.users.toUser(await this.prisma.user.update({ where: { id }, data }));
  }

  async upsertOAuthUser(email: string, name: string, provider: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) return existing;
    return this.prisma.user.create({ data: { email: normalized, name, provider } });
  }
}
