/**
 * ModuleOverview Component
 * SyntexHCSN - Component hiển thị tổng quan phân hệ
 * 
 * Thiết kế đồng bộ, hiển thị:
 * - Tiêu đề & mô tả phân hệ
 * - Quy trình nghiệp vụ (workflow)
 * - Chức năng chính
 * - Thống kê nhanh
 */

import React from 'react';

interface WorkflowStep {
    icon: string;
    title: string;
    description: string;
    color?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal' | 'indigo';
    targetView?: string; // View ID to navigate to when clicked
}

interface QuickAction {
    icon: string;
    label: string;
    onClick: () => void;
    primary?: boolean;
}

interface StatCard {
    icon: string;
    label: string;
    value: string | number;
    subLabel?: string;
    color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

interface FeatureItem {
    icon: string;
    title: string;
    description: string;
    targetView?: string; // View ID to navigate to when clicked
}

interface ModuleOverviewProps {
    title: string;
    description: string;
    icon: string;
    iconColor?: string;
    workflow?: WorkflowStep[];
    features?: FeatureItem[];
    quickActions?: QuickAction[];
    stats?: StatCard[];
    onNavigate?: (viewId: string) => void; // Callback for navigation
    children?: React.ReactNode;
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
};

export const ModuleOverview: React.FC<ModuleOverviewProps> = ({
    title,
    description,
    icon,
    iconColor = 'blue',
    workflow,
    features,
    quickActions,
    stats,
    onNavigate,
    children
}) => {
    const colors = colorMap[iconColor] || colorMap.blue;

    return (
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-xl ${colors.bg}`}>
                            <span className={`material-symbols-outlined text-4xl ${colors.text}`}>{icon}</span>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{title}</h1>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
                        </div>
                        {quickActions && quickActions.length > 0 && (
                            <div className="flex gap-2">
                                {quickActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={action.onClick}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${action.primary
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined icon-sm">{action.icon}</span>
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && stats.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((stat, idx) => {
                            const statColors = colorMap[stat.color || 'blue'];
                            return (
                                <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${statColors.bg}`}>
                                            <span className={`material-symbols-outlined ${statColors.text}`}>{stat.icon}</span>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
                                            {stat.subLabel && (
                                                <div className="text-xs text-slate-400 dark:text-slate-500">{stat.subLabel}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Workflow */}
                {workflow && workflow.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">route</span>
                            Quy trình Nghiệp vụ
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {workflow.map((step, idx) => {
                                const stepColors = colorMap[step.color || 'blue'];
                                return (
                                    <div key={idx} className="relative">
                                        <div
                                            className={`rounded-lg border ${stepColors.border} p-4 ${stepColors.bg} h-full ${step.targetView && onNavigate ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                                            onClick={() => step.targetView && onNavigate && onNavigate(step.targetView)}
                                            role={step.targetView ? 'button' : undefined}
                                            tabIndex={step.targetView ? 0 : undefined}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 shadow">
                                                    {idx + 1}
                                                </span>
                                                <span className={`material-symbols-outlined ${stepColors.text}`}>{step.icon}</span>
                                            </div>
                                            <h3 className={`font-bold text-sm mb-1 ${stepColors.text}`}>{step.title}</h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">{step.description}</p>
                                        </div>
                                        {idx < workflow.length - 1 && (
                                            <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Features Grid */}
                {features && features.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-500">auto_awesome</span>
                            Chức năng Chính
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {features.map((feature, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${feature.targetView && onNavigate ? 'cursor-pointer' : ''}`}
                                    onClick={() => feature.targetView && onNavigate && onNavigate(feature.targetView)}
                                    role={feature.targetView ? 'button' : undefined}
                                    tabIndex={feature.targetView ? 0 : undefined}
                                >
                                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">{feature.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{feature.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{feature.description}</p>
                                    </div>
                                </div>
                            ))}

                        </div>
                    </div>
                )}

                {/* Custom Content */}
                {children}
            </div>
        </div>
    );
};

export default ModuleOverview;
