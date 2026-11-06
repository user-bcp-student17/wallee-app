import type { Response } from 'express';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const payment = { id: 'pay_1', status: 'PENDING' };

describe('PaymentsController', () => {
  const service = {
    getWallet: jest.fn(),
    listPayments: jest.fn(),
    createPayment: jest.fn(),
    getPayment: jest.fn(),
    getReceipt: jest.fn(),
    resolvePayment: jest.fn(),
    completeProvider: jest.fn(),
  };
  const controller = new PaymentsController(service as unknown as PaymentsService);
  const res = () => ({ status: jest.fn() }) as unknown as Response & { status: jest.Mock };

  beforeEach(() => jest.resetAllMocks());

  it('delegates reads to the service, defaulting the history to wallet-demo', async () => {
    service.listPayments.mockResolvedValue([payment]);
    expect(await controller.list(undefined)).toEqual([payment]);
    expect(service.listPayments).toHaveBeenCalledWith('wallet-demo');
    await controller.list('wal_1');
    expect(service.listPayments).toHaveBeenLastCalledWith('wal_1');
    service.getWallet.mockResolvedValue({ id: 'wal_1' });
    expect(await controller.wallet('wal_1')).toEqual({ id: 'wal_1' });
    service.getPayment.mockResolvedValue(payment);
    expect(await controller.payment('pay_1')).toBe(payment);
    service.getReceipt.mockResolvedValue({ receiptId: 'rcp_pay_1' });
    expect(await controller.receipt('pay_1')).toEqual({ receiptId: 'rcp_pay_1' });
  });

  it('answers 202 for a new payment and 200 for an idempotent replay', async () => {
    const created = res();
    service.createPayment.mockResolvedValue({ replay: false, payment });
    expect(await controller.create({ a: 1 }, 'key', created)).toBe(payment);
    expect(created.status).toHaveBeenCalledWith(202);
    expect(service.createPayment).toHaveBeenCalledWith({ a: 1 }, 'key');
    const replayed = res();
    service.createPayment.mockResolvedValue({ replay: true, payment });
    await controller.create({}, 'key', replayed);
    expect(replayed.status).toHaveBeenCalledWith(200);
  });

  it('resolve answers 200 with the payment, or 202 when escalated', async () => {
    const done = res();
    service.resolvePayment.mockResolvedValue({ escalated: false, payment });
    expect(await controller.resolve('pay_1', done)).toBe(payment);
    expect(done.status).not.toHaveBeenCalled();
    const escalated = res();
    service.resolvePayment.mockResolvedValue({ escalated: true, payment });
    expect(await controller.resolve('pay_1', escalated)).toEqual({ status: 'PENDING', escalated: true });
    expect(escalated.status).toHaveBeenCalledWith(202);
  });

  it('completes the simulated provider', async () => {
    service.completeProvider.mockResolvedValue({ eventId: 'evt_1' });
    expect(await controller.complete('pay_1', { status: 'REJECTED' })).toEqual({ eventId: 'evt_1' });
    expect(service.completeProvider).toHaveBeenCalledWith('pay_1', { status: 'REJECTED' });
  });
});
