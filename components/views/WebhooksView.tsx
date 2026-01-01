
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Card from '../Card';
import Pagination from '../common/Pagination';
import FormField from '../common/FormField';
import DynamicKeyValueList from '../common/DynamicKeyValueList';
import { 
    Webhook, WebhookEvent, WebhookSettings, ApiKey, 
    AlertRule, AuditLogEntry, WebhookFormData, AnalyticsSummary, 
    ChartConfig, ChartDataPoint, FilterOptions, EventReplayConfig, 
    TestEventConfig 
} from '../../types';
import { GoogleGenAI } from "@google/genai";

// --- UTILITIES ---
const generateUUID = () => {
    if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const debounce = (fn: Function, ms: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
};

// --- MOCK DATA GENERATION ---
const generateMockWebhook = (idSuffix: number): Webhook => {
    const statusOptions: ('Active' | 'Disabled' | 'Paused')[] = ['Active', 'Disabled', 'Paused'];
    const eventsOptions = ['transaction.created', 'payment.updated', 'user.created', 'user.updated', 'order.placed', 'invoice.paid', 'email.sent'];
    const selectedEvents = Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map(() => eventsOptions[Math.floor(Math.random() * eventsOptions.length)]);
    const secret = generateUUID().replace(/-/g, '').substring(0, 32);
    const authTypes: ('none' | 'basic' | 'bearer')[] = ['none', 'basic', 'bearer'];
    const authType = authTypes[Math.floor(Math.random() * authTypes.length)];

    return {
        id: `wh-${idSuffix}`,
        url: `https://api.example.com/hooks/service-${idSuffix}`,
        status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
        events: selectedEvents.length > 0 ? Array.from(new Set(selectedEvents)) : ['*'],
        description: `Webhook for ${Math.random() > 0.5 ? 'critical' : 'analytical'} events related to service ${idSuffix}.`,
        secret: `whsec_${secret}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastEventSentAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
        deliveryMetrics: {
            totalAttempts: Math.floor(Math.random() * 1000000),
            successfulDeliveries: Math.floor(Math.random() * 990000) + 1000,
            failedDeliveries: Math.floor(Math.random() * 5000),
            avgLatencyMs: Math.floor(Math.random() * 300) + 50,
        },
        retryPolicy: {
            maxRetries: Math.floor(Math.random() * 5) + 3,
            initialIntervalSeconds: 60,
            multiplier: 2,
            maxIntervalSeconds: 3600,
        },
        headers: [
            { id: generateUUID(), key: 'Content-Type', value: 'application/json' },
            { id: generateUUID(), key: 'X-Request-ID', value: `req-${generateUUID()}` },
        ],
        authConfig: authType === 'basic' ? { type: 'basic', username: `user-${idSuffix}`, password: 'password123' } :
                    authType === 'bearer' ? { type: 'bearer', token: `sk_bearer_${generateUUID().replace(/-/g, '')}` } :
                    { type: 'none' },
        sslVerificationEnabled: Math.random() > 0.1,
        metadata: { 'project': `project-${Math.floor(Math.random() * 3) + 1}`, 'cost_center': `CC-${Math.floor(Math.random() * 100)}` },
        ownerId: `user-${Math.floor(Math.random() * 5) + 1}`,
        environment: Math.random() > 0.7 ? 'production' : (Math.random() > 0.5 ? 'staging' : 'development'),
        tags: Math.random() > 0.5 ? ['billing', 'payments'] : ['analytics', 'monitoring'],
    };
};

const generateMockEvent = (webhook: Webhook, idSuffix: number, isFailed?: boolean): WebhookEvent => {
    const eventTypes = webhook.events[0] === '*' ? ['transaction.created', 'payment.updated', 'user.created', 'order.placed'] : webhook.events;
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const status: 'Delivered' | 'Failed' | 'Pending' | 'Retrying' = isFailed ? 'Failed' : (Math.random() > 0.95 ? 'Failed' : 'Delivered');
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();

    const attempts = [];
    let currentStatus: 'Success' | 'Failure' = 'Failure';
    for (let i = 1; i <= (status === 'Failed' ? Math.floor(Math.random() * 3) + 1 : 1); i++) {
        const attemptStatus = (i === (status === 'Delivered' ? 1 : 0) || (status === 'Failed' && i === webhook.retryPolicy.maxRetries)) ? (status === 'Delivered' ? 'Success' : 'Failure') : 'Failure';
        currentStatus = attemptStatus;
        attempts.push({
            attempt: i,
            status: attemptStatus,
            responseStatus: attemptStatus === 'Success' ? 200 : (Math.random() > 0.5 ? 500 : 408),
            responseText: attemptStatus === 'Success' ? 'OK' : (Math.random() > 0.5 ? 'Internal Server Error' : 'Gateway Timeout'),
            latencyMs: Math.floor(Math.random() * 500) + 100,
            timestamp: new Date(new Date(timestamp).getTime() + i * 10000).toISOString(),
            errorDetails: attemptStatus === 'Failure' ? (Math.random() > 0.5 ? 'Connection refused' : 'SSL handshake failed') : undefined,
        });
    }

    return {
        id: `evt-${idSuffix}`,
        webhookId: webhook.id,
        type: type,
        status: status,
        payload: {
            id: `payload_${generateUUID().substring(0, 8)}`,
            amount: Math.floor(Math.random() * 10000) / 100,
            currency: 'USD',
            userId: `user_${generateUUID().substring(0, 6)}`,
            timestamp: new Date().toISOString(),
        },
        error: status === 'Failed' ? (currentStatus === 'Failure' ? attempts[attempts.length - 1]?.errorDetails : undefined) : undefined,
        timestamp: timestamp,
        deliveryAttempts: attempts,
        externalRef: generateUUID().substring(0, 10),
        metadata: { 'correlationId': generateUUID() },
    };
};

const MOCK_WEBHOOKS = Array.from({ length: 15 }).map((_, i) => generateMockWebhook(i + 1));
const MOCK_EVENTS = Array.from({ length: 50 }).map((_, i) => {
    const randomWebhook = MOCK_WEBHOOKS[Math.floor(Math.random() * MOCK_WEBHOOKS.length)];
    return generateMockEvent(randomWebhook, i + 1, i % 8 === 0);
});

const WebhooksView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'endpoints' | 'events' | 'alerts' | 'api-keys' | 'settings' | 'audit-log' | 'testing'>('dashboard');
    const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
    const [events, setEvents] = useState<WebhookEvent[]>(MOCK_EVENTS);
    const [currentWebhookPage, setCurrentWebhookPage] = useState(1);
    const [currentEventPage, setCurrentEventPage] = useState(1);
    const [webhookFilters, setWebhookFilters] = useState<FilterOptions>({});
    const [eventFilters, setEventFilters] = useState<FilterOptions>({});
    
    // UI Modals
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<WebhookFormData | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
    const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);
    
    // AI State
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const mainContentRef = useRef<HTMLDivElement>(null);

    // Filter Logic
    const filteredWebhooks = useMemo(() => {
        return webhooks.filter(wh => {
            const matchesSearch = !webhookFilters.searchTerm || wh.url.toLowerCase().includes(webhookFilters.searchTerm.toLowerCase()) || wh.description.toLowerCase().includes(webhookFilters.searchTerm.toLowerCase());
            const matchesStatus = !webhookFilters.status || webhookFilters.status === 'All' || wh.status === webhookFilters.status;
            return matchesSearch && matchesStatus;
        });
    }, [webhooks, webhookFilters]);

    const filteredEvents = useMemo(() => {
        return events.filter(evt => {
            const matchesSearch = !eventFilters.searchTerm || evt.type.toLowerCase().includes(eventFilters.searchTerm.toLowerCase());
            const matchesStatus = !eventFilters.status || eventFilters.status === 'All' || evt.status === eventFilters.status;
            return matchesSearch && matchesStatus;
        });
    }, [events, eventFilters]);

    // Pagination
    const displayedWebhooks = useMemo(() => filteredWebhooks.slice((currentWebhookPage - 1) * 10, currentWebhookPage * 10), [filteredWebhooks, currentWebhookPage]);
    const displayedEvents = useMemo(() => filteredEvents.slice((currentEventPage - 1) * 15, currentEventPage * 15), [filteredEvents, currentEventPage]);

    const handleAiAnalyze = async () => {
        if (!selectedEvent) return;
        setIsAiLoading(true);
        setAiAnalysis('');
        setAiError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analyze this failed webhook event. 
                Type: ${selectedEvent.type}
                Status: ${selectedEvent.status}
                Error: ${selectedEvent.error || 'N/A'}
                Payload: ${JSON.stringify(selectedEvent.payload)}
                Attempts: ${JSON.stringify(selectedEvent.deliveryAttempts)}
                
                Provide a clear reason for failure and 3 actionable steps to fix it.`;
                
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            
            setAiAnalysis(response.text || 'No analysis could be generated.');
        } catch (error: any) {
            setAiError(error.message || 'An error occurred during AI analysis.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAddWebhook = () => {
        setEditingWebhook({
            url: '',
            events: ['*'],
            status: 'Active',
            description: '',
            secret: '',
            headers: [{ key: '', value: '', id: generateUUID() }],
            authType: 'none',
            sslVerificationEnabled: true,
            retryPolicy: { maxRetries: 5, initialIntervalSeconds: 60, multiplier: 2, maxIntervalSeconds: 3600 },
            metadata: [{ key: '', value: '', id: generateUUID() }],
            environment: 'development',
            tags: [],
        });
        setIsWebhookModalOpen(true);
    };

    const handleSaveWebhook = (formData: WebhookFormData) => {
        const newWh: Webhook = {
            id: formData.id || `wh-${generateUUID().substring(0, 8)}`,
            url: formData.url,
            status: formData.status,
            events: formData.events,
            description: formData.description,
            secret: formData.secret || `whsec_${generateUUID().replace(/-/g, '')}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deliveryMetrics: { totalAttempts: 0, successfulDeliveries: 0, failedDeliveries: 0, avgLatencyMs: 0 },
            retryPolicy: formData.retryPolicy,
            headers: formData.headers.filter(h => h.key),
            authConfig: { type: formData.authType },
            sslVerificationEnabled: formData.sslVerificationEnabled,
            metadata: formData.metadata.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
            ownerId: 'user-admin',
            environment: formData.environment,
            tags: formData.tags,
        };
        
        if (formData.id) {
            setWebhooks(prev => prev.map(w => w.id === formData.id ? newWh : w));
        } else {
            setWebhooks(prev => [newWh, ...prev]);
        }
        setIsWebhookModalOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-900 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-xl font-bold text-cyan-400 flex items-center">
                        <span className="mr-2">⚡</span> MegaDashboard
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                        { id: 'endpoints', label: 'Endpoints', icon: '🔌' },
                        { id: 'events', label: 'Events Log', icon: '📝' },
                        { id: 'alerts', label: 'Alerts', icon: '🚨' },
                        { id: 'api-keys', label: 'API Keys', icon: '🔑' },
                        { id: 'settings', label: 'Global Settings', icon: '⚙️' },
                        { id: 'audit-log', label: 'Audit Log', icon: '📜' },
                        { id: 'testing', label: 'Dev Tools', icon: '🧪' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === item.id ? 'bg-cyan-600/20 text-cyan-400 shadow-sm' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <span className="mr-3">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-gray-900 p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-extrabold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                            <p className="text-gray-400 mt-1">Manage and monitor your real-time integration layer.</p>
                        </div>
                        {activeTab === 'endpoints' && (
                            <button onClick={handleAddWebhook} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg hover:shadow-cyan-600/20">
                                + New Endpoint
                            </button>
                        )}
                    </div>

                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="flex flex-col items-center justify-center py-8">
                                <p className="text-4xl font-bold text-white">12</p>
                                <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest font-semibold">Active Hooks</p>
                            </Card>
                            <Card className="flex flex-col items-center justify-center py-8">
                                <p className="text-4xl font-bold text-green-400">99.8%</p>
                                <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest font-semibold">Success Rate</p>
                            </Card>
                            <Card className="flex flex-col items-center justify-center py-8">
                                <p className="text-4xl font-bold text-cyan-400">120ms</p>
                                <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest font-semibold">Avg Latency</p>
                            </Card>
                            <Card className="flex flex-col items-center justify-center py-8">
                                <p className="text-4xl font-bold text-red-400">42</p>
                                <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest font-semibold">Failed Today</p>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'endpoints' && (
                        <Card title="All Endpoints">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-700">
                                        <tr className="text-xs uppercase text-gray-500 font-bold tracking-wider">
                                            <th className="px-4 py-3">URL</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Events</th>
                                            <th className="px-4 py-3">Metrics</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {displayedWebhooks.map(wh => (
                                            <tr key={wh.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-4 text-sm font-mono text-cyan-300 max-w-xs truncate">{wh.url}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${wh.status === 'Active' ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                                        {wh.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {wh.events.slice(0, 2).map(e => (
                                                            <span key={e} className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">{e}</span>
                                                        ))}
                                                        {wh.events.length > 2 && <span className="text-gray-500 text-[10px]">+{wh.events.length - 2}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-gray-400 font-mono">
                                                    {wh.deliveryMetrics.totalAttempts.toLocaleString()} reqs
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button className="text-cyan-400 hover:text-cyan-300 mr-4 font-semibold text-sm">Configure</button>
                                                    <button className="text-red-400 hover:text-red-300 font-semibold text-sm">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination pagination={{ currentPage: currentWebhookPage, totalPages: Math.ceil(filteredWebhooks.length / 10), totalItems: filteredWebhooks.length, itemsPerPage: 10 }} onPageChange={setCurrentWebhookPage} />
                        </Card>
                    )}

                    {activeTab === 'events' && (
                        <Card title="Recent Deliveries">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-700">
                                        <tr className="text-xs uppercase text-gray-500 font-bold tracking-wider">
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Time</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {displayedEvents.map(evt => (
                                            <tr key={evt.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-4 text-xs font-mono text-gray-500">{evt.id}</td>
                                                <td className="px-4 py-4 text-sm font-semibold text-white uppercase tracking-tight">{evt.type}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${evt.status === 'Delivered' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                                                        {evt.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-gray-500">
                                                    {new Date(evt.timestamp).toLocaleTimeString()}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button 
                                                        onClick={() => { setSelectedEvent(evt); setIsEventDetailsModalOpen(true); }}
                                                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination pagination={{ currentPage: currentEventPage, totalPages: Math.ceil(filteredEvents.length / 15), totalItems: filteredEvents.length, itemsPerPage: 15 }} onPageChange={setCurrentEventPage} />
                        </Card>
                    )}
                </div>
            </main>

            {/* Modal - Event Details & AI Debugger */}
            {isEventDetailsModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setIsEventDetailsModalOpen(false)}>
                    <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-700 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <span className="bg-cyan-600 w-2 h-6 rounded-full mr-3"></span>
                                Event Inspector
                            </h3>
                            <button onClick={() => setIsEventDetailsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section>
                                    <h4 className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-3">Payload</h4>
                                    <pre className="bg-gray-900 p-4 rounded-xl text-xs font-mono text-cyan-200 border border-gray-700 h-64 overflow-auto custom-scrollbar">
                                        {JSON.stringify(selectedEvent.payload, null, 2)}
                                    </pre>
                                </section>
                                <section>
                                    <h4 className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-3">Status Logs</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        {selectedEvent.deliveryAttempts.map((at, i) => (
                                            <div key={i} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold uppercase text-gray-500">Attempt {at.attempt}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${at.status === 'Success' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>{at.status}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-300 mt-1">HTTP {at.responseStatus || 'N/A'}</p>
                                                {at.errorDetails && <p className="text-xs text-red-400/80 italic mt-1">{at.errorDetails}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {selectedEvent.status === 'Failed' && (
                                <section className="border-t border-gray-700 pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-bold text-white flex items-center">
                                            <span className="mr-2">✨</span> AI Error Analysis
                                        </h4>
                                        <button 
                                            onClick={handleAiAnalyze}
                                            disabled={isAiLoading}
                                            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center"
                                        >
                                            {isAiLoading ? 'Thinking...' : 'Analyze Failure'}
                                        </button>
                                    </div>
                                    <div className="bg-cyan-900/10 border border-cyan-500/20 p-5 rounded-2xl min-h-[100px]">
                                        {isAiLoading ? (
                                            <div className="flex flex-col items-center justify-center py-4 space-y-3">
                                                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-xs text-cyan-400/60 font-medium animate-pulse">Consulting Gemini Flash-3 for root cause analysis...</p>
                                            </div>
                                        ) : aiError ? (
                                            <p className="text-sm text-red-400">{aiError}</p>
                                        ) : aiAnalysis ? (
                                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
                                                {aiAnalysis.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic text-center">Trigger AI analysis to diagnose why this delivery failed.</p>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Webhook Editor */}
            {isWebhookModalOpen && editingWebhook && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setIsWebhookModalOpen(false)}>
                    <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-700 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-700">
                            <h3 className="text-xl font-bold text-white">Create New Webhook</h3>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            <FormField label="Target URL">
                                <input 
                                    type="text" 
                                    value={editingWebhook.url} 
                                    onChange={e => setEditingWebhook({...editingWebhook, url: e.target.value})}
                                    placeholder="https://your-api.com/hooks"
                                    className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                />
                            </FormField>
                            <FormField label="Description">
                                <textarea 
                                    value={editingWebhook.description} 
                                    onChange={e => setEditingWebhook({...editingWebhook, description: e.target.value})}
                                    className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all h-20"
                                />
                            </FormField>
                            <DynamicKeyValueList 
                                label="Custom Headers"
                                items={editingWebhook.headers}
                                onItemChange={(id, k, v) => setEditingWebhook({...editingWebhook, headers: editingWebhook.headers.map(h => h.id === id ? {...h, [k]: v} : h)})}
                                onAddItem={() => setEditingWebhook({...editingWebhook, headers: [...editingWebhook.headers, {id: generateUUID(), key: '', value: ''}]})}
                                onRemoveItem={(id) => setEditingWebhook({...editingWebhook, headers: editingWebhook.headers.filter(h => h.id !== id)})}
                            />
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setIsWebhookModalOpen(false)} className="text-gray-400 hover:text-white px-4 py-2 font-bold">Cancel</button>
                                <button 
                                    onClick={() => handleSaveWebhook(editingWebhook)}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg"
                                >
                                    Save Webhook
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebhooksView;
