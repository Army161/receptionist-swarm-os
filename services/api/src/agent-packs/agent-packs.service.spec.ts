import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentPacksService } from './agent-packs.service';
import { AgentPackEntity } from '../database/entities/agent-pack.entity';

describe('AgentPacksService', () => {
  let service: AgentPacksService;
  const mockAgentPackRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentPacksService,
        { provide: getRepositoryToken(AgentPackEntity), useValue: mockAgentPackRepo },
      ],
    }).compile();

    service = module.get<AgentPacksService>(AgentPacksService);
    jest.clearAllMocks();
  });

  describe('createDraft', () => {
    it('should create a draft AgentPack with version 1 for a new location', async () => {
      mockAgentPackRepo.findOne.mockResolvedValue(null); // no existing packs
      mockAgentPackRepo.create.mockReturnValue({
        id: 'pack-1',
        orgId: 'org-1',
        locationId: 'loc-1',
        version: 1,
        status: 'draft',
        configJson: { industry: 'hvac' },
        isCurrent: false,
      });
      mockAgentPackRepo.save.mockResolvedValue({
        id: 'pack-1',
        orgId: 'org-1',
        locationId: 'loc-1',
        version: 1,
        status: 'draft',
        configJson: { industry: 'hvac' },
        isCurrent: false,
      });

      const result = await service.createDraft('org-1', 'loc-1', { industry: 'hvac' });

      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
      expect(result.isCurrent).toBe(false);
      expect(mockAgentPackRepo.create).toHaveBeenCalledWith({
        orgId: 'org-1',
        locationId: 'loc-1',
        version: 1,
        status: 'draft',
        configJson: { industry: 'hvac' },
        isCurrent: false,
      });
    });

    it('should increment version for existing packs', async () => {
      mockAgentPackRepo.findOne.mockResolvedValue({ version: 3 }); // existing v3
      mockAgentPackRepo.create.mockReturnValue({
        id: 'pack-4',
        version: 4,
        status: 'draft',
        isCurrent: false,
      });
      mockAgentPackRepo.save.mockResolvedValue({
        id: 'pack-4',
        version: 4,
        status: 'draft',
        isCurrent: false,
      });

      const result = await service.createDraft('org-1', 'loc-1', {});

      expect(result.version).toBe(4);
    });
  });

  describe('confirm', () => {
    it('should update status to confirmed', async () => {
      mockAgentPackRepo.update.mockResolvedValue({ affected: 1 });
      mockAgentPackRepo.findOne.mockResolvedValue({
        id: 'pack-1',
        status: 'confirmed',
        configJson: { industry: 'hvac', updated: true },
      });

      const result = await service.confirm('pack-1', { industry: 'hvac', updated: true });

      expect(result.status).toBe('confirmed');
      expect(mockAgentPackRepo.update).toHaveBeenCalledWith('pack-1', {
        status: 'confirmed',
        configJson: { industry: 'hvac', updated: true },
      });
    });
  });

  describe('deploy', () => {
    it('should set pack as current and deployed, unsetting previous current', async () => {
      const pack = {
        id: 'pack-1',
        locationId: 'loc-1',
        status: 'confirmed',
        isCurrent: false,
      };
      mockAgentPackRepo.findOne
        .mockResolvedValueOnce(pack) // first call: findById in deploy
        .mockResolvedValueOnce({ ...pack, status: 'deployed', isCurrent: true }); // second call: findById return

      mockAgentPackRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.deploy('pack-1');

      // Should unset all current packs for this location
      expect(mockAgentPackRepo.update).toHaveBeenCalledWith(
        { locationId: 'loc-1', isCurrent: true },
        { isCurrent: false },
      );
      // Should set this pack as deployed + current
      expect(mockAgentPackRepo.update).toHaveBeenCalledWith('pack-1', {
        status: 'deployed',
        isCurrent: true,
      });
    });
  });

  describe('rollback', () => {
    it('should set a specific version as current', async () => {
      const targetPack = { id: 'pack-2', locationId: 'loc-1', version: 2 };
      mockAgentPackRepo.findOne
        .mockResolvedValueOnce(targetPack) // find target version
        .mockResolvedValueOnce({ ...targetPack, status: 'deployed', isCurrent: true }); // return updated

      mockAgentPackRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.rollback('loc-1', 2);

      expect(mockAgentPackRepo.update).toHaveBeenCalledWith(
        { locationId: 'loc-1', isCurrent: true },
        { isCurrent: false },
      );
      expect(mockAgentPackRepo.update).toHaveBeenCalledWith('pack-2', {
        isCurrent: true,
        status: 'deployed',
      });
    });

    it('should throw if version not found', async () => {
      mockAgentPackRepo.findOne.mockResolvedValue(null);

      await expect(service.rollback('loc-1', 99)).rejects.toThrow('AgentPack version 99 not found');
    });
  });

  describe('getCurrent', () => {
    it('should return the current AgentPack for a location', async () => {
      const currentPack = { id: 'pack-1', locationId: 'loc-1', isCurrent: true, status: 'deployed' };
      mockAgentPackRepo.findOne.mockResolvedValue(currentPack);

      const result = await service.getCurrent('loc-1');

      expect(result).toEqual(currentPack);
      expect(mockAgentPackRepo.findOne).toHaveBeenCalledWith({
        where: { locationId: 'loc-1', isCurrent: true },
      });
    });

    it('should return null if no current pack', async () => {
      mockAgentPackRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrent('loc-1');

      expect(result).toBeNull();
    });
  });
});
