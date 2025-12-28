
import React, { useMemo } from 'react';
import { ToolbarProps } from 'react-big-calendar';
import moment from 'moment';

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

const CustomToolbar: React.FC<ToolbarProps> = ({ date, onNavigate, onView, view, views }) => {
    
    const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        onNavigate(action);
    };

    const changeView = (newView: string) => {
        onView(newView);
    };

    const goToNow = () => {
        onNavigate('TODAY');
        // Se siamo in agenda, restiamo in agenda ma andiamo a oggi. Altrimenti switch a day.
        if (view !== 'agenda') {
            onView('day');
        }
    };

    // Genera lista anni (es. 5 anni prima e 5 dopo l'attuale visualizzato)
    const years = useMemo(() => {
        const currentYear = date.getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 5;
        const yearsList = [];
        for (let i = startYear; i <= endYear; i++) {
            yearsList.push(i);
        }
        return yearsList;
    }, [date]);

    const months = moment.months(); // Ottiene i nomi dei mesi localizzati (da moment config in App.tsx)

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonth = parseInt(e.target.value);
        const newDate = new Date(date);
        newDate.setMonth(newMonth);
        onNavigate('DATE', newDate);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(e.target.value);
        const newDate = new Date(date);
        newDate.setFullYear(newYear);
        onNavigate('DATE', newDate);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateString = e.target.value;
        if (dateString) {
            const newDate = moment(dateString).toDate();
            onNavigate('DATE', newDate);
        }
    };

    return (
        <div className="rbc-toolbar flex flex-col sm:flex-row items-center justify-between p-2 mb-2 bg-gray-50 dark:bg-gray-700 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
            {/* Left: Navigation Buttons */}
            <div className="flex items-center gap-2 mb-2 sm:mb-0 w-full sm:w-auto justify-center sm:justify-start">
                <button
                    type="button"
                    onClick={goToNow}
                    className="flex items-center gap-1 px-3 py-1 text-sm font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-md transition-colors shadow-sm"
                    title={view === 'agenda' ? "Vai a Oggi" : "Vai ad Ora (Vista Giorno)"}
                >
                    <ClockIcon />
                    <span className="hidden xs:inline">{view === 'agenda' ? 'Oggi' : 'Ora'}</span>
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>

                <button
                    type="button"
                    onClick={() => navigate('TODAY')}
                    className="px-3 py-1 text-sm font-semibold border border-gray-300 dark:border-gray-500 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm"
                    aria-label="Oggi"
                >
                    Default
                </button>
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-500 shadow-sm">
                    <button
                        type="button"
                        onClick={() => navigate('PREV')}
                        className="p-1.5 rounded-l-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-r border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                        aria-label="Precedente"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('NEXT')}
                        className="p-1.5 rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300"
                        aria-label="Successivo"
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>

            {/* Center: Month/Year Dropdowns OR Specific Date Input (for Agenda) */}
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
                {view === 'agenda' ? (
                    <div className="flex items-center gap-2 animate-fadeIn">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Inizio Agenda:</span>
                        <input 
                            type="date" 
                            value={moment(date).format('YYYY-MM-DD')} 
                            onChange={handleDateChange}
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-bold shadow-sm"
                        />
                    </div>
                ) : (
                    <>
                        <div className="relative group">
                            <select
                                value={date.getMonth()}
                                onChange={handleMonthChange}
                                className="appearance-none bg-transparent text-lg md:text-xl font-bold text-gray-900 dark:text-white cursor-pointer py-1 pr-6 pl-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                            >
                                {months.map((m, idx) => (
                                    <option key={m} value={idx} className="text-gray-900 bg-white dark:bg-gray-800">
                                        {m}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500 dark:text-gray-400">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>

                        <div className="relative group">
                            <select
                                value={date.getFullYear()}
                                onChange={handleYearChange}
                                className="appearance-none bg-transparent text-lg md:text-xl font-bold text-gray-900 dark:text-white cursor-pointer py-1 pr-6 pl-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {years.map(y => (
                                    <option key={y} value={y} className="text-gray-900 bg-white dark:bg-gray-800">
                                        {y}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500 dark:text-gray-400">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Right: View Switcher */}
            <div className="flex items-center bg-gray-200 dark:bg-gray-600 p-1 rounded-lg w-full sm:w-auto justify-center sm:justify-end">
                {(views as string[]).map(v => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => changeView(v)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                            view === v
                                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm transform scale-105'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-500'
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
