import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CallEntity } from '../database/entities/call.entity';
import { ToolRunEntity } from '../database/entities/tool-run.entity';

export interface AnalyticsKPIs {
  totalCalls: number;
  bookingRate: number;
  leadCaptureRate: number;
  transferRate: number;
  abandonRate: number;
  avgDurationSeconds: number;
  outcomeBreakdown: Record<string, number>;
  callsByDay: { date: string; count: number }[];
  topToolsCalled: { tool: string; count: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CallEntity)
    private readonly callRepo: Repository<CallEntity>,
    @InjectRepository(ToolRunEntity)
    private readonly toolRunRepo: Repository<ToolRunEntity>,
  ) {}

  async getKPIs(orgId: string, locationId?: string, from?: string, to?: string): Promise<AnalyticsKPIs> {
    const where: any = { orgId };
    if (locationId) where.locationId = locationId;
    if (from && to) where.startedAt = Between(new Date(from), new Date(to));

    const calls = await this.callRepo.find({ where, order: { startedAt: 'DESC' } });
    const totalCalls = calls.length;

    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        bookingRate: 0,
        leadCaptureRate: 0,
        transferRate: 0,
        abandonRate: 0,
        avgDurationSeconds: 0,
        outcomeBreakdown: {},
        callsByDay: [],
        topToolsCalled: [],
      };
    }

    // Outcome breakdown
    const outcomeBreakdown: Record<string, number> = {};
    for (const call of calls) {
      outcomeBreakdown[call.outcome] = (outcomeBreakdown[call.outcome] || 0) + 1;
    }

    // Rates
    const bookingRate = ((outcomeBreakdown['booked'] || 0) / totalCalls) * 100;
    const leadCaptureRate = ((outcomeBreakdown['lead_captured'] || 0) / totalCalls) * 100;
    const transferRate = ((outcomeBreakdown['transferred'] || 0) / totalCalls) * 100;
    const abandonRate = ((outcomeBreakdown['abandoned'] || 0) / totalCalls) * 100;

    // Avg duration
    const durations = calls
      .map((c) => c.metricsJson?.durationSeconds || 0)
      .filter((d) => d > 0);
    const avgDurationSeconds = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Calls by day
    const dayMap: Record<string, number> = {};
    for (const call of calls) {
      const day = call.startedAt.toISOString().split('T')[0];
      dayMap[day] = (dayMap[day] || 0) + 1;
    }
    const callsByDay = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top tools called
    const callIds = calls.map((c) => c.id);
    let topToolsCalled: { tool: string; count: number }[] = [];
    if (callIds.length > 0) {
      const toolRuns = await this.toolRunRepo
        .createQueryBuilder('tr')
        .select('tr.toolName', 'tool')
        .addSelect('COUNT(*)', 'count')
        .where('tr.callId IN (:...callIds)', { callIds })
        .groupBy('tr.toolName')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();
      topToolsCalled = toolRuns.map((r) => ({ tool: r.tool, count: parseInt(r.count) }));
    }

    return {
      totalCalls,
      bookingRate: Math.round(bookingRate * 10) / 10,
      leadCaptureRate: Math.round(leadCaptureRate * 10) / 10,
      transferRate: Math.round(transferRate * 10) / 10,
      abandonRate: Math.round(abandonRate * 10) / 10,
      avgDurationSeconds: Math.round(avgDurationSeconds),
      outcomeBreakdown,
      callsByDay,
      topToolsCalled,
    };
  }
}
