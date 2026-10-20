import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  // Los guards de @Roles necesitan el JwtService, que aporta AuthModule, y
  // PrismaService, para cargar el usuario. Las subidas no usan la base.
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
