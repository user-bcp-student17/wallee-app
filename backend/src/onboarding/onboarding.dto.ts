import { IsString, Matches } from 'class-validator';

export class DatosDto {
  @IsString({ message: 'Ingresa tu nombre.' })
  @Matches(/\S/, { message: 'Ingresa tu nombre.' })
  nombre!: string;

  @IsString({ message: 'Ingresa tu celular.' })
  @Matches(/^9\d{8}$/, { message: 'Ingresa 9 dígitos que empiecen por 9.' })
  celular!: string;
}

export class IdentidadDto {
  @IsString({ message: 'Ingresa tu documento.' })
  @Matches(/^\d{8}$/, { message: 'Ingresa un documento de 8 dígitos.' })
  documento!: string;
}

export class VerificacionDto {
  @IsString({ message: 'Ingresa el código.' })
  @Matches(/\S/, { message: 'Ingresa el código.' })
  codigo!: string;
}