import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CallEntity } from '../database/entities/call.entity';
import { CallTranscriptEntity } from '../database/entities/call-transcript.entity';
import { ToolRunEntity } from '../database/entities/tool-run.entity';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(CallEntity)
    private readonly callRepo: Repository<CallEntity>,
    @InjectRepository(CallTranscriptEntity)
    private readonly transcriptRepo: Repository<CallTranscriptEntity>,
    @InjectRepository(ToolRunEntity)
    private readonly toolRunRepo: Repository<ToolRunEntity>,
  ) {}

  async findByLocation(locationId: string, from?: string, to?: string, limit = 50, offset = 0) {
    const where: any = { locationId };
    if (from && to) {
      where.startedAt = Between(new Date(from), new Date(to));
    }
    const [calls, total] = await this.callRepo.findAndCount({
      where,
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { calls, total };
  }

  async findByOrg(orgId: string, from?: string, to?: string, limit = 50, offset = 0) {
    const where: any = { orgId };
    if (from && to) {
      where.startedAt = Between(new Date(from), new Date(to));
    }
    const [calls, total] = await this.callRepo.findAndCount({
      where,
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { calls, total };
  }

  async findById(id: string): Promise<CallEntity> {
    const call = await this.callRepo.findOne({
      where: { id },
      relations: ['transcript', 'toolRuns'],
    });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async createCall(data: Partial<CallEntity>): Promise<CallEntity> {
    const call = this.callRepo.create(data);
    return this.callRepo.save(call);
  }

  async updateCall(id: string, data: Partial<CallEntity>): Promise<CallEntity> {
    await this.callRepo.update(id, data);
    return this.findById(id);
  }

  async createTranscript(data: Partial<CallTranscriptEntity>): Promise<CallTranscriptEntity> {
    const transcript = this.transcriptRepo.create(data);
    return this.transcriptRepo.save(transcript);
  }

  async createToolRun(data: Partial<ToolRunEntity>): Promise<ToolRunEntity> {
    const toolRun = this.toolRunRepo.create(data);
    return this.toolRunRepo.save(toolRun);
  }

  async getTranscript(callId: string): Promise<CallTranscriptEntity | null> {
    return this.transcriptRepo.findOne({ where: { callId } });
  }

  async getToolRuns(callId: string): Promise<ToolRunEntity[]> {
    return this.toolRunRepo.find({ where: { callId }, order: { createdAt: 'ASC' } });
  }
}
