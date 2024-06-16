import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/user.dto';
import { User } from '../user/user.schema';
import { BaseHelper } from 'src/common/utils/helper';
import { LoginDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: CreateUserDto): Promise<User> {
    return await this.userService.createUser(payload);
  }

  async login(payload: LoginDto) {
    const { email, password } = payload;

    const user = await this.userService.getUserByEmailIncludePassword(email);

    if (!user) {
      throw new BadRequestException('Invalid Credential');
    }

    const passwordMatch = await BaseHelper.compareHashedData(
      password,
      user.password,
    );

    if (!passwordMatch) {
      throw new BadRequestException('Incorrect Password');
    }

    const token = this.jwtService.sign({ id: user._id }, { expiresIn: '1d' });

    return {
      ...user.toJSON(),
      password: null,
      accessToken: token,
    };
  }
}
