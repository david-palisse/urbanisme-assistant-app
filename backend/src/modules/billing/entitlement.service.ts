import { Injectable, NotFoundException } from '@nestjs/common';
import { Pack, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProjectEntitlement {
  /** True when the project has at least one paid pack: full analysis unlocked */
  unlocked: boolean;
  pack: Pack | null;
  paidAt: Date | null;
  /** End of the Q&A window (null when nothing paid) */
  chatAccessUntil: Date | null;
  /** True when the user can still ask questions to the assistant */
  chatAvailable: boolean;
}

const LOCKED_ENTITLEMENT: ProjectEntitlement = {
  unlocked: false,
  pack: null,
  paidAt: null,
  chatAccessUntil: null,
  chatAvailable: false,
};

/**
 * Computes what a user has unlocked on a project from its paid purchases.
 * Kept separate from BillingService so gating consumers (analysis, documents,
 * chat) don't depend on Stripe.
 */
@Injectable()
export class EntitlementService {
  constructor(private prisma: PrismaService) {}

  async getProjectEntitlement(projectId: string): Promise<ProjectEntitlement> {
    const purchase = await this.prisma.purchase.findFirst({
      where: { projectId, status: PurchaseStatus.PAID },
      orderBy: { paidAt: 'desc' },
    });

    if (!purchase) {
      return LOCKED_ENTITLEMENT;
    }

    return {
      unlocked: true,
      pack: purchase.pack,
      paidAt: purchase.paidAt,
      chatAccessUntil: purchase.chatAccessUntil,
      chatAvailable:
        !!purchase.chatAccessUntil && purchase.chatAccessUntil > new Date(),
    };
  }

  /** Same as getProjectEntitlement but verifies project ownership first */
  async getProjectEntitlementForUser(
    userId: string,
    projectId: string,
  ): Promise<ProjectEntitlement> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }
    return this.getProjectEntitlement(projectId);
  }

  /** True when the project's full analysis is unlocked */
  async isProjectUnlocked(projectId: string): Promise<boolean> {
    const entitlement = await this.getProjectEntitlement(projectId);
    return entitlement.unlocked;
  }
}
