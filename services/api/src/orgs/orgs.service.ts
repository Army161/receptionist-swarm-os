import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgEntity } from '../database/entities/org.entity';

@Injectable()
export class OrgsService {
  constructor(
    @InjectRepository(OrgEntity)
    private readonly orgRepo: Repository<OrgEntity>,
  ) {}

  async findById(id: string): Promise<OrgEntity> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Org not found');
    return org;
  }

  async update(id: string, data: Partial<OrgEntity>): Promise<OrgEntity> {
    await this.orgRepo.update(id, data);
    return this.findById(id);
  }
}
