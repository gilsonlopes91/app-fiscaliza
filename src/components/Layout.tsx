import React, { useEffect, useRef, useState, useId } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, Building2, ClipboardCheck } from 'lucide-react'

interface TabItem {
  id: string
  label: string
  path: string
  icon: React.ElementType
}

const TABS: TabItem[] = [
  {
    id: 'hospitais',
    label: 'Hospitais',
    path: '/hospitais',
    icon: Building2,
  },
  {
    id: 'vistoria',
    label: 'Vistoria',
    path: '/vistoria',
    icon: ClipboardCheck,
  },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const tabListRef = useRef<HTMLDivElement>(null)
  const tabButtonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const tabsContainerId = useId()

  const currentPath = location.pathname
  const activeTabIndex = TABS.findIndex((tab) => tab.path === currentPath)
  // Fallback to 0 (Hospitais) if unknown path or root before redirect
  const safeActiveIndex = activeTabIndex >= 0 ? activeTabIndex : 0

  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  })

  // Measure and update active indicator position
  useEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = tabButtonsRef.current[safeActiveIndex]
      const containerEl = tabListRef.current

      if (currentTabEl && containerEl) {
        const containerRect = containerEl.getBoundingClientRect()
        const tabRect = currentTabEl.getBoundingClientRect()
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [safeActiveIndex])

  // Keyboard navigation for accessible tabs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = -1
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextIndex = (index + 1) % TABS.length
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      nextIndex = (index - 1 + TABS.length) % TABS.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIndex = TABS.length - 1
    }

    if (nextIndex !== -1) {
      const nextTab = TABS[nextIndex]
      navigate(nextTab.path)
      tabButtonsRef.current[nextIndex]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F4] text-[#14201A] flex flex-col font-sans selection:bg-[#E6F4EE] selection:text-[#0B6E4F]">
      {/* Fixed Header & Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#FFFFFF]">
        {/* Top Header */}
        <header
          role="banner"
          className="h-14 sm:h-16 border-b border-[#DDE5DF] bg-[#FFFFFF] px-5 sm:px-8"
        >
          <div className="max-w-[1100px] h-full mx-auto flex items-center">
            <div className="flex items-center gap-3">
              {/* Brand Shield Icon */}
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0B6E4F] flex items-center justify-center text-white shadow-sm shrink-0"
                aria-hidden="true"
              >
                <ShieldCheck className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              {/* App Name */}
              <span className="text-[18px] sm:text-[20px] font-bold text-[#14201A] tracking-[-0.01em] select-none">
                Fiscalização
              </span>
            </div>
          </div>
        </header>

        {/* Tab Bar */}
        <nav
          role="navigation"
          aria-label="Navegação principal"
          className="h-[50px] sm:h-[52px] border-b border-[#DDE5DF] bg-[#FFFFFF] px-5 sm:px-8"
        >
          <div className="max-w-[1100px] h-full mx-auto flex items-stretch">
            <div
              ref={tabListRef}
              role="tablist"
              aria-orientation="horizontal"
              className="relative flex items-stretch w-full sm:w-auto gap-0 sm:gap-1"
            >
              {TABS.map((tab, idx) => {
                const isActive = idx === safeActiveIndex
                const IconComponent = tab.icon

                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}-${tabsContainerId}`}
                    ref={(el) => {
                      tabButtonsRef.current[idx] = el
                    }}
                    role="tab"
                    type="button"
                    tabIndex={isActive ? 0 : -1}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => navigate(tab.path)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className={`
                      relative flex items-center justify-center gap-2 font-semibold text-[15px]
                      px-3 sm:px-[18px] py-0 transition-colors duration-150 rounded-t-md outline-none
                      min-h-[48px] sm:min-h-[50px] flex-1 sm:flex-initial cursor-pointer select-none
                      focus-visible:ring-2 focus-visible:ring-[#0B6E4F]/40 focus-visible:ring-offset-2
                      ${
                        isActive
                          ? 'text-[#0B6E4F]'
                          : 'text-[#5C6B63] hover:text-[#0B6E4F] hover:bg-[#E6F4EE]/70'
                      }
                    `}
                  >
                    <IconComponent
                      className={`w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-[#0B6E4F]' : 'text-[#5C6B63]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{tab.label}</span>
                  </button>
                )
              })}

              {/* Sliding Bottom Active Indicator */}
              <div
                className="absolute bottom-0 h-[3px] bg-[#0B6E4F] rounded-full pointer-events-none transition-all duration-250 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content Area with Fixed Header + Tab Bar Offset */}
      {/* 56px (header mobile) + 50px (tab mobile) = 106px */}
      {/* 64px (header desktop) + 52px (tab desktop) = 116px */}
      <main
        className="flex-1 pt-[106px] sm:pt-[116px] pb-12 px-5 sm:px-8"
        id={`panel-${TABS[safeActiveIndex]?.id || 'main'}`}
        role="region"
        aria-labelledby={`tab-${TABS[safeActiveIndex]?.id || 'hospitais'}-${tabsContainerId}`}
      >
        <div className="max-w-[1100px] mx-auto pt-7 sm:pt-9">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
