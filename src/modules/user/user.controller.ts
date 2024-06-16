import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
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
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('/speech-to-text-gemini')
  @UseInterceptors(FileInterceptor('file'))
  async speechToTextGemini(@UploadedFile() file: Express.Multer.File) {
    const uploadResult = await this.geminiService.uploadFile(
      file,
      file.mimetype,
    );
    return uploadResult;
  }

  @Post('/generate-transcript')
  async generateTranscript(@Body() body: { url: string; mimeType: string }) {
    return await this.geminiService.generateTranscriptFromAudio(
      body.url,
      body.mimeType,
    );
  }
}
