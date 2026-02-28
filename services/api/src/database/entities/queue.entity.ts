import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('queues')
export class QueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column()
  locationId: string;

  @Column({ default: 0 })
  activeCount: number;

  @Column({ default: 0 })
  queuedCount: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
