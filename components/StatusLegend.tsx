import React from 'react';
import { POST_STATUSES, STATUS_COLORS } from '../constants';
import { PostStatus } from '../types';

const StatusLegend: React.FC = () => {
    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 py-2 px-4 bg-white dark:bg-gray-800 rounded-xl md:rounded-full border border-gray-200 dark:border-gray-700 shadow-sm mx-auto w-fit mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Legenda:</span>
            {POST_STATUSES.map(status => (
                <div key={status} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status as PostStatus]}`}></span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 font-medium">{status}</span>
                </div>
            ))}
        </div>
    );
};

export default StatusLegend;
