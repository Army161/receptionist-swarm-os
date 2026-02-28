import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
