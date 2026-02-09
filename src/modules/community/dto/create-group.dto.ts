import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string; // "RT 05", "Seksi Keamanan"

  @IsString()
  @IsNotEmpty()
  @IsIn(['RT', 'RW', 'OTHER']) // Validasi tipe grup
  type!: string;
}