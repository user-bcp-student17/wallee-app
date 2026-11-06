import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IN_MEMORY, dataSourceOptions } from '../database/database.config';
import { DEMO_WALLET_ID, seedDemoData } from '../database/database.seed';
import { Wallet } from '../database/entities';
import { PaymentsService } from '../payments/payments.service';
import { OnboardingService } from './onboarding.service';

const datos = { nombre: 'Ana', celular: '912345678' };
const identidad = { documento: '12345678' };

describe('W1 AC1-AC4: onboarding', () => {
  let dataSource: DataSource;
  let service: OnboardingService;
  let id: string;
  const oldEnv = process.env.NODE_ENV;
  const oldOtp = process.env.MOCK_OTP;
  const oldSeed = process.env.DB_SEED;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.MOCK_OTP;
    delete process.env.DB_SEED;
    dataSource = new DataSource(dataSourceOptions({ DB_PATH: IN_MEMORY } as NodeJS.ProcessEnv));
    await dataSource.initialize();
    await seedDemoData(dataSource);
    service = new OnboardingService(new PaymentsService(dataSource));
    id = service.create().onboardingId;
  });
  afterEach(async () => {
    await dataSource.destroy();
    process.env.NODE_ENV = oldEnv;
    if (oldOtp === undefined) delete process.env.MOCK_OTP; else process.env.MOCK_OTP = oldOtp;
    if (oldSeed === undefined) delete process.env.DB_SEED; else process.env.DB_SEED = oldSeed;
  });

  it('creates a pending wallet and advances in order only with valid data', async () => {
    expect(service.get(id)).toMatchObject({ currentStep: 'datos', walletStatus: 'PENDIENTE_ONBOARDING' });
    await expect(service.complete(id, 'identidad', identidad)).rejects.toThrow(ConflictException);
    await expect(service.complete(id, 'datos', { nombre: 'Ana', celular: '123' })).rejects.toThrow(BadRequestException);
    expect(service.get(id).currentStep).toBe('datos');
    expect((await service.complete(id, 'datos', datos)).currentStep).toBe('identidad');
    expect((await service.complete(id, 'identidad', identidad)).walletStatus).toBe('PENDIENTE_ONBOARDING');
    await expect(service.complete(id, 'verificacion', { codigo: '0' })).rejects.toThrow(BadRequestException);
    expect(await service.complete(id, 'verificacion', { codigo: '123456' })).toMatchObject({ currentStep: null, status: 'COMPLETADO', walletStatus: 'ACTIVA' });
    expect(service['records'].get(id)?.events.map((event) => event.type)).toEqual(['onboarding_started', 'onboarding_step_completed', 'onboarding_step_completed', 'onboarding_step_completed', 'onboarding_completed']);
    expect(service['records'].get(id)?.events.every((event) => !Number.isNaN(Date.parse(event.timestamp)))).toBe(true);
    await expect(service.complete(id, 'verificacion', { codigo: '123456' })).rejects.toThrow(ConflictException);
  });

  it('rejects unknown resources, steps, invalid bodies and extra fields', async () => {
    expect(() => service.get('missing')).toThrow(NotFoundException);
    await expect(service.complete(id, 'unknown', {})).rejects.toThrow(BadRequestException);
    await expect(service.complete(id, 'datos', null)).rejects.toThrow(BadRequestException);
    await expect(service.complete(id, 'datos', { nombre: ' ', celular: 123, extra: true })).rejects.toThrow(BadRequestException);
    await service.complete(id, 'datos', datos);
    await expect(service.complete(id, 'identidad', { documento: '123' })).rejects.toThrow(BadRequestException);
  });

  it('supports a configured mock code and disables the mock in production', async () => {
    await service.complete(id, 'datos', datos);
    await service.complete(id, 'identidad', identidad);
    process.env.NODE_ENV = 'production';
    await expect(service.complete(id, 'verificacion', { codigo: '123456' })).rejects.toThrow(ServiceUnavailableException);
    process.env.NODE_ENV = 'test';
    process.env.MOCK_OTP = '654321';
    expect((await service.complete(id, 'verificacion', { codigo: '654321' })).walletStatus).toBe('ACTIVA');
  });

  it('registers the active wallet with the demo opening balance so it can pay', async () => {
    const walletId = service.get(id).walletId;
    await service.complete(id, 'datos', datos);
    await service.complete(id, 'identidad', identidad);
    expect(await dataSource.manager.existsBy(Wallet, { id: walletId })).toBe(false);
    await service.complete(id, 'verificacion', { codigo: '123456' });
    expect(await dataSource.manager.findOneByOrFail(Wallet, { id: walletId })).toMatchObject({ status: 'ACTIVE', balance: 100000, reserved: 0 });
    const payments = new PaymentsService(dataSource);
    const { payment } = await payments.createPayment({ walletId, recipient: 'contact-demo', amountCents: 1500 }, 'k1');
    expect(payment).toMatchObject({ walletId, status: 'PENDING' });
  });

  it('starts at zero balance without the demo seed and reuses the customer of a known document', async () => {
    process.env.DB_SEED = 'false';
    const other = service.create();
    for (const current of [id, other.onboardingId]) {
      await service.complete(current, 'datos', datos);
      await service.complete(current, 'identidad', identidad);
      await service.complete(current, 'verificacion', { codigo: '123456' });
    }
    const wallets = (await dataSource.manager.find(Wallet)).filter((wallet) => wallet.id !== DEMO_WALLET_ID);
    expect(wallets).toHaveLength(2);
    expect(wallets.every((wallet) => wallet.balance === 0 && wallet.customerId === wallets[0].customerId)).toBe(true);
  });

  it('does not complete the onboarding when the wallet cannot be registered', async () => {
    await service.complete(id, 'datos', datos);
    await service.complete(id, 'identidad', identidad);
    await dataSource.destroy();
    await expect(service.complete(id, 'verificacion', { codigo: '123456' })).rejects.toThrow();
    expect(service.get(id).walletStatus).toBe('PENDIENTE_ONBOARDING');
    await dataSource.initialize();
  });
});