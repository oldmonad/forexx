import { Test, TestingModule } from '@nestjs/testing';
import { GlobalGuardService } from './global.guard.service';

describe('GlobalGuardService', () => {
  let service: GlobalGuardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalGuardService],
    }).compile();

    service = module.get<GlobalGuardService>(GlobalGuardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
