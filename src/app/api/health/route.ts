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
      isConfigured: diagnostics.activeProviderId === 'vertex'
        ? diagnostics.isVertexConfigured
        : diagnostics.isAnthropicConfigured,
      providers: {
        vertex: {
          adapterImplemented: diagnostics.providers.vertex.adapterImplemented,
          configured: diagnostics.providers.vertex.configured,
          authMode: diagnostics.providers.vertex.authMode,
          model: diagnostics.providers.vertex.model,
          liveValidated: diagnostics.providers.vertex.liveValidated,
        },
        anthropic: {
          adapterImplemented: diagnostics.providers.anthropic.adapterImplemented,
          configured: diagnostics.providers.anthropic.configured,
          authMode: diagnostics.providers.anthropic.authMode,
          model: diagnostics.providers.anthropic.model,
          liveValidated: diagnostics.providers.anthropic.liveValidated,
        },
      },
    },
  });
}
