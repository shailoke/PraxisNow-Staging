'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Chrome, ArrowLeft } from 'lucide-react'

export default function AuthForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [message, setMessage] = useState('')

    const supabase = createClient()

    const validatePassword = (pass: string) => {
        if (pass.length < 8) return "Password must be at least 8 characters"
        if (!/[A-Z]/.test(pass)) return "Password must contain an uppercase letter"
        if (!/[0-9]/.test(pass)) return "Password must contain a number"
        if (!/[!@#$%^&*]/.test(pass)) return "Password must contain a special character (!@#$%^&*)"
        return null
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
            })
            if (error) setMessage('Google Login Failed: ' + error.message)
        } catch (err) {
            setMessage('An unexpected error occurred')
        }
        setLoading(false)
    }



    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        const trimmedEmail = email.trim()

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
            })
            if (error) {
                setMessage(error.message)
            } else {
                setMessage('Check your email for the password reset link.')
            }
        } catch (err) {
            setMessage('An unexpected error occurred')
        }
        setLoading(false)
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        const trimmedEmail = email.trim()

        // Password Validation for Sign Up
        if (isSignUp) {
            const validationError = validatePassword(password)
            if (validationError) {
                setMessage(validationError)
                setLoading(false)
                return
            }
        }

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email: trimmedEmail,
                    password,
                })
                if (error) {
                    setMessage(error.message)
                } else {
                    setMessage('Success! Check your email to confirm your account.')
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: trimmedEmail,
                    password,
                })
                if (error) {
                    setMessage(error.message)
                } else {
                    window.location.href = '/dashboard'
                }
            }
        } catch (err) {
            setMessage('An unexpected error occurred')
        }
        setLoading(false)
    }

    // Forgot Password View
    if (isForgotPassword) {
        return (
            <div className="w-full max-w-md p-8 glass-panel rounded-2xl glow text-center">
                <button
                    onClick={() => { setIsForgotPassword(false); setMessage('') }}
                    className="absolute top-8 left-8 text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-3xl font-bold mb-2 text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Reset Password
                </h2>
                <p className="text-gray-400 text-sm mb-6">Enter your email to receive a reset link.</p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                {message && (
                    <p className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Check') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-200 border border-red-500/20'}`}>
                        {message}
                    </p>
                )}
            </div>
        )
    }

    // Main Sign In/Up View
    return (
        <div className="w-full max-w-md p-8 glass-panel rounded-2xl glow text-center relative">
            <h2 className="text-3xl font-bold mb-6 text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 glass-btn rounded-lg text-white font-medium mb-6 hover:scale-[1.02] active:scale-95"
            >
                <Chrome className="w-5 h-5 text-purple-400" />
                Continue with Google
            </button>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#0a0a0f] text-gray-500">Or continue with email</span>
                </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    required
                />
                <div className="space-y-1 text-left">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        required
                    />
                    {!isSignUp && (
                        <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-xs text-gray-400 hover:text-purple-400 pt-1"
                        >
                            Forgot Password?
                        </button>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
            </form>

            {message && (
                <p className={`mt-4 p-3 rounded-lg text-sm border text-left ${message.includes('Success') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-200 border-red-500/20'}`}>
                    {message}
                </p>
            )}

            <p className="mt-6 text-gray-400 text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                {' '}
                <button
                    onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
                    className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
                >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
            </p>
        </div>
    )
}
