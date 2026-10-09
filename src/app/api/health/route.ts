import { NextResponse } from 'next/server';
import { getProviderConfigDiagnostics } from '@/lib/ai/provider';

export async function GET() {
  const diagnostics = getProviderConfigDiagnostics();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    prototype: {
      name: 'HieuDaoTao Academic Policy Intelligence Prototype',
      version: '1.0.0',
      activeProvider: diagnostics.activeProviderId,
      activeProviderName: diagnostics.activeProviderName,
      activeDefaultModel: diagnostics.activeDefaultModel,
      isConfigured: diagnostics.activeProviderId === 'vertex'
        ? diagnostics.isVertexConfigured
        : diagnostics.isAnthropicConfigured,
      providers: {
        vertex: {
          available: true,
          configured: diagnostics.isVertexConfigured,
          model: diagnostics.configuredVertexModel,
        },
        anthropic: {
          available: true,
          configured: diagnostics.isAnthropicConfigured,
          model: diagnostics.configuredAnthropicModel,
        },
      },
    },
  });
}
