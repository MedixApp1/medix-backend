import {
  IsMimeType,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateBy,
  ValidationOptions,
  buildMessage,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsGoogleStorageUrl()
  url: string;

  @IsString()
  @IsMimeType()
  mimeType: string;
}

export function IsGoogleStorageUrl(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isGoogleStorageUrl',
      validator: {
        validate: (value): boolean =>
          typeof value === 'string' && value.startsWith('gs://'),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            eachPrefix +
            '$property must be a Google Storage URL starting with "gs://"',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}

export class UpdateAppointmentDto {
  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsMongoId()
  appointmentId: string;
}

export class DeleteAppointmentDto {
  @IsString()
  @IsMongoId()
  appointmentId: string;
}
