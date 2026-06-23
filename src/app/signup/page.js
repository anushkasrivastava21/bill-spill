'use client'

import { useState } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    
    const result = await signup(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-4 wave-pattern">
      <div className="glass-card w-full max-w-md p-lg rounded-2xl flex flex-col gap-md relative">
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col items-center gap-xs z-10 text-center">
          <span className="material-symbols-outlined text-primary text-5xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
          <h1 className="font-display-lg text-[28px] text-on-surface">Create a fresh account</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md mt-4 z-10">
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-on-surface-variant">Your Full Name</label>
            <input 
              name="name"
              type="text" 
              required
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none"
              placeholder="Aisha Sharma"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-on-surface-variant">Email Address</label>
            <input 
              name="email"
              type="email" 
              required
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none"
              placeholder="aisha@example.com"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-on-surface-variant">Choose a Password</label>
            <input 
              name="password"
              type="password" 
              required
              minLength={6}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md outline-none"
              placeholder="••••••••"
            />
            <span className="text-xs text-outline font-body-md mt-1">Must be at least 6 characters</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#4ade80] text-[#064e3b] rounded-xl font-label-md font-bold flex items-center justify-center gap-sm pressable shadow-md disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Creating...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center font-body-md text-sm text-on-surface-variant mt-4 z-10">
          Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}
