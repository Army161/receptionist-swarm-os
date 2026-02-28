import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceService } from './voice/voice.service';
import { SmsService } from './sms/sms.service';
import { SearchService } from './search/search.service';
import { LlmService } from './llm/llm.service';

@Module({
  imports: [ConfigModule],
  providers: [VoiceService, SmsService, SearchService, LlmService],
  exports: [VoiceService, SmsService, SearchService, LlmService],
})
export class ProvidersModule {}
