'use client'

import { useEffect, useState } from 'react'

interface MicSelectorProps {
  onSelect: (deviceId: string) => void
}

export default function MicSelector({ onSelect }: MicSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')

  useEffect(() => {
    async function fetchDevices() {
      try {
        // Zugriff aufs Mikrofon anfordern
        await navigator.mediaDevices.getUserMedia({ audio: true })

        // Danach Mikrofone auflisten
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const mics = allDevices.filter(d => d.kind === 'audioinput')
        setDevices(mics)

        if (mics.length > 0) {
          setSelectedDevice(mics[0].deviceId)
          onSelect(mics[0].deviceId)
        }
      } catch (err) {
        console.error('Fehler beim Zugriff auf Mikrofone:', err)
      }
    }

    fetchDevices()
  }, [onSelect])

  return (
    <div className="relative group">
      <select
        value={selectedDevice}
        onChange={e => {
          setSelectedDevice(e.target.value)
          onSelect(e.target.value)
        }}
        className="w-full bg-[#0f172a]/80 text-[#4ecca3] border border-white/10 rounded-2xl p-4 pr-10 text-[11px] font-mono font-bold uppercase tracking-widest outline-none focus:border-[#4ecca3]/50 focus:ring-1 focus:ring-[#4ecca3]/20 transition-all appearance-none cursor-pointer shadow-inner"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234ecca3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '1rem'
        }}
      >
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId} className="bg-[#1e293b] text-white">
            {device.label || `Signal Source ${device.deviceId.slice(0, 5)}`}
          </option>
        ))}
      </select>
      
      {/* Kleiner Glow-Effekt unten drunter */}
      <div className="absolute -bottom-1 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#4ecca3]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  )
}