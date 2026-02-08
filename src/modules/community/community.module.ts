import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { GroupsController } from './controllers/groups.controller';
import { UsersService } from './services/users.service';
import { GroupsService } from './services/groups.service';

@Module({
  controllers: [UsersController, GroupsController],
  providers: [UsersService, GroupsService],
  exports: [UsersService, GroupsService],
})
export class CommunityModule {}
