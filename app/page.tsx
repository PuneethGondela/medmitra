'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, Stethoscope, Users, Shield } from 'lucide-react'
import { getCurrentUser } from '@/lib/firebase-helpers'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in and redirect
    const adminToken = localStorage.getItem('admin_token')
    const doctorToken = localStorage.getItem('doctor_token')
    
    // Check Firebase Auth session
    getCurrentUser().then((user) => {
      if (user || adminToken || doctorToken) {
        // Redirect based on role
        if (adminToken) router.push('/admin')
        else if (doctorToken) router.push('/doctor')
        else if (user) router.push('/worker')
      }
    })
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Med Mitra</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Your Health Companion
            <span className="block text-primary-600">AI-Powered Healthcare</span>
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Connecting healthcare workers, doctors, and patients with intelligent solutions for better health outcomes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Stethoscope className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Doctor Dashboard</h3>
            <p className="text-slate-600">Manage patients, find blood donors, and access medical resources with AI assistance.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-accent-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Health Workers</h3>
            <p className="text-slate-600">Record patient visits, manage health records, and get personalized health guidance.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-secondary-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Admin Portal</h3>
            <p className="text-slate-600">Monitor system security, manage users, and track system health with AI-powered insights.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600">
            <p>&copy; 2025 Med Mitra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
