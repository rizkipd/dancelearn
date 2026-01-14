import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/SEO';
import { StructuredData } from '../components/StructuredData';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white pr-4">{item.question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-400 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export function FAQPage() {
  const { t } = useTranslation(['faq', 'common']);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqItems = t('items', { returnObjects: true }) as FAQItem[];
  const categories = t('categories', { returnObjects: true }) as Record<string, string>;

  const categoryKeys = Object.keys(categories);
  const filteredFaqs = activeCategory === 'all'
    ? faqItems
    : faqItems.filter(f => f.category === activeCategory);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is my video uploaded to a server?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No! All processing happens locally in your browser using WebAssembly. Your camera feed is never recorded or sent to any server. DanceTwin is 100% private and runs entirely in your browser."
        }
      },
      {
        "@type": "Question",
        "name": "Can I slow down the dance video to learn moves?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! DanceTwin supports playback speed from 0.5x (slow motion) to 1.5x (faster). You can adjust the speed anytime during practice to match your learning pace. Slower speeds are perfect for mastering complex choreography."
        }
      },
      {
        "@type": "Question",
        "name": "How does the AI feedback system work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "DanceTwin uses AI to compare your movements with the teacher video in real-time. Instead of showing scores or grades, it provides encouraging messages like 'You're on fire!' or 'Nice moves!' to keep you motivated and having fun."
        }
      },
      {
        "@type": "Question",
        "name": "What is mirror mode and when should I use it?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mirror mode horizontally flips your camera feed, making it easier to follow along when the teacher is facing you. Enable it in the settings before starting your practice session. Most users find mirror mode more intuitive for learning."
        }
      },
      {
        "@type": "Question",
        "name": "What video formats are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "DanceTwin supports MP4, WebM, and MOV video formats. For best results, use videos with clear full-body movements and good lighting. You can upload any dance video from your device."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need to install any software?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No installation needed! DanceTwin runs entirely in your web browser. Just visit the website, upload a video, and start dancing. Works on Chrome, Edge, Firefox, and Safari (latest versions recommended)."
        }
      }
    ]
  };

  return (
    <>
      <SEO
        title="FAQ - Frequently Asked Questions"
        description="Common questions about DanceTwin: privacy, browser compatibility, how the AI works, and more. Get answers to your dance training questions."
        canonical="https://www.dancetwin.com/faq"
      />
      <StructuredData data={faqSchema} />
      <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-gray-400 text-lg">
              {t('subtitle')}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categoryKeys.map((key) => (
              <button
                key={key}
                onClick={() => {
                  setActiveCategory(key);
                  setOpenIndex(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === key
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'glass text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {categories[key]}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-3 mb-8">
            {filteredFaqs.map((faq, index) => (
              <FAQAccordion
                key={index}
                item={faq}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>

          {/* Still Have Questions */}
          <div className="glass rounded-2xl p-6 sm:p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">{t('stillHaveQuestions')}</h2>
            <p className="text-gray-400 mb-4">
              {t('checkGuide')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/how-to-use"
                className="inline-flex items-center gap-2 px-6 py-3 btn-primary rounded-xl text-white font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {t('common:nav.howToUse')}
              </Link>
              <div className="text-gray-500">
                {t('contactUs')}{' '}
                <a
                  href={`mailto:${t('email')}`}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {t('email')}
                </a>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 btn-secondary rounded-xl text-white font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('common:buttons.backToHome')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
    </>
  );
}
