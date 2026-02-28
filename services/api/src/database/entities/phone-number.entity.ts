import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrgEntity } from './org.entity';
import { LocationEntity } from './location.entity';

@Entity('phone_numbers')
export class PhoneNumberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column()
  locationId: string;

  @Column()
  e164: string;

  @Column({ default: 'retell' })
  provider: string;

  @Column({ default: 'call_forwarding' })
  routingMode: string; // 'call_forwarding' | 'number_port' | 'sip_pbx'

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => OrgEntity)
  @JoinColumn({ name: 'orgId' })
  org: OrgEntity;

  @ManyToOne(() => LocationEntity, (loc) => loc.phoneNumbers)
  @JoinColumn({ name: 'locationId' })
  location: LocationEntity;
}
