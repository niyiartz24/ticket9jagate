import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/session";
import { integrationConfigSchema } from "@/lib/validation/schemas";
import { encryptConfig } from "@/lib/integrations/crypto";
import { getActiveProviderName } from "@/lib/integrations/provider-factory";
import { recordAudit } from "@/lib/db/audit";

export async function GET() {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = await prisma.integrationConfig.findUnique({ where: { provider: "budpay" } });

  return NextResponse.json({
    activeProvider: getActiveProviderName(),
    budpay: config
      ? { isActive: config.isActive, configuredAt: config.updatedAt }
      : { isActive: false, configuredAt: null },
  });
}

/**
 * Stores BudPay credentials encrypted at rest. Note: setting this does not
 * automatically make BudPayTicketProvider functional — see
 * src/lib/integrations/budpay/README.md. This route exists so credentials
 * have somewhere secure to live once BudPay's real API details arrive.
 */
export async function PUT(req: NextRequest) {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = integrationConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid configuration." }, { status: 400 });

  const { provider, isActive, ...secrets } = parsed.data;
  const encryptedConfig = encryptConfig(JSON.stringify(secrets));

  await prisma.integrationConfig.upsert({
    where: { provider },
    create: { provider, encryptedConfig, isActive },
    update: { encryptedConfig, isActive },
  });

  await recordAudit({ userId: session.userId, action: "INTEGRATION_CONFIG_UPDATED", entity: "IntegrationConfig" });

  return NextResponse.json({ ok: true });
}
