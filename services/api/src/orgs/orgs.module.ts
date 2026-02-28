import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';
import { OrgEntity } from '../database/entities/org.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrgEntity])],
  controllers: [OrgsController],
  providers: [OrgsService],
  exports: [OrgsService],
})
export class OrgsModule {}
