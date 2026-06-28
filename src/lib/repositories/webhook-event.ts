/**
 * WebhookEvent repository — data access for the gateway-webhook idempotency
 * ledger (Clean Architecture: DB access isolated from the webhook business
 * logic). The unique [gateway, externalId, eventType] makes the table the
 * idempotency ledger; `record` swallows the P2002 a concurrent duplicate trips.
 */

import { Prisma } from '@prisma/client';
import prisma from '../prisma';

const DEFAULT_GATEWAY = 'MIDTRANS';

export const webhookEventRepository = {
  /** Has this exact (gateway, order, event) webhook already been seen? */
  findByKey(externalId: string, eventType: string, gateway = DEFAULT_GATEWAY) {
    return prisma.webhookEvent.findUnique({
      where: { gateway_externalId_eventType: { gateway, externalId, eventType } },
    });
  },

  /** Append the webhook to the ledger (forensic raw copy). Idempotent on P2002. */
  async record(
    externalId: string,
    eventType: string,
    signatureValid: boolean,
    rawPayload: unknown,
    gateway = DEFAULT_GATEWAY
  ): Promise<void> {
    try {
      await prisma.webhookEvent.create({
        data: {
          gateway,
          externalId,
          eventType,
          signatureValid,
          rawPayload: rawPayload as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  },

  /** Count invalid-signature webhooks within a recent window (spike detection). */
  countRecentInvalid(windowMs: number, gateway = DEFAULT_GATEWAY) {
    return prisma.webhookEvent.count({
      where: {
        gateway,
        signatureValid: false,
        processedAt: { gte: new Date(Date.now() - windowMs) },
      },
    });
  },
};
