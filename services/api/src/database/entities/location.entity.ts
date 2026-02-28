import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { OrgEntity } from './org.entity';
import { AgentPackEntity } from './agent-pack.entity';
import { PhoneNumberEntity } from './phone-number.entity';
import { CallEntity } from './call.entity';

@Entity('locations')
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column()
  name: string;

  @Column({ default: '' })
  address: string;

  @Column({ default: 'America/New_York' })
  timezone: string;

  @Column({ type: 'jsonb', default: '{}' })
  hoursJson: Record<string, { open: string; close: string } | null>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => OrgEntity, (org) => org.locations)
  @JoinColumn({ name: 'orgId' })
  org: OrgEntity;

  @OneToMany(() => AgentPackEntity, (ap) => ap.location)
  agentPacks: AgentPackEntity[];

  @OneToMany(() => PhoneNumberEntity, (pn) => pn.location)
  phoneNumbers: PhoneNumberEntity[];

  @OneToMany(() => CallEntity, (call) => call.location)
  calls: CallEntity[];
}
