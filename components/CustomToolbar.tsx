
import React from 'react';
import { ToolbarProps } from 'react-big-calendar';

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);
const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CustomToolbar: React.FC<ToolbarProps> = ({ label, onNavigate, onView, view, views }) => {
    
    const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        onNavigate(action);
    };

    const changeView = (newView: string) => {
        onView(newView);
    };

    const goToNow = () => {
        onNavigate('TODAY');
        onView('day');
    };

    return (
        <div className="rbc-toolbar flex flex-col sm:flex-row items-center justify-between p-2 mb-2 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
                <button
                    type="button"
                    onClick={goToNow}
                    className="flex items-center gap-1 px-3 py-1 text-sm font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-md transition-colors"
                    title="Vai ad Ora (Vista Giorno)"
                >
                    <ClockIcon />
                    <span>Ora</span>
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>

                <button
                    type="button"
                    onClick={() => navigate('TODAY')}
                    className="px-3 py-1 text-sm font-semibold border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Oggi"
                >
                    Oggi
                </button>
                <button
                    type="button"
                    onClick={() => navigate('PREV')}
                    className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Precedente"
                >
                    <ChevronLeftIcon />
                </button>
                <button
                    type="button"
                    onClick={() => navigate('NEXT')}
                    className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Successivo"
                >
                    <ChevronRightIcon />
                </button>
            </div>
            <div className="text-lg font-bold capitalize text-gray-900 dark:text-white mb-2 sm:mb-0">
                {label}
            </div>
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-600 p-1 rounded-lg">
                {(views as string[]).map(v => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => changeView(v)}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            view === v
                                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                    >
                        {v === 'month' && 'Mese'}
                        {v === 'week' && 'Settimana'}
                        {v === 'day' && 'Giorno'}
                        {v === 'agenda' && 'Agenda'}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CustomToolbar;
