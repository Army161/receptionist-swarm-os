import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationEntity } from '../database/entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,
  ) {}

  async findByOrg(orgId: string): Promise<LocationEntity[]> {
    return this.locationRepo.find({ where: { orgId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<LocationEntity> {
    const loc = await this.locationRepo.findOne({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async create(orgId: string, data: Partial<LocationEntity>): Promise<LocationEntity> {
    const loc = this.locationRepo.create({ ...data, orgId });
    return this.locationRepo.save(loc);
  }

  async update(id: string, data: Partial<LocationEntity>): Promise<LocationEntity> {
    await this.locationRepo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.locationRepo.delete(id);
  }
}
