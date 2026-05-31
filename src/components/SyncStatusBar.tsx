import { useEffect, useState } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getPendingOutboxCount } from '../lib/sync'
import { pushOutbox } from '../lib/sync'

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
      <div className="sync-status offline" title="No network connection — data saved locally">
        <span className="sync-dot offline-dot">✗</span>
        <span>OFFLINE</span>
      </div>
    )
  }

  if (syncing) {
    return (
      <div className="sync-status syncing" title="Syncing with cloud...">
        <span className="sync-dot syncing-dot blink">◌</span>
        <span>SYNCING…</span>
      </div>
    )
  }

  if (pending > 0) {
    return (
      <div className="sync-status pending" title={`${pending} operations pending sync`}>
        <span className="sync-dot pending-dot blink">◌</span>
        <span>PENDING ({pending})</span>
      </div>
    )
  }

  return (
    <div className="sync-status synced" title="All data synced">
      <span className="sync-dot synced-dot">●</span>
      <span>SYNCED</span>
    </div>
  )
}
