import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { GroupsService } from '../services/groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  async create(@Body() createGroupDto: any) {
    return this.groupsService.create(createGroupDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateGroupDto: any) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.groupsService.delete(id);
  }

  @Post(':groupId/members/:userId')
  async addMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.addMember(groupId, userId);
  }

  @Delete(':groupId/members/:userId')
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMember(groupId, userId);
  }
}
