import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface HeaderProps {
  showStatus?: boolean;
  isPoseLoading?: boolean;
  isPoseReady?: boolean;
}

export function Header({ showStatus = false, isPoseLoading = false, isPoseReady = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/how-to-use', label: t('nav.howToUse') },
    { path: '/about', label: t('nav.about') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="relative z-50 glass border-b border-white/10 px-4 sm:px-6 py-2 sm:py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo + App Name */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
          <img
            src="/DanceTwin-Logo-Transparent.png"
            alt="DanceTwin"
            className="h-12 sm:h-14 w-auto drop-shadow-lg"
          />
          <div className="hidden sm:block">
            <h1 className="text-xl sm:text-2xl font-bold gradient-text-static leading-none">
              DanceTwin
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Move like your twin</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive(link.path)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2">
            <LanguageSwitcher />
          </div>
        </nav>

        {/* Status Indicator (for training pages) */}
        {showStatus && (
          <div className="flex items-center gap-3">
            {isPoseLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                <div className="sound-wave">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <span className="text-xs sm:text-sm text-cyan-400">{t('status.loading')}</span>
              </div>
            )}
            {isPoseReady && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass glow-cyan">
                <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
                <span className="text-xs sm:text-sm text-cyan-400 font-medium">{t('status.ready')}</span>
              </div>
            )}
            <LanguageSwitcher compact />
          </div>
        )}

        {/* Mobile Menu Button */}
        {!showStatus && (
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher compact />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && !showStatus && (
        <div className="md:hidden absolute top-full left-0 right-0 glass border-b border-white/10 py-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-6 py-3 text-sm font-medium transition-all ${
                isActive(link.path)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
