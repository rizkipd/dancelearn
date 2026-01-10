import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 glass border-t border-white/10 px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <Link
              to="/about"
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t('nav.about')}
            </Link>
            <span className="hidden sm:inline text-gray-600">|</span>
            <Link
              to="/privacy"
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t('nav.privacy')}
            </Link>
            <span className="hidden sm:inline text-gray-600">|</span>
            <Link
              to="/how-to-use"
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t('nav.howToUse')}
            </Link>
            <span className="hidden sm:inline text-gray-600">|</span>
            <Link
              to="/faq"
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t('nav.faq')}
            </Link>
            <span className="hidden sm:inline text-gray-600">|</span>
            <a
              href={`mailto:${t('footer.email')}`}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {t('footer.contact')}
            </a>
          </nav>

          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t('footer.copyright')}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{t('footer.localProcessing')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
