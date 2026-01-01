
export interface Webhook {
    id: string;
    url: string;
    status: 'Active' | 'Disabled' | 'Paused';
    events: string[];
    description: string;
    secret: string;
    createdAt: string;
    updatedAt: string;
    lastEventSentAt?: string;
    deliveryMetrics: {
        totalAttempts: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        avgLatencyMs: number;
    };
    retryPolicy: {
        maxRetries: number;
        initialIntervalSeconds: number;
        multiplier: number;
        maxIntervalSeconds: number;
    };
    headers: { key: string; value: string; id: string; }[];
    authConfig: {
        type: 'none' | 'basic' | 'bearer';
        username?: string;
        password?: string;
        token?: string;
    };
    sslVerificationEnabled: boolean;
    metadata: { [key: string]: string };
    ownerId: string;
    environment: 'development' | 'staging' | 'production';
    tags: string[];
}

export interface WebhookEvent {
    id: string;
    webhookId: string;
    type: string;
    status: 'Delivered' | 'Failed' | 'Pending' | 'Retrying';
    payload: object;
    error?: string;
    timestamp: string;
    deliveryAttempts: {
        attempt: number;
        status: 'Success' | 'Failure';
        responseStatus?: number;
        responseText?: string;
        latencyMs: number;
        timestamp: string;
        errorDetails?: string;
    }[];
    externalRef?: string;
    metadata: { [key: string]: string };
}

export interface WebhookSettings {
    maxRetries: number;
    retryIntervalSeconds: number[];
    timeoutMs: number;
    secretSigningEnabled: boolean;
    deliveryAttemptsLoggingEnabled: boolean;
    defaultHeaders: { key: string; value: string; id: string; }[];
    ipWhitelist: string[];
    rateLimitEnabled: boolean;
    rateLimitRequestsPerMinute: number;
    eventTransformationEnabled: boolean;
    customCertsEnabled: boolean;
    customCertificates: { id: string; name: string; cert: string; expiration: string; }[];
    deadLetterQueueEnabled: boolean;
    deadLetterQueueConfig?: {
        type: 's3' | 'kafka';
        target: string;
        accessKeyId?: string;
        secretAccessKey?: string;
    };
    globalMonitoringEnabled: boolean;
    webhookBatchingEnabled: boolean;
    batchingIntervalMs?: number;
    batchingMaxEvents?: number;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    expiresAt?: string;
    permissions: string[];
    status: 'Active' | 'Revoked';
    lastUsedAt?: string;
    createdBy: string;
}

export interface AlertRule {
    id: string;
    name: string;
    type: 'webhook_failure_rate' | 'event_latency' | 'delivery_success_rate' | 'endpoint_down' | 'custom_metric';
    threshold: number;
    durationMinutes: number;
    webhookId?: string;
    status: 'Active' | 'Inactive';
    channels: { type: 'email' | 'slack' | 'sms' | 'pagerduty'; recipient: string; id: string; }[];
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    metricPath?: string;
    operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    condition?: 'all' | 'any';
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    resourceType: 'webhook' | 'api_key' | 'settings' | 'event' | 'alert_rule';
    resourceId: string;
    details: object;
    ipAddress?: string;
    userAgent?: string;
}

export interface WebhookFormData {
    id?: string;
    url: string;
    events: string[];
    status: 'Active' | 'Disabled' | 'Paused';
    description: string;
    secret: string;
    headers: { key: string; value: string; id: string; }[];
    authType: 'none' | 'basic' | 'bearer';
    authToken?: string;
    username?: string;
    password?: string;
    sslVerificationEnabled: boolean;
    retryPolicy: {
        maxRetries: number;
        initialIntervalSeconds: number;
        multiplier: number;
        maxIntervalSeconds: number;
    };
    metadata: { key: string; value: string; id: string; }[];
    environment: 'development' | 'staging' | 'production';
    tags: string[];
}

export interface AnalyticsSummary {
    totalEndpoints: number;
    activeEndpoints: number;
    disabledEndpoints: number;
    totalEventsDelivered24h: number;
    failureRate24h: number;
    avgLatencyMs24h: number;
    pendingEvents: number;
    retryingEvents: number;
    topFailedEndpoints: { id: string; url: string; failures: number; }[];
    eventDistribution: { type: string; count: number; }[];
    latencyP99Ms: number;
    totalEventsProcessedMonth: number;
    successfulEventsMonth: number;
    failedEventsMonth: number;
}

export interface ChartDataPoint {
    time: string;
    value: number;
    label?: string;
    color?: string;
}

export interface ChartConfig {
    id: string;
    title: string;
    type: 'line' | 'bar' | 'pie';
    data: ChartDataPoint[];
    unit?: string;
    timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly';
    description?: string;
}

export interface PaginationInfo {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
}

export interface FilterOptions {
    searchTerm?: string;
    status?: string;
    eventType?: string;
    timeRange?: string;
    severity?: string;
    actor?: string;
    resourceType?: string;
}

export interface EventReplayConfig {
    webhookIds: string[];
    eventTypes: string[];
    statusFilter?: 'Failed' | 'Delivered' | 'All';
    dateRange: { start: string; end: string; };
    maxEvents: number;
    batchSize: number;
    dryRun: boolean;
}

export interface TestEventConfig {
    webhookId?: string;
    eventType: string;
    payload: object;
    headers: { key: string; value: string; id: string; }[];
    metadata: { key: string; value: string; id: string; }[];
    expectedResponseStatus?: number;
    timeoutMs?: number;
}
