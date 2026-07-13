import { Outlet, Link, useLocation } from 'react-router-dom';

export default function MainLayout() {
  const location = useLocation();
  const onDashboard = location.pathname === '/dashboard';

  return (
    <div className="min-h-screen bg-[#131314] text-white font-sans">
      {/* Top Nav */}
      <nav className="bg-[#131314]/90 backdrop-blur-sm border-b border-[#333333] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 group">
              {/* Book icon */}
              <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                Scholar<span className="text-indigo-400">AI</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {[
                { name: 'Home', path: '/' },
                { name: 'Research Workspace', path: '/dashboard' },
              ].map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    link.name === 'Home'
                      ? 'bg-[#333333] border border-[#333333] text-white hover:bg-[#444444]'
                      : location.pathname === link.path
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-0 shadow-sm'
                        : 'text-neutral-400 border border-transparent hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className={onDashboard ? 'max-w-[1400px] mx-auto px-4 py-4' : 'max-w-7xl mx-auto px-6 lg:px-8'}>
        <Outlet />
      </main>
    </div>
  );
}
