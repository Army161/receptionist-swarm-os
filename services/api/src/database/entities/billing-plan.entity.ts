import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrgEntity } from './org.entity';

@Entity('billing_plans')
export class BillingPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column({ default: 'starter' })
  planName: string;

  @Column({ default: 2 })
  concurrencyLimit: number;

  @Column({ default: 500 })
  minuteAllowance: number;

  @Column({ type: 'jsonb', default: '{}' })
  featureFlagsJson: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => OrgEntity, (org) => org.billingPlans)
  @JoinColumn({ name: 'orgId' })
  org: OrgEntity;
}
