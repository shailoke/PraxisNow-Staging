import { checkAdmin } from '@/lib/admin-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const isAdmin = await checkAdmin()

    if (!isAdmin) {
        redirect('/')
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-mono">
            <aside className="w-64 bg-gray-950 text-gray-300 flex flex-col border-r border-gray-800">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-red-500 tracking-wider">MISSION CONTROL</h1>
                    <p className="text-xs text-gray-500 mt-1">INTERNAL ONLY</p>
                </div>
                <nav className="flex-1 px-3 space-y-1">
                    <NavLink href="/admin">Dashboard</NavLink>
                    <NavLink href="/admin/users">Users</NavLink>
                    <NavLink href="/admin/sessions">Sessions</NavLink>
                    <NavLink href="/admin/scenarios">Scenarios</NavLink>
                    <NavLink href="/admin/system">System Health</NavLink>
                    <NavLink href="/admin/dev-interview">Dev Interview</NavLink>
                </nav>
                <div className="p-6 text-xs text-gray-600">
                    Secured Connection
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
    return (
        <Link href={href} className="block px-3 py-2 hover:bg-gray-800 hover:text-white rounded text-sm transition-colors">
            {children}
        </Link>
    )
}
