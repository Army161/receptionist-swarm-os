// ── Constants ────────────────────────────────────────

export const DEFAULT_CONCURRENCY_LIMIT = 2;
export const DEFAULT_MINUTE_ALLOWANCE = 500;
export const MAX_QUEUE_SIZE = 10;
export const QUEUE_TIMEOUT_SECONDS = 300; // 5 minutes
export const KB_CHUNK_SIZE = 500;
export const KB_CHUNK_OVERLAP = 50;
export const KB_TOP_K = 5;
export const KB_SIMILARITY_THRESHOLD = 0.7;

export const SUPPORTED_INDUSTRIES = [
  'hvac',
  'dental',
  'med_spa',
  'law_intake',
  'home_services',
  'restaurant',
  'auto_repair',
  'real_estate',
  'general',
] as const;

export type SupportedIndustry = (typeof SUPPORTED_INDUSTRIES)[number];

export const DEFAULT_FIVE_QUESTIONS = [
  {
    id: 'q1_call_goals',
    text: 'What are your top 3 call goals? (Select up to 3)',
    type: 'multi_select' as const,
    options: [
      'Book appointments',
      'Capture leads / request quotes',
      'Answer FAQs (hours, location, services)',
      'Transfer to human staff',
      'Take messages',
      'Schedule callbacks',
    ],
    required: true,
  },
  {
    id: 'q2_after_hours',
    text: 'What should happen when someone calls after business hours?',
    type: 'single_select' as const,
    options: [
      'Take a message and email it to me',
      'Offer to schedule a callback',
      'Transfer to emergency/on-call number',
      'Play voicemail greeting',
    ],
    required: true,
  },
  {
    id: 'q3_pricing',
    text: 'Can the AI share pricing information with callers?',
    type: 'single_select' as const,
    options: [
      'Yes, share exact prices from our price list',
      'Yes, but only price ranges',
      'No, ask them to request a quote',
      'No, transfer to staff for pricing questions',
    ],
    required: true,
  },
  {
    id: 'q4_transfer_targets',
    text: 'Who should calls be transferred to when needed? (Add at least one contact)',
    type: 'transfer_targets' as const,
    required: true,
  },
  {
    id: 'q5_compliance',
    text: 'Which compliance disclosures should the AI make? (Select all that apply)',
    type: 'multi_select' as const,
    options: [
      'This call may be recorded',
      'You are speaking with an AI assistant',
      'We do not provide medical/legal advice',
      'None required',
    ],
    required: true,
  },
];
