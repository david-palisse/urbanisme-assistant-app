import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pack, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { arePaymentsEnabled } from './payment-activation';

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
 * What every project gets while payments are switched off
 * (PAYMENT_ACTIVATION=off): the full analysis, documents and assistant, with
 * no purchase and no end date for the Q&A.
 */
const FREE_ACCESS_ENTITLEMENT: ProjectEntitlement = {
  unlocked: true,
  pack: null,
  paidAt: null,
  chatAccessUntil: null,
  chatAvailable: true,
};

/**
 * Computes what a user has unlocked on a project from its paid purchases.
 * Kept separate from BillingService so gating consumers (analysis, documents,
 * chat) don't depend on Stripe. It is the single place where the paywall is
 * decided, so PAYMENT_ACTIVATION=off only has to be handled here.
 */
@Injectable()
export class EntitlementService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getProjectEntitlement(projectId: string): Promise<ProjectEntitlement> {
    if (!arePaymentsEnabled(this.configService)) {
      return FREE_ACCESS_ENTITLEMENT;
    }

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
