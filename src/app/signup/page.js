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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-page)' }}>
      <div className="card-elevated w-full max-w-sm flex flex-col gap-6" style={{ padding: '40px 32px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--color-ember)' }}>
            <i className="ti ti-users-group text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-1)', letterSpacing: '-0.3px' }}>Create an account</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-3)' }}>Start splitting bills with friends</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Full name</label>
            <input 
              name="name"
              type="text" 
              required
              className="input-field"
              placeholder="Anushka Sharma"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Email</label>
            <input 
              name="email"
              type="email" 
              required
              className="input-field"
              placeholder="anushka@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-3)' }}>Password</label>
            <input 
              name="password"
              type="password" 
              required
              minLength={6}
              className="input-field"
              placeholder="••••••••"
            />
            <span className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>Must be at least 6 characters</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-fill w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ height: '44px' }}
          >
            {loading ? (
              <><i className="ti ti-loader-2 animate-spin text-sm"></i> Creating...</>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="text-center text-[13px]" style={{ color: 'var(--color-text-3)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--color-ember-text)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
