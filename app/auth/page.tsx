import AuthForm from '@/components/AuthForm'
import Image from 'next/image'

export default function AuthPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0f]">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>

            <div className="z-10 w-full flex flex-col items-center">
                <div className="flex items-center gap-4 mb-2 mt-4">
                    <Image
                        src="/praxisnow-logo-dark.svg"
                        alt="PraxisNow"
                        width={280}
                        height={56}
                        className="h-14 w-auto"
                        priority
                    />
                </div>
                <p className="text-gray-400 mb-8 mt-2">Master your interview skills</p>
                <AuthForm />
            </div>
        </div>
    )
}
