'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Camera, FileText, Upload, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
    user: any
    isOnboarding?: boolean
}

export default function ProfileForm({ user, isOnboarding = false }: ProfileFormProps) {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [uploadingResume, setUploadingResume] = useState(false)

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        designation: '',
        current_company: '',
        display_pic_url: '',
        resume_url: '',
        phone: ''
    })

    const fileInputRef = useRef<HTMLInputElement>(null)
    const resumeInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) return

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    designation: data.designation || '',
                    current_company: data.current_company || '',
                    display_pic_url: data.display_pic_url || data.avatar_url || '',
                    resume_url: data.resume_url || '',
                    phone: data.phone || ''
                })
            }
        }
        loadProfile()
    }, [user, supabase])

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingAvatar(true)
            if (!event.target.files || event.target.files.length === 0) return

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}-${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, display_pic_url: publicUrl }))
        } catch (error) {
            console.error(error)
            alert('Error uploading avatar')
        } finally {
            setUploadingAvatar(false)
        }
    }

    const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingResume(true)
            if (!event.target.files || event.target.files.length === 0) return

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}-${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            setFormData(prev => ({ ...prev, resume_url: filePath }))
        } catch (error) {
            console.error(error)
            alert('Error uploading resume')
        } finally {
            setUploadingResume(false)
        }
    }

    const handleSubmit = async (skip = false) => {
        if (!skip && !formData.last_name) {
            alert('Last Name is required')
            return
        }

        setLoading(true)
        try {
            const updates = {
                id: user.id,
                ...formData,
                onboarding_complete: true,
                // updated_at: new Date().toISOString(), // Removing this as column might be missing
            }

            const { error } = await supabase
                .from('users')
                .upsert(updates)

            if (error) throw error

            if (isOnboarding) {
                router.push('/dashboard')
            } else {
                alert('Profile updated!')
            }
            router.refresh()
        } catch (error: any) {
            console.error(error)
            alert(`Error updating profile: ${error.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 p-6 glass-panel rounded-2xl border border-white/10">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">
                    {isOnboarding ? 'Welcome to Praxis!' : 'Edit Profile'}
                </h1>
                <p className="text-gray-400">
                    {isOnboarding ? "Let's get to know you better." : 'Update your personal details.'}
                </p>
            </div>

            <div className="flex flex-col items-center gap-4">
                <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                    {formData.display_pic_url ? (
                        <img src={formData.display_pic_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Camera className="w-8 h-8" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                    </div>
                    {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                >
                    {formData.display_pic_url ? 'Change Photo' : 'Upload Photo'}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">First Name</label>
                    <input
                        type="text"
                        value={formData.first_name}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                        placeholder="John"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Name *</label>
                    <input
                        type="text"
                        value={formData.last_name}
                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                        className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600 ${!formData.last_name && 'border-red-500/50'}`}
                        placeholder="Doe"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Role / Title</label>
                    <input
                        type="text"
                        value={formData.designation}
                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                        placeholder="Product Manager, SDE II..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</label>
                    <input
                        type="text"
                        value={formData.current_company}
                        onChange={e => setFormData({ ...formData, current_company: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                        placeholder="Google, Startup, etc."
                    />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone Number (with Country Code)</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                        placeholder="+1 555-010-9999"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resume / CV</label>
                <div className="border border-white/10 bg-black/20 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-sm">
                            {formData.resume_url ? (
                                <span className="text-green-400">Resume Uploaded</span>
                            ) : (
                                <span className="text-gray-500">No resume uploaded</span>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resumeInputRef.current?.click()}
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        disabled={uploadingResume}
                    >
                        {uploadingResume ? 'Uploading...' : (formData.resume_url ? 'Replace' : 'Upload')}
                    </Button>
                    <input
                        type="file"
                        ref={resumeInputRef}
                        onChange={handleResumeUpload}
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-3">
                {isOnboarding && (
                    <Button
                        variant="ghost"
                        onClick={() => handleSubmit(true)}
                        className="text-gray-400 hover:text-white"
                    >
                        Skip for now
                    </Button>
                )}
                <Button
                    onClick={() => handleSubmit(false)}
                    disabled={loading || uploadingAvatar || uploadingResume || !formData.last_name}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-8"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    {isOnboarding ? 'Complete Onboarding' : 'Save Changes'}
                </Button>
            </div>
        </div>
    )
}
