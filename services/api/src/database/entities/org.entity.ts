import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { LocationEntity } from './location.entity';
import { BillingPlanEntity } from './billing-plan.entity';

@Entity('orgs')
export class OrgEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserEntity, (user) => user.org)
  users: UserEntity[];

  @OneToMany(() => LocationEntity, (loc) => loc.org)
  locations: LocationEntity[];

  @OneToMany(() => BillingPlanEntity, (bp) => bp.org)
  billingPlans: BillingPlanEntity[];
}
