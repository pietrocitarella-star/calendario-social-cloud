import React from 'react';
import { POST_STATUSES, STATUS_COLORS } from '../constants';
import { PostStatus } from '../types';

const StatusLegend: React.FC = () => {
    return (
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Legenda Stati:</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {POST_STATUSES.map(status => (
                    <div key={status} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[status as PostStatus]}`}></span>
                        <span className="text-xs capitalize text-gray-600 dark:text-gray-400">{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusLegend;
