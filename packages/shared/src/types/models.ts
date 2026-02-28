// ── Core Data Model Types ────────────────────────────

export interface Org {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  AGENT_VIEWER = 'agent_viewer',
}

export interface Location {
  id: string;
  orgId: string;
  name: string;
  address: string;
  timezone: string;
  hoursJson: BusinessHours;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHours {
  [day: string]: { open: string; close: string } | null; // null = closed
}

export interface PhoneNumber {
  id: string;
  orgId: string;
  locationId: string;
  e164: string;
  provider: string;
  routingMode: RoutingMode;
  createdAt: Date;
}

export enum RoutingMode {
  CALL_FORWARDING = 'call_forwarding',
  NUMBER_PORT = 'number_port',
  SIP_PBX = 'sip_pbx',
}

export interface KnowledgeDoc {
  id: string;
  orgId: string;
  locationId: string;
  sourceType: string; // 'website' | 'upload' | 'gbp' | 'manual'
  sourceUrl?: string;
  title: string;
  rawText: string;
  createdAt: Date;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  chunkText: string;
  embedding?: number[];
  metadataJson: Record<string, unknown>;
}

export interface Queue {
  id: string;
  orgId: string;
  locationId: string;
  activeCount: number;
  queuedCount: number;
  updatedAt: Date;
}

export interface BillingPlan {
  id: string;
  orgId: string;
  planName: string;
  concurrencyLimit: number;
  minuteAllowance: number;
  featureFlagsJson: Record<string, boolean>;
  createdAt: Date;
}
