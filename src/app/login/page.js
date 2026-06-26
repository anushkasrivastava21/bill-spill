'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const formData = new FormData(event.currentTarget)
    
    const result = await login(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-page)' }}>
      <div className="card-elevated w-full max-w-sm flex flex-col gap-6" style={{ padding: '40px 32px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--color-ember)' }}>
            <i className="ti ti-receipt-2 text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-1)', letterSpacing: '-0.3px' }}>Welcome back</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-3)' }}>Sign in to Bill Spill</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Email</label>
            <input 
              name="email"
              type="email" 
              required
              className="input-field"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Password</label>
            <input 
              name="password"
              type="password" 
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-fill w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ height: '44px' }}
          >
            {loading ? (
              <><i className="ti ti-loader-2 animate-spin text-sm"></i> Signing in...</>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-[13px]" style={{ color: 'var(--color-text-3)' }}>
          Don't have an account?{' '}
          <Link href="/signup" className="font-medium" style={{ color: 'var(--color-ember-text)' }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
