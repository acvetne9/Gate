import { Shield, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext'

interface FooterProps {
  showCopyright?: boolean;
}

export function Footer({ showCopyright = true }: FooterProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme()

  return (
    <footer className="border-t border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 group cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-green-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-slate-100">Gate</span>
          </div>
          <div className="flex items-center gap-4">
            {showCopyright && (
              <p className="text-sm text-gray-500">© 2024 Gate Securities LLC</p>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] flex items-center transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
