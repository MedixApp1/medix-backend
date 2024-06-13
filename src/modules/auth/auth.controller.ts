import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { CreateUserDto } from '../user/dto/user.dto';
import { ResponseMessage } from 'src/common/decorators/response.decorator';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constant';
import { LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/signup')
  @ResponseMessage(RESPONSE_CONSTANT.AUTH.REGISTER_SUCCESS)
  async signUp(@Body() payload: CreateUserDto) {
    return this.authService.register(payload);
  }

  @Public()
  @Post('/login')
  @ResponseMessage(RESPONSE_CONSTANT.AUTH.LOGIN_SUCCESS)
  async login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }
}
