import React from 'react';
import { useLocalization } from '../hooks/useLocalization';

interface InfoSecurityModalProps {
    onAgree: () => void;
}

export const InfoSecurityModal: React.FC<InfoSecurityModalProps> = ({ onAgree }) => {
    const { t } = useLocalization();

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1b263b] border border-[#4f46e5]/40 rounded-lg shadow-2xl max-w-2xl w-full p-6 text-gray-300" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-indigo-300 mb-4">{t('securityModalTitle')}</h2>
                <div className="space-y-3 text-sm leading-relaxed max-h-[70vh] overflow-y-auto pr-2">
                    <p>{t('securityModalP1')}</p>
                    <p className="font-bold text-yellow-300">{t('securityModalP2')}</p>
                    <ol className="list-decimal list-inside space-y-2 pl-2 border-l-2 border-yellow-500/50 ml-2 py-2">
                        <li>
                            <strong className="text-white">{t('securityModalL1Title')}</strong>
                            {' '}
                            {t('securityModalL1Desc')}
                        </li>
                        <li>
                            <strong className="text-white">{t('securityModalL2Title')}</strong>
                            {' '}
                            {t('securityModalL2Desc')}
                        </li>
                        <li>
                             <strong className="text-white">{t('securityModalL3Title')}</strong>
                             {' '}
                             {t('securityModalL3Desc')}
                        </li>
                    </ol>
                    <p className="mt-4">{t('securityModalP3')}</p>
                </div>
                <div className="mt-6 text-right">
                    <button
                        onClick={onAgree}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-md transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    >
                        {t('securityModalAgree')}
                    </button>
                </div>
            </div>
        </div>
    );
};
