import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { CallEntity } from './call.entity';

@Entity('call_transcripts')
export class CallTranscriptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  callId: string;

  @Column({ type: 'text', default: '' })
  transcriptText: string;

  @Column({ type: 'text', default: '' })
  redactedText: string;

  @Column({ type: 'jsonb', default: '{}' })
  structuredJson: Record<string, any>;

  @OneToOne(() => CallEntity, (call) => call.transcript)
  @JoinColumn({ name: 'callId' })
  call: CallEntity;
}
