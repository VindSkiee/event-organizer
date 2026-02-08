import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // TODO: Implement find all users logic
    throw new Error('Method not implemented');
  }

  async findOne(id: string) {
    // TODO: Implement find user by id logic
    throw new Error('Method not implemented');
  }

  async create(data: any) {
    // TODO: Implement create user logic
    throw new Error('Method not implemented');
  }

  async update(id: string, data: any) {
    // TODO: Implement update user logic
    throw new Error('Method not implemented');
  }

  async delete(id: string) {
    // TODO: Implement delete user logic
    throw new Error('Method not implemented');
  }
}
