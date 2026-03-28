

const StatCard = ({ title, value, subtext, icon: Icon }: any) => {
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-neutral-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between aspect-square">
            <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 text-black flex items-center justify-center shadow-sm">
                    <Icon size={24} />
                </div>
            </div>

            <div className="mt-auto">
                <h3 className="text-4xl font-black text-black tracking-tight mb-2">{value}</h3>
                <p className="text-black font-bold text-lg leading-none">{title}</p>
                {subtext && (
                    <p className="text-neutral-500 text-sm font-medium mt-1">{subtext}</p>
                )}
            </div>
        </div>
    );
};

export default StatCard;
