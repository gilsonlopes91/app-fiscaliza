import React, { useEffect, useRef, useState, useId } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Building2, ClipboardCheck } from 'lucide-react'
import logoCreaPi from '@/assets/logocreapiazul-919d6.png'

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
    <div className="min-h-screen bg-[#F4F6F9] text-[#102A43] flex flex-col font-sans selection:bg-[#E8F1F8] selection:text-[#004B8D]">
      {/* Fixed Header & Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#004B8D] shadow-md">
        {/* Top Header with official CREA-PI branding */}
        <header
          role="banner"
          className="h-16 sm:h-20 bg-[#004B8D] border-b border-[#003666] px-5 sm:px-8"
        >
          <div className="max-w-[1100px] h-full mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* CREA-PI Official Logo */}
              <div className="flex items-center gap-2 sm:gap-3 py-1">
                <img
                  src={logoCreaPi}
                  alt="CREA-PI - Conselho Regional de Engenharia e Agronomia do Piauí"
                  className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm brightness-105"
                />
                <div className="h-8 w-px bg-white/25 hidden sm:block mx-1" aria-hidden="true" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] sm:text-[19px] font-bold text-white tracking-tight leading-tight select-none">
                      Fiscalização
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider bg-[#E5A812] text-[#102A43] px-1.5 py-0.5 rounded shadow-sm">
                      Hospitalar
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-[12px] text-blue-100 hidden sm:block leading-tight font-medium opacity-90">
                    Sistema de Vistoria e Conformidade Técnica
                  </span>
                </div>
              </div>
            </div>

            {/* Right side info badge */}
            <div className="hidden md:flex items-center gap-2 text-white/90 text-xs bg-[#003666]/70 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#E5A812] animate-pulse" />
              <span className="font-medium text-white">Divisão de Fiscalização</span>
              <span className="text-blue-200">•</span>
              <span className="text-blue-200">CREA-PI</span>
            </div>
          </div>
        </header>

        {/* Tab Bar - Clean white / light slate navigation with active blue underline */}
        <nav
          role="navigation"
          aria-label="Navegação principal"
          className="h-[50px] sm:h-[52px] border-b border-[#D3DFE9] bg-white px-5 sm:px-8 shadow-sm"
        >
          <div className="max-w-[1100px] h-full mx-auto flex items-stretch">
            <div
              ref={tabListRef}
              role="tablist"
              aria-orientation="horizontal"
              className="relative flex items-stretch w-full sm:w-auto gap-1 sm:gap-2"
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
                      relative flex items-center justify-center gap-2 font-bold text-[14px] sm:text-[15px]
                      px-4 sm:px-6 py-0 transition-all duration-150 rounded-t-md outline-none
                      min-h-[48px] sm:min-h-[50px] flex-1 sm:flex-initial cursor-pointer select-none
                      focus-visible:ring-2 focus-visible:ring-[#004B8D]/40 focus-visible:ring-offset-2
                      ${
                        isActive
                          ? 'text-[#004B8D] bg-gradient-to-b from-[#E8F1F8]/50 to-white'
                          : 'text-[#486581] hover:text-[#004B8D] hover:bg-[#E8F1F8]/60'
                      }
                    `}
                  >
                    <IconComponent
                      className={`w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-[#004B8D] stroke-[2.3]' : 'text-[#627D98]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{tab.label}</span>
                  </button>
                )
              })}

              {/* Sliding Bottom Active Indicator with CREA-PI deep blue and amber accent */}
              <div
                className="absolute bottom-0 h-[3.5px] bg-[#004B8D] rounded-t-full pointer-events-none transition-all duration-250 ease-out"
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
      {/* 64px (header mobile) + 50px (tab mobile) = 114px */}
      {/* 80px (header desktop) + 52px (tab desktop) = 132px */}
      <main
        className="flex-1 pt-[120px] sm:pt-[136px] pb-12 px-5 sm:px-8"
        id={`panel-${TABS[safeActiveIndex]?.id || 'main'}`}
        role="region"
        aria-labelledby={`tab-${TABS[safeActiveIndex]?.id || 'hospitais'}-${tabsContainerId}`}
      >
        <div className="max-w-[1100px] mx-auto pt-5 sm:pt-7">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
