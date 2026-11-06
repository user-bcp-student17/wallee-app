import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { DatosDto, IdentidadDto, VerificacionDto } from './onboarding.dto';
import { PaymentsService } from '../payments/payments.service';

export const STEPS = ['datos', 'identidad', 'verificacion'] as const;
export type Step = typeof STEPS[number];
type Event = { type: string; timestamp: string; step?: Step };
type RecordState = { id: string; walletId: string; completed: Step[]; events: Event[]; nombre?: string; celular?: string; documento?: string };

@Injectable()
export class OnboardingService {
  private readonly records = new Map<string, RecordState>();

  constructor(private readonly payments: PaymentsService) {}

  create() {
    const record: RecordState = { id: `onb_${randomUUID()}`, walletId: `wal_${randomUUID()}`, completed: [], events: [] };
    this.event(record, 'onboarding_started');
    this.records.set(record.id, record);
    return this.response(record);
  }

  get(id: string) {
    return this.response(this.find(id));
  }

  async complete(id: string, step: string, body: unknown) {
    const record = this.find(id);
    if (!STEPS.includes(step as Step)) {
      throw new BadRequestException({ code: 'INVALID_STEP', message: 'El paso solicitado no es válido.' });
    }
    if (STEPS[record.completed.length] !== step) {
      throw new ConflictException({ code: 'STEP_OUT_OF_ORDER', message: 'Completa los pasos en el orden indicado.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Envía los datos del paso.' });
    }
    const currentStep = step as Step;
    const dtoTypes: Record<Step, new () => object> = { datos: DatosDto, identidad: IdentidadDto, verificacion: VerificacionDto };
    const dto = plainToInstance(dtoTypes[currentStep], body);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).map((error) => ({
      field: error.property,
      message: Object.values(error.constraints ?? {})[0] ?? 'Revisa este campo.',
    }));
    if (errors.length) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Corrige los campos indicados.', errors });
    if (currentStep === 'datos') Object.assign(record, { nombre: (dto as DatosDto).nombre, celular: (dto as DatosDto).celular });
    if (currentStep === 'identidad') record.documento = (dto as IdentidadDto).documento;
    if (currentStep === 'verificacion') {
      if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException({ code: 'MOCK_UNAVAILABLE', message: 'La verificación simulada no está disponible en producción.' });
      if ((body as Record<string, unknown>).codigo !== (process.env.MOCK_OTP ?? '123456')) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Corrige los campos indicados.', errors: [{ field: 'codigo', message: 'El código no es válido.' }] });
      await this.payments.provisionWallet({ walletId: record.walletId, fullName: record.nombre!, phone: record.celular!, document: record.documento! });
      if (STEPS[record.completed.length] !== step) {
        throw new ConflictException({ code: 'STEP_OUT_OF_ORDER', message: 'Completa los pasos en el orden indicado.' });
      }
    }
    record.completed.push(currentStep);
    this.event(record, 'onboarding_step_completed', currentStep);
    if (record.completed.length === STEPS.length) this.event(record, 'onboarding_completed');
    return this.response(record);
  }

  private find(id: string) {
    const record = this.records.get(id);
    if (!record) throw new NotFoundException({ code: 'ONBOARDING_NOT_FOUND', message: 'No se encontró el onboarding.' });
    return record;
  }

  private event(record: RecordState, type: string, step?: Step) {
    record.events.push({ type, timestamp: new Date().toISOString(), ...(step ? { step } : {}) });
  }

  private response(record: RecordState) {
    const complete = record.completed.length === STEPS.length;
    return {
      onboardingId: record.id,
      walletId: record.walletId,
      status: complete ? 'COMPLETADO' : 'EN_CURSO',
      currentStep: STEPS[record.completed.length] ?? null,
      steps: STEPS.map((id) => ({ id, status: record.completed.includes(id) ? 'COMPLETADO' : 'PENDIENTE' })),
      walletStatus: complete ? 'ACTIVA' : 'PENDIENTE_ONBOARDING',
    };
  }
}