import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { OrgEntity } from './entities/org.entity';
import { UserEntity } from './entities/user.entity';
import { LocationEntity } from './entities/location.entity';
import { AgentPackEntity } from './entities/agent-pack.entity';
import { BillingPlanEntity } from './entities/billing-plan.entity';
import { QueueEntity } from './entities/queue.entity';
import { CallEntity } from './entities/call.entity';
import { CallTranscriptEntity } from './entities/call-transcript.entity';
import { ToolRunEntity } from './entities/tool-run.entity';
import { PhoneNumberEntity } from './entities/phone-number.entity';
import { KnowledgeDocEntity } from './entities/knowledge-doc.entity';
import { KnowledgeChunkEntity } from './entities/knowledge-chunk.entity';

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/receptionist_swarm';

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    url: DB_URL,
    entities: [
      OrgEntity, UserEntity, LocationEntity, AgentPackEntity, BillingPlanEntity,
      QueueEntity, CallEntity, CallTranscriptEntity, ToolRunEntity, PhoneNumberEntity,
      KnowledgeDocEntity, KnowledgeChunkEntity,
    ],
    synchronize: true,
  });

  await ds.initialize();
  console.log('Connected to database');

  const orgRepo = ds.getRepository(OrgEntity);
  const userRepo = ds.getRepository(UserEntity);
  const locationRepo = ds.getRepository(LocationEntity);
  const agentPackRepo = ds.getRepository(AgentPackEntity);
  const billingPlanRepo = ds.getRepository(BillingPlanEntity);
  const queueRepo = ds.getRepository(QueueEntity);
  const callRepo = ds.getRepository(CallEntity);
  const transcriptRepo = ds.getRepository(CallTranscriptEntity);

  // ── Create demo org ──────────────────────────────────
  const org = orgRepo.create({ name: 'Acme Services' });
  await orgRepo.save(org);
  console.log(`Created org: ${org.name} (${org.id})`);

  // ── Create demo user ─────────────────────────────────
  const passwordHash = await bcrypt.hash('demo123', 10);
  const user = userRepo.create({
    orgId: org.id,
    email: 'demo@acmeservices.com',
    passwordHash,
    role: 'owner',
  });
  await userRepo.save(user);
  console.log(`Created user: ${user.email}`);

  // ── Create billing plan ──────────────────────────────
  const plan = billingPlanRepo.create({
    orgId: org.id,
    planName: 'pro',
    concurrencyLimit: 5,
    minuteAllowance: 2000,
    featureFlagsJson: { webSearch: true, smsRecap: true, transfer: true },
  });
  await billingPlanRepo.save(plan);

  // ── Create 3 locations ───────────────────────────────
  const locations = [
    {
      name: 'Acme HVAC',
      address: '123 Main St, Austin, TX 78701',
      timezone: 'America/Chicago',
      hoursJson: {
        monday: { open: '7:00 AM', close: '6:00 PM' },
        tuesday: { open: '7:00 AM', close: '6:00 PM' },
        wednesday: { open: '7:00 AM', close: '6:00 PM' },
        thursday: { open: '7:00 AM', close: '6:00 PM' },
        friday: { open: '7:00 AM', close: '5:00 PM' },
        saturday: { open: '8:00 AM', close: '12:00 PM' },
        sunday: null,
      },
    },
    {
      name: 'Acme Dental',
      address: '456 Oak Ave, Austin, TX 78702',
      timezone: 'America/Chicago',
      hoursJson: {
        monday: { open: '8:00 AM', close: '5:00 PM' },
        tuesday: { open: '8:00 AM', close: '5:00 PM' },
        wednesday: { open: '8:00 AM', close: '5:00 PM' },
        thursday: { open: '8:00 AM', close: '5:00 PM' },
        friday: { open: '8:00 AM', close: '3:00 PM' },
        saturday: null,
        sunday: null,
      },
    },
    {
      name: 'Acme MedSpa',
      address: '789 Elm Blvd, Austin, TX 78703',
      timezone: 'America/Chicago',
      hoursJson: {
        monday: { open: '9:00 AM', close: '7:00 PM' },
        tuesday: { open: '9:00 AM', close: '7:00 PM' },
        wednesday: { open: '9:00 AM', close: '7:00 PM' },
        thursday: { open: '9:00 AM', close: '7:00 PM' },
        friday: { open: '9:00 AM', close: '6:00 PM' },
        saturday: { open: '10:00 AM', close: '4:00 PM' },
        sunday: null,
      },
    },
  ];

  const savedLocations: LocationEntity[] = [];
  for (const locData of locations) {
    const loc = locationRepo.create({ orgId: org.id, ...locData });
    await locationRepo.save(loc);
    savedLocations.push(loc);
    console.log(`Created location: ${loc.name} (${loc.id})`);

    // Create queue entry
    const queue = queueRepo.create({ orgId: org.id, locationId: loc.id, activeCount: 0, queuedCount: 0 });
    await queueRepo.save(queue);
  }

  // ── Create sample AgentPacks ─────────────────────────

  // HVAC AgentPack
  const hvacPack = agentPackRepo.create({
    orgId: org.id,
    locationId: savedLocations[0].id,
    version: 1,
    status: 'deployed',
    isCurrent: true,
    configJson: {
      persona: {
        name: 'Acme HVAC AI Receptionist',
        tone: 'friendly and helpful',
        brandVoice: 'You are the AI receptionist for Acme HVAC. Be friendly, professional, and focus on helping callers schedule service appointments or get quotes.',
        greetingTemplate: "Thank you for calling Acme HVAC! You're speaking with our AI assistant. How can I help you today?",
        recordingDisclosure: 'This call may be recorded for quality assurance.',
      },
      flows: {
        states: [
          { id: 'S0_GREETING', name: 'Greeting', type: 'greeting', prompts: ['Greet caller. State recording disclosure.'] },
          { id: 'S1_INTENT', name: 'Intent Detection', type: 'intent_detection', prompts: ['Determine need: schedule service, emergency repair, quote, general info.'] },
          { id: 'S2_BOOKING', name: 'Service Scheduling', type: 'booking', prompts: ['Collect: name, phone, address, type of service, preferred date/time.'], collectFields: ['name', 'phone', 'address', 'service_type', 'preferred_time'], toolCalls: ['calendar_check_availability', 'calendar_book_appointment'] },
          { id: 'S3_LEAD_CAPTURE', name: 'Quote Request', type: 'lead_capture', prompts: ['Collect: name, phone, address, system type, issue description, urgency.'], collectFields: ['name', 'phone', 'address', 'system_type', 'issue', 'urgency'], toolCalls: ['crm_upsert_contact', 'crm_create_opportunity'] },
          { id: 'S4_FAQ', name: 'FAQ', type: 'faq', prompts: ['Answer from KB. Services: AC repair, heating, duct cleaning, maintenance plans. If unsure, search or escalate.'], toolCalls: ['knowledge_query', 'search_web'] },
          { id: 'S5_TRANSFER', name: 'Transfer', type: 'transfer', prompts: ['Transfer to dispatch or office manager.'], toolCalls: ['transfer_call'] },
          { id: 'S6_WRAPUP', name: 'Wrapup', type: 'wrapup', prompts: ['Summarize. Send SMS recap.'], toolCalls: ['sms_send'] },
          { id: 'S7_END', name: 'End', type: 'end', prompts: ['Thank caller.'] },
        ],
        transitions: [
          { from: 'S0_GREETING', to: 'S1_INTENT', condition: 'always' },
          { from: 'S1_INTENT', to: 'S2_BOOKING', condition: 'intent == schedule_service' },
          { from: 'S1_INTENT', to: 'S3_LEAD_CAPTURE', condition: 'intent == quote || intent == emergency' },
          { from: 'S1_INTENT', to: 'S4_FAQ', condition: 'intent == info' },
          { from: 'S1_INTENT', to: 'S5_TRANSFER', condition: 'intent == transfer' },
          { from: 'S2_BOOKING', to: 'S6_WRAPUP', condition: 'booking_complete' },
          { from: 'S3_LEAD_CAPTURE', to: 'S6_WRAPUP', condition: 'lead_captured' },
          { from: 'S4_FAQ', to: 'S6_WRAPUP', condition: 'answered' },
          { from: 'S4_FAQ', to: 'S5_TRANSFER', condition: 'cannot_answer' },
          { from: 'S5_TRANSFER', to: 'S7_END', condition: 'transfer_complete' },
          { from: 'S6_WRAPUP', to: 'S7_END', condition: 'always' },
        ],
      },
      tools: [
        { toolName: 'calendar_check_availability', permissionLevel: 'auto', enabled: true },
        { toolName: 'calendar_book_appointment', permissionLevel: 'confirm', enabled: true },
        { toolName: 'crm_upsert_contact', permissionLevel: 'auto', enabled: true },
        { toolName: 'crm_create_opportunity', permissionLevel: 'auto', enabled: true },
        { toolName: 'sms_send', permissionLevel: 'auto', enabled: true },
        { toolName: 'search_web', permissionLevel: 'auto', enabled: true },
        { toolName: 'transfer_call', permissionLevel: 'auto', enabled: true },
        { toolName: 'knowledge_query', permissionLevel: 'auto', enabled: true },
      ],
      kb: { retrievalTopK: 5, similarityThreshold: 0.7, fallbackToSearch: true },
      verifiedAnswerPolicy: { requireCitation: true, allowWebSearch: true, unknownBehavior: 'escalate' },
      escalationMatrix: [
        { trigger: 'emergency_repair', action: 'transfer', targetNumber: '+15125551001', priority: 1 },
        { trigger: 'angry_customer', action: 'transfer', targetNumber: '+15125551001', priority: 2 },
        { trigger: 'pricing_negotiation', action: 'transfer', targetNumber: '+15125551001', priority: 3 },
      ],
      afterHoursRules: { behavior: 'callback', callbackEnabled: true, message: 'We are currently closed. I can take a message or schedule a callback for you.' },
      languages: ['en'],
      emergencyDisclaimers: ['If this is a life-threatening emergency, please call 911.', 'For gas leaks, evacuate and call your gas company.'],
      industry: 'hvac',
    },
  });
  await agentPackRepo.save(hvacPack);
  console.log(`Created HVAC AgentPack v1`);

  // Dental AgentPack
  const dentalPack = agentPackRepo.create({
    orgId: org.id,
    locationId: savedLocations[1].id,
    version: 1,
    status: 'deployed',
    isCurrent: true,
    configJson: {
      persona: {
        name: 'Acme Dental AI Receptionist',
        tone: 'warm and reassuring',
        brandVoice: 'You are the AI receptionist for Acme Dental. Be warm, professional, and help patients schedule appointments or answer questions about our services.',
        greetingTemplate: "Thank you for calling Acme Dental! You're speaking with our AI assistant. How can I help you today?",
        recordingDisclosure: 'This call may be recorded for quality assurance.',
      },
      flows: {
        states: [
          { id: 'S0_GREETING', name: 'Greeting', type: 'greeting', prompts: ['Greet patient warmly.'] },
          { id: 'S1_INTENT', name: 'Intent Detection', type: 'intent_detection', prompts: ['Determine: schedule appointment, emergency dental, insurance question, general info.'] },
          { id: 'S2_BOOKING', name: 'Appointment Scheduling', type: 'booking', prompts: ['Collect: name, phone, insurance, type of visit, preferred date/time.'], collectFields: ['name', 'phone', 'insurance', 'visit_type', 'preferred_time'], toolCalls: ['calendar_check_availability', 'calendar_book_appointment'] },
          { id: 'S3_LEAD_CAPTURE', name: 'New Patient Intake', type: 'lead_capture', prompts: ['Collect: name, phone, email, insurance, reason for visit.'], collectFields: ['name', 'phone', 'email', 'insurance', 'reason'], toolCalls: ['crm_upsert_contact', 'crm_create_opportunity'] },
          { id: 'S4_FAQ', name: 'FAQ', type: 'faq', prompts: ['Answer: services, insurance accepted, hours, location. Cannot provide medical advice.'], toolCalls: ['knowledge_query', 'search_web'] },
          { id: 'S5_TRANSFER', name: 'Transfer', type: 'transfer', prompts: ['Transfer to front desk or dentist.'], toolCalls: ['transfer_call'] },
          { id: 'S6_WRAPUP', name: 'Wrapup', type: 'wrapup', prompts: ['Confirm appointment details. Send SMS reminder.'], toolCalls: ['sms_send'] },
          { id: 'S7_END', name: 'End', type: 'end', prompts: ['Thank patient. Remind to brush and floss!'] },
        ],
        transitions: [
          { from: 'S0_GREETING', to: 'S1_INTENT', condition: 'always' },
          { from: 'S1_INTENT', to: 'S2_BOOKING', condition: 'intent == schedule' },
          { from: 'S1_INTENT', to: 'S3_LEAD_CAPTURE', condition: 'intent == new_patient' },
          { from: 'S1_INTENT', to: 'S4_FAQ', condition: 'intent == info' },
          { from: 'S1_INTENT', to: 'S5_TRANSFER', condition: 'intent == emergency || intent == transfer' },
          { from: 'S2_BOOKING', to: 'S6_WRAPUP', condition: 'booking_complete' },
          { from: 'S3_LEAD_CAPTURE', to: 'S6_WRAPUP', condition: 'intake_complete' },
          { from: 'S4_FAQ', to: 'S6_WRAPUP', condition: 'answered' },
          { from: 'S5_TRANSFER', to: 'S7_END', condition: 'transfer_complete' },
          { from: 'S6_WRAPUP', to: 'S7_END', condition: 'always' },
        ],
      },
      tools: [
        { toolName: 'calendar_check_availability', permissionLevel: 'auto', enabled: true },
        { toolName: 'calendar_book_appointment', permissionLevel: 'confirm', enabled: true },
        { toolName: 'crm_upsert_contact', permissionLevel: 'auto', enabled: true },
        { toolName: 'crm_create_opportunity', permissionLevel: 'auto', enabled: true },
        { toolName: 'sms_send', permissionLevel: 'auto', enabled: true },
        { toolName: 'search_web', permissionLevel: 'auto', enabled: true },
        { toolName: 'transfer_call', permissionLevel: 'auto', enabled: true },
        { toolName: 'knowledge_query', permissionLevel: 'auto', enabled: true },
      ],
      kb: { retrievalTopK: 5, similarityThreshold: 0.7, fallbackToSearch: true },
      verifiedAnswerPolicy: { requireCitation: true, allowWebSearch: true, unknownBehavior: 'escalate' },
      escalationMatrix: [
        { trigger: 'dental_emergency', action: 'transfer', targetNumber: '+15125552001', priority: 1 },
        { trigger: 'medical_question', action: 'transfer', targetNumber: '+15125552001', priority: 2 },
      ],
      afterHoursRules: { behavior: 'take_message', callbackEnabled: true, message: 'Our office is currently closed. I can take a message and we will call you back during business hours.' },
      languages: ['en'],
      emergencyDisclaimers: ['If this is a life-threatening emergency, please call 911.', 'This AI assistant cannot provide medical or dental advice.'],
      industry: 'dental',
    },
  });
  await agentPackRepo.save(dentalPack);
  console.log(`Created Dental AgentPack v1`);

  // MedSpa AgentPack
  const medSpaPack = agentPackRepo.create({
    orgId: org.id,
    locationId: savedLocations[2].id,
    version: 1,
    status: 'deployed',
    isCurrent: true,
    configJson: {
      persona: {
        name: 'Acme MedSpa AI Receptionist',
        tone: 'professional and luxurious',
        brandVoice: 'You are the AI receptionist for Acme MedSpa. Be elegant, professional, and help clients book treatments or learn about our services.',
        greetingTemplate: "Thank you for calling Acme MedSpa! You're speaking with our AI concierge. How may I assist you today?",
        recordingDisclosure: 'This call may be recorded for quality assurance.',
      },
      flows: {
        states: [
          { id: 'S0_GREETING', name: 'Greeting', type: 'greeting', prompts: ['Greet client elegantly.'] },
          { id: 'S1_INTENT', name: 'Intent Detection', type: 'intent_detection', prompts: ['Determine: book treatment, consultation, pricing, general info.'] },
          { id: 'S2_BOOKING', name: 'Treatment Booking', type: 'booking', prompts: ['Collect: name, phone, treatment type, preferred date/time, any contraindications.'], collectFields: ['name', 'phone', 'treatment', 'preferred_time', 'notes'], toolCalls: ['calendar_check_availability', 'calendar_book_appointment'] },
          { id: 'S3_LEAD_CAPTURE', name: 'Consultation Request', type: 'lead_capture', prompts: ['Collect: name, phone, email, areas of interest, budget range.'], collectFields: ['name', 'phone', 'email', 'interests', 'budget'], toolCalls: ['crm_upsert_contact', 'crm_create_opportunity'] },
          { id: 'S4_FAQ', name: 'FAQ', type: 'faq', prompts: ['Answer: treatments offered, pricing ranges, preparation instructions. Cannot provide medical advice.'], toolCalls: ['knowledge_query', 'search_web'] },
          { id: 'S5_TRANSFER', name: 'Transfer', type: 'transfer', prompts: ['Transfer to spa coordinator or provider.'], toolCalls: ['transfer_call'] },
          { id: 'S6_WRAPUP', name: 'Wrapup', type: 'wrapup', prompts: ['Confirm booking. Send SMS with prep instructions.'], toolCalls: ['sms_send'] },
          { id: 'S7_END', name: 'End', type: 'end', prompts: ['Thank client. We look forward to seeing you!'] },
        ],
        transitions: [
          { from: 'S0_GREETING', to: 'S1_INTENT', condition: 'always' },
          { from: 'S1_INTENT', to: 'S2_BOOKING', condition: 'intent == book_treatment' },
          { from: 'S1_INTENT', to: 'S3_LEAD_CAPTURE', condition: 'intent == consultation' },
          { from: 'S1_INTENT', to: 'S4_FAQ', condition: 'intent == info || intent == pricing' },
          { from: 'S1_INTENT', to: 'S5_TRANSFER', condition: 'intent == transfer' },
          { from: 'S2_BOOKING', to: 'S6_WRAPUP', condition: 'booking_complete' },
          { from: 'S3_LEAD_CAPTURE', to: 'S6_WRAPUP', condition: 'consultation_scheduled' },
          { from: 'S4_FAQ', to: 'S6_WRAPUP', condition: 'answered' },
          { from: 'S5_TRANSFER', to: 'S7_END', condition: 'transfer_complete' },
          { from: 'S6_WRAPUP', to: 'S7_END', condition: 'always' },
        ],
      },
      tools: [
        { toolName: 'calendar_check_availability', permissionLevel: 'auto', enabled: true },
        { toolName: 'calendar_book_appointment', permissionLevel: 'confirm', enabled: true },
        { toolName: 'crm_upsert_contact', permissionLevel: 'auto', enabled: true },
        { toolName: 'crm_create_opportunity', permissionLevel: 'auto', enabled: true },
        { toolName: 'sms_send', permissionLevel: 'auto', enabled: true },
        { toolName: 'search_web', permissionLevel: 'auto', enabled: true },
        { toolName: 'transfer_call', permissionLevel: 'auto', enabled: true },
        { toolName: 'knowledge_query', permissionLevel: 'auto', enabled: true },
      ],
      kb: { retrievalTopK: 5, similarityThreshold: 0.7, fallbackToSearch: true },
      verifiedAnswerPolicy: { requireCitation: true, allowWebSearch: true, unknownBehavior: 'escalate' },
      escalationMatrix: [
        { trigger: 'medical_concern', action: 'transfer', targetNumber: '+15125553001', priority: 1 },
        { trigger: 'complaint', action: 'transfer', targetNumber: '+15125553001', priority: 2 },
      ],
      afterHoursRules: { behavior: 'callback', callbackEnabled: true, message: 'Thank you for calling Acme MedSpa. We are currently closed. I can schedule a callback or take a message.' },
      languages: ['en'],
      emergencyDisclaimers: ['If this is a medical emergency, please call 911.', 'This AI assistant cannot provide medical advice.'],
      industry: 'med_spa',
    },
  });
  await agentPackRepo.save(medSpaPack);
  console.log(`Created MedSpa AgentPack v1`);

  // ── Create sample calls for analytics demo ───────────
  const outcomes = ['booked', 'lead_captured', 'faq_answered', 'transferred', 'abandoned'];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const locIndex = i % 3;
    const daysAgo = Math.floor(i / 3);
    const callDate = new Date(now.getTime() - daysAgo * 86400000);
    const duration = 60 + Math.floor(Math.random() * 300);
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    const call = callRepo.create({
      orgId: org.id,
      locationId: savedLocations[locIndex].id,
      providerCallId: `demo_call_${i}`,
      callerNumber: `+1512555${1000 + i}`,
      startedAt: callDate,
      endedAt: new Date(callDate.getTime() + duration * 1000),
      outcome,
      metricsJson: {
        durationSeconds: duration,
        turnsCount: 3 + Math.floor(Math.random() * 10),
        toolCallsCount: 1 + Math.floor(Math.random() * 4),
        escalated: outcome === 'transferred',
        intentDetected: outcome === 'booked' ? 'booking' : outcome === 'lead_captured' ? 'quote' : 'faq',
      },
    });
    await callRepo.save(call);

    // Add transcript for some calls
    if (i % 3 === 0) {
      const transcript = transcriptRepo.create({
        callId: call.id,
        transcriptText: `[Agent]: Thank you for calling! How can I help you today?\n[Caller]: I'd like to ${outcome === 'booked' ? 'schedule an appointment' : 'get some information'}.\n[Agent]: I'd be happy to help with that.`,
        redactedText: `[Agent]: Thank you for calling! How can I help you today?\n[Caller]: I'd like to ${outcome === 'booked' ? 'schedule an appointment' : 'get some information'}.\n[Agent]: I'd be happy to help with that.`,
        structuredJson: {
          turns: [
            { speaker: 'agent', text: 'Thank you for calling! How can I help you today?', timestamp: 0 },
            { speaker: 'caller', text: `I'd like to ${outcome === 'booked' ? 'schedule an appointment' : 'get some information'}.`, timestamp: 3 },
          ],
        },
      });
      await transcriptRepo.save(transcript);
    }
  }
  console.log('Created 30 sample calls');

  console.log('\n=== Seed Complete ===');
  console.log(`Org: ${org.name} (${org.id})`);
  console.log(`User: ${user.email} / demo123`);
  console.log(`Locations: ${savedLocations.map((l) => l.name).join(', ')}`);
  console.log('AgentPacks: HVAC v1, Dental v1, MedSpa v1 (all deployed)');
  console.log('Sample calls: 30');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
