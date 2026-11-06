import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

describe('W1 AC1-AC3: OnboardingController', () => {
  it('delegates create, read and step completion to the service', () => {
    const service = new OnboardingService();
    const controller = new OnboardingController(service);
    const created = controller.create();
    expect(controller.get(created.onboardingId)).toEqual(created);
    expect(controller.complete(created.onboardingId, 'datos', { nombre: 'Ana', celular: '912345678' }).currentStep).toBe('identidad');
  });
});