import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min, validateSync } from 'class-validator';
import { CURRENCY, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS } from '../database/database.constants';

export const RECIPIENTS = ['contact-demo', 'merchant-demo'] as const;
// El mock también define DELAYED_APPROVAL, TIMEOUT_AFTER_PROCESSING y PROVIDER_ERROR; aún no se implementan.
export const PAYMENT_SCENARIOS = ['APPROVED', 'REJECTED', 'PENDING'] as const;
export const COMPLETABLE_STATUSES = ['SUCCEEDED', 'REJECTED'] as const;

export class CreatePaymentDto {
  @IsString({ message: 'Indica la wallet de origen.' })
  @Length(1, 200, { message: 'Indica la wallet de origen.' })
  walletId!: string;

  @IsIn(RECIPIENTS, { message: 'Elige un destinatario válido.' })
  recipient!: string;

  @IsInt({ message: 'El importe debe ser un entero en céntimos.' })
  @Min(MIN_AMOUNT_CENTS, { message: 'El importe mínimo es 1 céntimo.' })
  @Max(MAX_AMOUNT_CENTS, { message: 'El importe máximo es S/ 1 000 000.00.' })
  amountCents!: number;

  @IsOptional()
  @IsIn([CURRENCY], { message: 'Solo se admite PEN.' })
  currency?: string;

  @IsOptional()
  @IsIn(PAYMENT_SCENARIOS, { message: 'El escenario no es válido.' })
  scenario?: string;
}

export class CompleteProviderDto {
  @IsOptional()
  @IsIn(COMPLETABLE_STATUSES, { message: 'El estado debe ser SUCCEEDED o REJECTED.' })
  status?: string;
}

export function parseBody<T extends object>(type: new () => T, body: unknown, code = 'VALIDATION_ERROR'): T {
  if (body === undefined || body === null) body = {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException({ code, message: 'Envía los datos en formato JSON.' });
  }
  const dto = plainToInstance(type, body);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).map((error) => ({
    field: error.property,
    message: Object.values(error.constraints ?? {})[0] ?? 'Revisa este campo.',
  }));
  if (errors.length) throw new BadRequestException({ code, message: 'Corrige los campos indicados.', errors });
  return dto;
}
