import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { KnowledgeChunkEntity } from './knowledge-chunk.entity';

@Entity('knowledge_docs')
export class KnowledgeDocEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orgId: string;

  @Column()
  locationId: string;

  @Column({ default: 'website' })
  sourceType: string; // 'website' | 'upload' | 'gbp' | 'manual'

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  rawText: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => KnowledgeChunkEntity, (chunk) => chunk.doc)
  chunks: KnowledgeChunkEntity[];
}
