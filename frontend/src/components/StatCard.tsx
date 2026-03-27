import { Activity } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color, progress }: any) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                    <Icon size={24} />
                </div>
            </div>

            {progress !== undefined && (
                <div className="mt-4">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                            className={`bg-${color}-500 h-2 rounded-full transition-all duration-1000`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
                </div>
            )}

            {!progress && subtext && (
                <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <Activity size={14} />
                    {subtext}
                </p>
            )}
        </div>
    );
};

export default StatCard;
