import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

describe('W1 AC1-AC4: onboarding', () => {
  let service: OnboardingService;
  let id: string;
  const oldEnv = process.env.NODE_ENV;
  const oldOtp = process.env.MOCK_OTP;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.MOCK_OTP;
    service = new OnboardingService();
    id = service.create().onboardingId;
  });
  afterEach(() => {
    process.env.NODE_ENV = oldEnv;
    if (oldOtp === undefined) delete process.env.MOCK_OTP; else process.env.MOCK_OTP = oldOtp;
  });

  it('creates a pending wallet and advances in order only with valid data', () => {
    expect(service.get(id)).toMatchObject({ currentStep: 'datos', walletStatus: 'PENDIENTE_ONBOARDING' });
    expect(() => service.complete(id, 'identidad', { documento: '12345678' })).toThrow(ConflictException);
    expect(() => service.complete(id, 'datos', { nombre: 'Ana', celular: '123' })).toThrow(BadRequestException);
    expect(service.get(id).currentStep).toBe('datos');
    expect(service.complete(id, 'datos', { nombre: 'Ana', celular: '912345678' }).currentStep).toBe('identidad');
    expect(service.complete(id, 'identidad', { documento: '12345678' }).walletStatus).toBe('PENDIENTE_ONBOARDING');
    expect(() => service.complete(id, 'verificacion', { codigo: '0' })).toThrow(BadRequestException);
    expect(service.complete(id, 'verificacion', { codigo: '123456' })).toMatchObject({ currentStep: null, status: 'COMPLETADO', walletStatus: 'ACTIVA' });
    expect(service['records'].get(id)?.events.map((event) => event.type)).toEqual(['onboarding_started', 'onboarding_step_completed', 'onboarding_step_completed', 'onboarding_step_completed', 'onboarding_completed']);
    expect(service['records'].get(id)?.events.every((event) => !Number.isNaN(Date.parse(event.timestamp)))).toBe(true);
    expect(() => service.complete(id, 'verificacion', { codigo: '123456' })).toThrow(ConflictException);
  });

  it('rejects unknown resources, steps, invalid bodies and extra fields', () => {
    expect(() => service.get('missing')).toThrow(NotFoundException);
    expect(() => service.complete(id, 'unknown', {})).toThrow(BadRequestException);
    expect(() => service.complete(id, 'datos', null)).toThrow(BadRequestException);
    expect(() => service.complete(id, 'datos', { nombre: ' ', celular: 123, extra: true })).toThrow(BadRequestException);
    service.complete(id, 'datos', { nombre: 'Ana', celular: '912345678' });
    expect(() => service.complete(id, 'identidad', { documento: '123' })).toThrow(BadRequestException);
  });

  it('supports a configured mock code and disables the mock in production', () => {
    service.complete(id, 'datos', { nombre: 'Ana', celular: '912345678' });
    service.complete(id, 'identidad', { documento: '12345678' });
    process.env.NODE_ENV = 'production';
    expect(() => service.complete(id, 'verificacion', { codigo: '123456' })).toThrow(ServiceUnavailableException);
    process.env.NODE_ENV = 'test';
    process.env.MOCK_OTP = '654321';
    expect(service.complete(id, 'verificacion', { codigo: '654321' }).walletStatus).toBe('ACTIVA');
  });
});