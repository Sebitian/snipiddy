// This is a server component (no 'use client' directive)
import { ScanDetailClient } from './scan-detail-client'

export default function ScanDetailPage({ params }: { params: { id: string } }) {
  return <ScanDetailClient id={params.id} />
} 