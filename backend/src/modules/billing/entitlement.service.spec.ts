import { ConfigService } from '@nestjs/config';
import { EntitlementService } from './entitlement.service';
import { PrismaService } from '../../prisma/prisma.service';

const build = (paymentsEnabled: boolean, purchase: unknown = null) => {
  const prisma = {
    purchase: { findFirst: jest.fn().mockResolvedValue(purchase) },
    project: { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) },
  };
  const config = { get: () => paymentsEnabled } as unknown as ConfigService;
  const service = new EntitlementService(prisma as unknown as PrismaService, config);
  return { service, prisma };
};

describe('EntitlementService', () => {
  describe('paiements activés (défaut)', () => {
    it('verrouille un projet sans achat', async () => {
      const { service } = build(true);
      const entitlement = await service.getProjectEntitlement('p1');
      expect(entitlement.unlocked).toBe(false);
      expect(entitlement.chatAvailable).toBe(false);
    });

    it('débloque un projet avec un achat payé', async () => {
      const chatAccessUntil = new Date(Date.now() + 86_400_000);
      const { service } = build(true, { pack: 'ETUDE', paidAt: new Date(), chatAccessUntil });
      const entitlement = await service.getProjectEntitlement('p1');
      expect(entitlement.unlocked).toBe(true);
      expect(entitlement.chatAvailable).toBe(true);
      expect(entitlement.chatAccessUntil).toBe(chatAccessUntil);
    });
  });

  describe('PAYMENT_ACTIVATION=off', () => {
    it("débloque tout projet, chat compris et sans date de fin, sans regarder les achats", async () => {
      const { service, prisma } = build(false);
      const entitlement = await service.getProjectEntitlement('p1');
      expect(entitlement).toEqual({
        unlocked: true,
        pack: null,
        paidAt: null,
        chatAccessUntil: null,
        chatAvailable: true,
      });
      expect(prisma.purchase.findFirst).not.toHaveBeenCalled();
      expect(await service.isProjectUnlocked('p1')).toBe(true);
    });

    it("garde la vérification de propriétaire du projet pour l'endpoint utilisateur", async () => {
      const { service, prisma } = build(false);
      prisma.project.findUnique.mockResolvedValue({ userId: 'someone-else' });
      await expect(service.getProjectEntitlementForUser('user-1', 'p1')).rejects.toThrow(
        'Project not found',
      );
    });
  });
});
