import { proxyAdminHealthRequest } from '@/lib/admin-health-helper';

export async function GET() {
  return proxyAdminHealthRequest('network-health');
}
