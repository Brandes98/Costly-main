import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-5 custom-scroll">
          <div className="fade-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
