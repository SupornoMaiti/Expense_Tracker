import { useEffect, useState } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getPendingOutboxCount } from '../lib/sync'
import { pushOutbox } from '../lib/sync'
import { Cloud, CloudOff, CloudUpload, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function SyncStatusBar() {
  const isOnline = useOnlineStatus()
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = async () => {
    const count = await getPendingOutboxCount()
    setPending(count)
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOnline && pending > 0) {
      setSyncing(true)
      pushOutbox()
        .then(({ pushed }) => {
          if (pushed > 0) refreshCount()
          setSyncing(false)
        })
        .catch((err) => {
          console.warn('[SyncStatusBar] pushOutbox rejected:', err)
          setSyncing(false)
        })
    }
  }, [isOnline, pending])

  if (!isOnline) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1.5 border-destructive/50 text-destructive bg-destructive/10">
            <CloudOff className="h-3 w-3" />
            <span className="hidden sm:inline">Offline</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>No network connection — data saved locally</TooltipContent>
      </Tooltip>
    )
  }

  if (syncing) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">Syncing</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Syncing with cloud...</TooltipContent>
      </Tooltip>
    )
  }

  if (pending > 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
            <CloudUpload className="h-3 w-3" />
            <span className="hidden sm:inline">Pending ({pending})</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{pending} operations pending sync</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="gap-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/10">
          <Cloud className="h-3 w-3" />
          <span className="hidden sm:inline">Synced</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>All data synced</TooltipContent>
    </Tooltip>
  )
}
