import { IsNotEmpty, IsString } from 'class-validator';

export interface IDataToWorkerDTO {
  email: string;
}

export class DataToWorkerDTO implements IDataToWorkerDTO {
  @IsString()
  @IsNotEmpty()
  email: string;

  toJson(): IDataToWorkerDTO {
    return {
      email: this.email,
    };
  }

  static newInstanceFromJson(data: IDataToWorkerDTO) {
    console.log('newInstanceFromJson >> ', data);
    const result = new DataToWorkerDTO();
    result.email = data.email;

    return result;
  }
}
