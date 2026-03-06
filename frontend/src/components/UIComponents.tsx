export function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; dot: string }> = {
        pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
        processing: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
        processed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
        review_needed: { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
        error: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
    };

    const c = config[status] || config.pending;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "processing" ? "animate-pulse-dot" : ""}`} />
            {status.replace(/_/g, " ")}
        </span>
    );
}

export function KPICard({
    title,
    value,
    subtitle,
    icon,
    gradient,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    gradient: string;
}) {
    return (
        <div className="card-glow rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-400 mb-1">{title}</p>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
                    </p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

export function SeverityBadge({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        high: "bg-red-500/10 text-red-400 border-red-500/20",
        medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${colors[severity] || colors.low}`}>
            {severity}
        </span>
    );
}
