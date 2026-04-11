import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen((current) => !current)
      return
    }

    setSidebarCollapsed((current) => !current)
  }

  const content = (
    <main className="w-0 flex-1 flex flex-col overflow-hidden min-w-0">
      <Topbar
        isMobile={isMobile}
        isSidebarOpen={sidebarOpen}
        isSidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />
      <div className="flex-1 overflow-y-auto p-5 custom-scroll min-w-0">
        <div className="fade-up w-full min-w-0">
          <Outlet />
        </div>
      </div>
    </main>
  )

  if (isMobile) {
    return (
      <div className="h-screen w-full overflow-hidden">
        <div className="flex h-full w-full overflow-hidden">{content}</div>
        <Sidebar
          isMobile
          isOpen={sidebarOpen}
          isCollapsed={false}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        isMobile={false}
        isOpen
        isCollapsed={sidebarCollapsed}
        onClose={() => {}}
      />
      {content}
    </div>
  )
}
