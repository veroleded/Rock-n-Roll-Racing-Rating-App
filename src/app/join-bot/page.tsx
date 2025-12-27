'use client';

import { useI18n } from '@/lib/i18n/context';
import { getVersion } from '@/lib/version';
import { trpc } from '@/utils/trpc';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function JoinBotPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const version = getVersion();
  const isBogdan = version === 'bogdan';
  const discordLink = isBogdan ? 'https://discord.gg/4bDwf3zaZp' : 'https://discord.com/channels/';

  useEffect(() => {
    if (session?.user.hasJoinedBot) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (session?.user.hasJoinedBot) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('common.joinBotTitle')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">{t('common.joinBotDescription')}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{t('common.instructions')}:</h3>
              <div className="mt-2 text-sm text-gray-500">
                <ol className="list-decimal pl-4 space-y-2">
                  <li>{t('common.joinBotStep1')}</li>
                  <li>
                    {t('common.joinBotStep2')} <code>#commands</code>{' '}
                    {locale === 'ru' ? 'или' : 'or'} <code>#bot-commands</code>
                  </li>
                  <li>
                    {t('common.joinBotStep3')} <code>!join</code> {t('common.inThisChannel')}
                  </li>
                  <li>{t('common.joinBotStep4')}</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a
                  href={discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {isBogdan ? t('common.goToDiscordChannel') : t('common.goToDiscordServer')}
                </a>
              </div>
              <div className="text-sm">
                <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  {t('common.tryLoginAgain')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
