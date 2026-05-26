import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../features/login'

const stats = [
  {
    label: 'Account Status',
    value: 'Active',
    change: 'Since registration',
    icon: '🟢',
    color: 'emerald',
  },
  {
    label: 'Security Layer',
    value: 'Protected',
    change: 'Redux state guard',
    icon: '🛡️',
    color: 'indigo',
  },
  {
    label: 'Session Token',
    value: 'Verified',
    change: 'LocalStorage synced',
    icon: '🔑',
    color: 'violet',
  },
]

const activity = [
  { action: 'Account created', time: 'Just now', icon: '✨' },
  { action: 'Session started', time: '1 min ago', icon: '🔐' },
  { action: 'Redux store initialized', time: '1 min ago', icon: '⚡' },
  { action: 'Auth token saved', time: '1 min ago', icon: '💾' },
]

const colorMap = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
}

function Home() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const users = useSelector((state) => state.login)
  const loggedInUser = users?.find(user => user.isLogin === true)
  const name = loggedInUser?.name || 'Guest'

  const handleLogOut = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f1117]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">D</div>
            <span className="text-white font-bold text-lg tracking-tight">DashApp</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              Beta
            </span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200">
              🔔
            </button>

            {/* Avatar + Name */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-200 hidden sm:block">{name}</span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200 cursor-pointer active:scale-[0.97]"
            >
              <span className="hidden sm:inline">Sign out</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-indigo-950/60 via-[#0f1117] to-violet-950/60 p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.12)_0%,_transparent_60%)]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-400 text-sm font-medium mb-1">Dashboard Overview</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome back, {name} 👋
              </h1>
              <p className="mt-2 text-gray-400 text-sm max-w-lg">
                Here's a real-time overview of your account health, security status, and active session metrics.
              </p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 hover:bg-white/[0.07] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">{stat.label}</span>
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base ${colorMap[stat.color]}`}>
                  {stat.icon}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent Activity</h2>
              <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">Today</span>
            </div>
            <div className="space-y-1">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all duration-150">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{item.action}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Your Profile</h2>
            <div className="flex flex-col items-center text-center space-y-3 py-2">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{name}</p>
                <p className="text-gray-500 text-xs mt-0.5">Authenticated User</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Session
              </span>
            </div>
            <div className="space-y-2 pt-2 border-t border-white/10">
              {[
                { label: 'Role', value: 'Member' },
                { label: 'Auth', value: 'Redux Store' },
                { label: 'Storage', value: 'LocalStorage' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="text-gray-300 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-gray-600">
          <span>© 2025 DashApp</span>
          <span>Built with React & Redux</span>
        </div>
      </footer>
    </div>
  )
}

export default Home
