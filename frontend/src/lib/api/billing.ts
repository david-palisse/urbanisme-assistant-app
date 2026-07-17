import {
  CheckoutSession,
  PackId,
  ProjectEntitlement,
  PurchaseHistoryItem,
} from '@/types';
import { request } from './http';

export const billingApi = {
  async listPurchases(): Promise<PurchaseHistoryItem[]> {
    return request<PurchaseHistoryItem[]>('/billing/purchases');
  },

  async createCheckout(
    projectId: string,
    pack: PackId,
    cgvAccepted: boolean
  ): Promise<CheckoutSession> {
    return request<CheckoutSession>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ projectId, pack, cgvAccepted }),
    });
  },

  async confirmCheckout(sessionId: string): Promise<ProjectEntitlement> {
    return request<ProjectEntitlement>('/billing/checkout/confirm', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  async getEntitlement(projectId: string): Promise<ProjectEntitlement | null> {
    try {
      return await request<ProjectEntitlement>(
        `/billing/projects/${projectId}/entitlement`
      );
    } catch {
      return null;
    }
  },
};
