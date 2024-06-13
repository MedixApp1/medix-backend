import * as bcrypt from 'bcrypt';

export class BaseHelper {
  static async hashData(data: string) {
    return await bcrypt.hash(data, 12);
  }

  static async compareHashedData(data: string, hashed: string) {
    return await bcrypt.compare(data, hashed);
  }
}
