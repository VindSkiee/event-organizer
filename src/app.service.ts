import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'ok',
      message: 'Warga App API is running smoothly',
      timestamp: new Date().toISOString(),
      version: '1.0.0', // Nanti bisa ambil dari package.json
    };
  }
}