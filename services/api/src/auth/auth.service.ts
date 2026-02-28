import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../database/entities/user.entity';
import { OrgEntity } from '../database/entities/org.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OrgEntity)
    private readonly orgRepo: Repository<OrgEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, orgName: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const org = this.orgRepo.create({ name: orgName });
    await this.orgRepo.save(org);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email,
      passwordHash,
      orgId: org.id,
      role: 'owner',
    });
    await this.userRepo.save(user);

    const token = this.generateToken(user);
    return { user: { id: user.id, email: user.email, orgId: org.id, role: user.role }, token, org };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user: { id: user.id, email: user.email, orgId: user.orgId, role: user.role }, token };
  }

  async validateUser(userId: string) {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  private generateToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
    });
  }
}
