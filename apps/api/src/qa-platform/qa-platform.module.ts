import { Module } from '@nestjs/common';
import { QaPlatformController } from './qa-platform.controller';

@Module({
  controllers: [QaPlatformController],
})
export class QaPlatformModule {}
