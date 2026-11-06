import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [DatabaseModule, HealthModule, OnboardingModule],
})
export class AppModule {}
