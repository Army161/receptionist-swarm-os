import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { OrgEntity } from './org.entity';
import { LocationEntity } from './location.entity';
import { CallTranscriptEntity } from './call-transcript.entity';
import { ToolRunEntity } from './tool-run.entity';

@Entity('calls')
export class CallEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column()
  locationId: string;

  @Column({ default: '' })
  providerCallId: string;

  @Column({ default: '' })
  callerNumber: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date;

  @Column({ default: 'abandoned' })
  outcome: string; // CallOutcome enum values

  @Column({ type: 'jsonb', default: '{}' })
  metricsJson: Record<string, any>;

  @ManyToOne(() => OrgEntity)
  @JoinColumn({ name: 'orgId' })
  org: OrgEntity;

  @ManyToOne(() => LocationEntity, (loc) => loc.calls)
  @JoinColumn({ name: 'locationId' })
  location: LocationEntity;

  @OneToOne(() => CallTranscriptEntity, (t) => t.call)
  transcript: CallTranscriptEntity;

  @OneToMany(() => ToolRunEntity, (tr) => tr.call)
  toolRuns: ToolRunEntity[];
}
