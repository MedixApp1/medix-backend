import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ResponseMessage } from 'src/common/decorators/response.decorator';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constant';
import { LoggedInUserDecorator } from 'src/common/decorators/logged_in_user.decorator';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/')
  @ResponseMessage(RESPONSE_CONSTANT.USER.GET_CURRENT_USER_SUCCESS)
  async getCurrentUser(@LoggedInUserDecorator() user: any) {
    return this.userService.getUser(user.id);
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
