import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { AssignmentService } from '../services/assignment.service';

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentController {
  constructor(private readonly assignments: AssignmentService) {}
  @Get('doctors') available(@Query('q') q?: string) { return this.assignments.availableDoctors(q); }
  @Get('mine') mine(@UserPayload() user: PayloadToken) { return this.assignments.mine(user.sub); }
  @Post('doctors/:doctorId') assign(@UserPayload() user: PayloadToken, @Param('doctorId') doctorId: string) { return this.assignments.assign(user.sub, doctorId); }
  @Delete('doctors/:doctorId') end(@UserPayload() user: PayloadToken, @Param('doctorId') doctorId: string) { return this.assignments.end(user.sub, doctorId); }
  @Get('patients') patients(@UserPayload() user: PayloadToken) { return this.assignments.patientsForDoctor(user.sub); }
}
