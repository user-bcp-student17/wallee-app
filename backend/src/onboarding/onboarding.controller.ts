import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post()
  create() {
    return this.service.create();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Put(':id/steps/:step')
  complete(@Param('id') id: string, @Param('step') step: string, @Body() body: unknown) {
    return this.service.complete(id, step, body);
  }
}