import { AppShell } from '@/components/AppShell'
import { isLiveAiEnabled } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <AppShell liveAvailable={isLiveAiEnabled()} />
}
