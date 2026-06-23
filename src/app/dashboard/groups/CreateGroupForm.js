'use client'

import { useState } from 'react'
import { createGroup } from '@/app/actions/groups'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function CreateGroupForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    
    const result = await createGroup(formData)
    
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success('Group created!')
      router.push(`/dashboard/groups/${result.groupId}`)
    }
  }

  return (
    <div className="glass-card rounded-xl p-md relative overflow-hidden wave-pattern">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none"></div>
      <div className="flex items-center gap-sm mb-lg z-10 relative">
        <span className="material-symbols-outlined text-primary text-3xl">add_circle</span>
        <h2 className="font-title-md text-title-md text-on-surface">Chart a New Course</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 relative z-10 items-end">
        <div className="flex flex-col gap-xs flex-1">
          <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-xs">
            <span className="material-symbols-outlined text-sm">directions_boat</span>
            Voyage Name
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">anchor</span>
            <input name="name" type="text" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-10 pr-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none" placeholder="e.g., Bahamas Bash '24" />
          </div>
        </div>
        
        <button type="submit" disabled={loading} className="w-full md:w-auto py-2 px-6 bg-primary text-on-primary rounded-xl font-label-md flex items-center justify-center gap-sm pressable shadow-md ocean-gradient disabled:opacity-70 h-[42px] flex-shrink-0">
          {loading ? (
            <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>Creating...</>
          ) : (
            <><span className="material-symbols-outlined text-sm">explore</span>Create Trip</>
          )}
        </button>
      </form>
    </div>
  )
}
