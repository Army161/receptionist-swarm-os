import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentPackEntity } from '../database/entities/agent-pack.entity';

@Injectable()
export class AgentPacksService {
  constructor(
    @InjectRepository(AgentPackEntity)
    private readonly agentPackRepo: Repository<AgentPackEntity>,
  ) {}

  async findByLocation(locationId: string): Promise<AgentPackEntity[]> {
    return this.agentPackRepo.find({
      where: { locationId },
      order: { version: 'DESC' },
    });
  }

  async findById(id: string): Promise<AgentPackEntity> {
    const pack = await this.agentPackRepo.findOne({ where: { id } });
    if (!pack) throw new NotFoundException('AgentPack not found');
    return pack;
  }

  async getCurrent(locationId: string): Promise<AgentPackEntity | null> {
    return this.agentPackRepo.findOne({
      where: { locationId, isCurrent: true },
    });
  }

  async getNextVersion(locationId: string): Promise<number> {
    const latest = await this.agentPackRepo.findOne({
      where: { locationId },
      order: { version: 'DESC' },
    });
    return latest ? latest.version + 1 : 1;
  }

  async createDraft(orgId: string, locationId: string, configJson: Record<string, any>): Promise<AgentPackEntity> {
    const version = await this.getNextVersion(locationId);
    const pack = this.agentPackRepo.create({
      orgId,
      locationId,
      version,
      status: 'draft',
      configJson,
      isCurrent: false,
    });
    return this.agentPackRepo.save(pack);
  }

  async confirm(id: string, configJson: Record<string, any>): Promise<AgentPackEntity> {
    await this.agentPackRepo.update(id, {
      status: 'confirmed',
      configJson,
    });
    return this.findById(id);
  }

  async deploy(id: string): Promise<AgentPackEntity> {
    const pack = await this.findById(id);

    // Unset current for all other packs in this location
    await this.agentPackRepo.update(
      { locationId: pack.locationId, isCurrent: true },
      { isCurrent: false },
    );

    // Set this pack as current and deployed
    await this.agentPackRepo.update(id, {
      status: 'deployed',
      isCurrent: true,
    });

    return this.findById(id);
  }

  async rollback(locationId: string, targetVersion: number): Promise<AgentPackEntity> {
    const target = await this.agentPackRepo.findOne({
      where: { locationId, version: targetVersion },
    });
    if (!target) throw new NotFoundException(`AgentPack version ${targetVersion} not found`);

    // Unset current for all packs
    await this.agentPackRepo.update(
      { locationId, isCurrent: true },
      { isCurrent: false },
    );

    // Set target as current
    await this.agentPackRepo.update(target.id, {
      isCurrent: true,
      status: 'deployed',
    });

    return this.findById(target.id);
  }
}
