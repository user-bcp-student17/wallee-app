import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({ imports: [PaymentsModule], controllers: [OnboardingController], providers: [OnboardingService] })
export class OnboardingModule {}