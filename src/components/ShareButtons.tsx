import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFacebook, FaLinkedin, FaWhatsapp, FaLink } from 'react-icons/fa';
import { BsTwitterX } from 'react-icons/bs';

interface ShareButtonsProps {
  url?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  variant?: 'horizontal' | 'vertical';
}

export function ShareButtons({
  url,
  description,
  compact = false,
  variant = 'horizontal',
}: ShareButtonsProps) {
  const { t } = useTranslation('common');
  const [showToast, setShowToast] = useState(false);

  // Use current URL if not provided
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://www.dancetwin.com');
  const shareText = description || t('share.shareText');

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
  };

  const handleShare = (platform: keyof typeof shareUrls) => {
    window.open(shareUrls[platform], '_blank', 'width=600,height=400,scrollbars=yes');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const buttons = [
    {
      name: 'twitter',
      icon: BsTwitterX,
      color: 'text-white',
      hoverBg: 'hover:bg-white/10',
      label: t('share.twitter'),
      onClick: () => handleShare('twitter'),
    },
    {
      name: 'facebook',
      icon: FaFacebook,
      color: 'text-[#1877F2]',
      hoverBg: 'hover:bg-[#1877F2]/10',
      label: t('share.facebook'),
      onClick: () => handleShare('facebook'),
    },
    {
      name: 'linkedin',
      icon: FaLinkedin,
      color: 'text-[#0A66C2]',
      hoverBg: 'hover:bg-[#0A66C2]/10',
      label: t('share.linkedin'),
      onClick: () => handleShare('linkedin'),
    },
    {
      name: 'whatsapp',
      icon: FaWhatsapp,
      color: 'text-[#25D366]',
      hoverBg: 'hover:bg-[#25D366]/10',
      label: t('share.whatsapp'),
      onClick: () => handleShare('whatsapp'),
    },
    {
      name: 'copyLink',
      icon: FaLink,
      color: 'text-purple-400',
      hoverBg: 'hover:bg-purple-400/10',
      label: t('share.copyLink'),
      onClick: handleCopyLink,
    },
  ];

  return (
    <div className="relative">
      <div
        className={`flex ${
          variant === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        } gap-2 items-center justify-center`}
      >
        {!compact && (
          <span className="text-sm text-white/60 font-medium mr-2">
            {t('share.title')}:
          </span>
        )}

        {buttons.map((button) => {
          const Icon = button.icon;
          return (
            <button
              key={button.name}
              type="button"
              onClick={button.onClick}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg
                bg-white/5 border border-white/10
                transition-all duration-200
                ${button.hoverBg}
                hover:border-white/20
                active:scale-95
                ${compact ? 'p-2' : ''}
              `}
              aria-label={button.label}
              title={button.label}
            >
              <Icon className={`w-5 h-5 ${button.color}`} />
              {!compact && (
                <span className="text-sm text-white/90 whitespace-nowrap">
                  {button.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-2xl flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">{t('share.linkCopied')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
