import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CallEntity } from './call.entity';

@Entity('tool_runs')
export class ToolRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  callId: string;

  @Column()
  toolName: string;

  @Column({ type: 'jsonb', default: '{}' })
  inputJson: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  outputJson: Record<string, any>;

  @Column({ default: 'pending' })
  status: string; // 'success' | 'error' | 'pending' | 'skipped'

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CallEntity, (call) => call.toolRuns)
  @JoinColumn({ name: 'callId' })
  call: CallEntity;
}
