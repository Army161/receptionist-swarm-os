import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrgEntity } from './org.entity';
import { LocationEntity } from './location.entity';

@Entity('agent_packs')
export class AgentPackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column()
  locationId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ default: 'draft' })
  status: string; // 'draft' | 'confirmed' | 'deployed' | 'archived'

  @Column({ type: 'jsonb', default: '{}' })
  configJson: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => OrgEntity)
  @JoinColumn({ name: 'orgId' })
  org: OrgEntity;

  @ManyToOne(() => LocationEntity, (loc) => loc.agentPacks)
  @JoinColumn({ name: 'locationId' })
  location: LocationEntity;
}
