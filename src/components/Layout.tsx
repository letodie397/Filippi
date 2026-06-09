import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  PlusCircle,
  Menu,
  X,
  Church,
} from 'lucide-react'
import { APP_VERSION } from '../config/version'
import { SyncIndicator } from './SyncIndicator'
import { SyncErrorBanner } from './SyncErrorBanner'
import { PageContainer } from './PageContainer'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { to: '/pedidos/novo', icon: PlusCircle, label: 'Novo' },
  { to: '/prestadores', icon: Users, label: 'Prestadores' },
]

function getPageTitle(pathname: string): string {
  const item = navItems.find((n) =>
    n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)
  )
  if (item?.label === 'Novo') return 'Novo Pedido'
  return item?.label ?? 'ICM Pedidos'
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex min-h-dvh bg-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[17.5rem] lg:w-56 xl:w-60 bg-icm-red-800 text-white transform transition-transform duration-300 lg:translate-x-0 shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-icm-red-700 safe-top">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
              <Church className="text-icm-red-700" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight">ICM Pedidos</h1>
              <p className="text-icm-red-200 text-[11px]">Espírito Santo</p>
            </div>
            <button
              type="button"
              className="ml-auto lg:hidden p-2 -mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-icm-red-800 shadow-sm'
                      : 'text-icm-red-100 hover:bg-icm-red-700 hover:text-white'
                  }`
                }
              >
                <item.icon size={18} />
                <span className="truncate">
                  {item.label === 'Novo' ? 'Novo Pedido' : item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-icm-red-700 safe-bottom">
            <p className="text-icm-red-300 text-[11px] text-center">
              Igreja Cristã Maranata
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <SyncIndicator inverted />
              <p className="text-icm-red-400/60 text-[10px] tracking-wide">
                v{APP_VERSION}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 safe-top">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
            <button
              type="button"
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm lg:text-base truncate lg:hidden">
                {pageTitle}
              </p>
              <p className="hidden lg:block font-semibold text-gray-900 text-base">
                {pageTitle}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SyncIndicator />
              <span className="hidden sm:inline text-[10px] text-gray-400 tracking-wide">
                v{APP_VERSION}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-24 lg:pb-6">
          <PageContainer className="px-4 lg:px-6 pt-4 lg:pt-6">
            <SyncErrorBanner />
          </PageContainer>
          <PageContainer className="px-4 lg:px-6 pb-6">
            <Outlet />
          </PageContainer>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 safe-bottom">
          <div className="grid grid-cols-4 max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-icm-red-700'
                      : 'text-gray-500 active:text-icm-red-600'
                  }`}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
