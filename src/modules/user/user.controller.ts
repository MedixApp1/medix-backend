import { Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ResponseMessage } from 'src/common/decorators/response.decorator';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constant';
import { LoggedInUserDecorator } from 'src/common/decorators/logged_in_user.decorator';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Gemini } from 'src/common/utils/gemini';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly geminiService: Gemini,
  ) {}

  @Get('/')
  @ResponseMessage(RESPONSE_CONSTANT.USER.GET_CURRENT_USER_SUCCESS)
  async getCurrentUser(@LoggedInUserDecorator() user: any) {
    return this.userService.getUser(user.id);
  }

  @Get('/appointments')
  @ResponseMessage(RESPONSE_CONSTANT.APPOINTMENT.GET_APPOINTMENT_SUCCESS)
  async getAllUserAppointments(@LoggedInUserDecorator() user: any) {
    return this.getAllUserAppointments(user.id);
  }

  @Put('/')
  @ResponseMessage(RESPONSE_CONSTANT.USER.UPDATE_USER_SUCCESS)
  async updateUser(@LoggedInUserDecorator() user: any, payload: UpdateUserDto) {
    return this.userService.updateUser(user.id, payload);
  }

  @Delete('/')
  @ResponseMessage(RESPONSE_CONSTANT.USER.DELETE_USER_SUCCESS)
  async deleteUser(@LoggedInUserDecorator() user: any) {
    return this.userService.deleteUser(user.id);
  }
}
