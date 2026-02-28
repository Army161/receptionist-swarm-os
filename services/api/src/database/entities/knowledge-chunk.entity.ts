import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { KnowledgeDocEntity } from './knowledge-doc.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  docId: string;

  @Column({ type: 'text' })
  chunkText: string;

  // pgvector column — stored as float array, cast to vector in queries
  // For MVP we store as jsonb; upgrade to pgvector extension for production
  @Column({ type: 'jsonb', nullable: true })
  embedding: number[];

  @Column({ type: 'jsonb', default: '{}' })
  metadataJson: Record<string, any>;

  @ManyToOne(() => KnowledgeDocEntity, (doc) => doc.chunks)
  @JoinColumn({ name: 'docId' })
  doc: KnowledgeDocEntity;
}
