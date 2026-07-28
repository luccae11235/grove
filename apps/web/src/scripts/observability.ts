import { EngagementTracker } from "./engagement";

const CONSENT_KEY = "grove-analytics-consent";
const VISITOR_KEY = "grove-analytics-visitor";
const SESSION_KEY = "grove-analytics-session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type EventName =
  | "page_view"
  | "lab_started"
  | "lab_completed"
  | "cta_clicked"
  | "newsletter_signup_submitted"
  | "newsletter_signup_accepted"
  | "newsletter_confirmed"
  | "outbound_navigation"
  | "web_vital"
  | "client_error";

type AnalyticsClient = {
  track: (eventName: EventName, properties?: Record<string, string | number | boolean>) => void;
};

declare global {
  interface Window {
    groveAnalytics?: AnalyticsClient;
  }
}

export interface ObservabilityConfig {
  apiBase: string;
  consentVersion: string;
  locale: "en" | "pt-BR";
  contentType: "page" | "article" | "issue";
  contentId?: string;
  banner: HTMLElement;
  settingsButton: HTMLButtonElement;
}

export function initializeObservability(config: ObservabilityConfig) {
  const acceptButton = config.banner.querySelector<HTMLButtonElement>("[data-analytics-accept]");
  const rejectButton = config.banner.querySelector<HTMLButtonElement>("[data-analytics-reject]");
  if (!acceptButton || !rejectButton) return;

  let running = false;
  let visitorId = "";
  let session: ReturnType<typeof currentSession>;
  let pageViewId = crypto.randomUUID();
  let pageStartedAt = new Date();
  let engagement: EngagementTracker | undefined;
  let timer: number | undefined;
  let linkToken = readIdentityLink();
  const seenLabs = new Set<string>();
  const vitals = new Map<string, number>();

  const showBanner = () => {
    config.banner.hidden = false;
    config.settingsButton.setAttribute("aria-expanded", "true");
  };
  const hideBanner = () => {
    config.banner.hidden = true;
    config.settingsButton.setAttribute("aria-expanded", "false");
  };

  const send = async (path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) => {
    try {
      await fetch(`${config.apiBase}${path}`, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // Analytics must never block reading or navigation.
    }
  };

  const context = () => {
    const query = new URLSearchParams(window.location.search);
    return {
      contentType: config.contentType,
      ...(config.contentId ? { contentId: config.contentId } : {}),
      path: window.location.pathname,
      ...safeReferrer(),
      ...utmValues(query),
    };
  };

  const track: AnalyticsClient["track"] = (eventName, properties = {}) => {
    if (!running) return;
    session = currentSession(config.locale);
    const occurredAt = new Date();
    void send("/v1/events", "POST", {
      visitorId,
      session,
      events: [{
        eventId: crypto.randomUUID(),
        eventName,
        occurredAt: occurredAt.toISOString(),
        ...context(),
        properties,
      }],
    });
  };

  const flushEngagement = () => {
    if (!running || !engagement) return;
    const snapshot = engagement.tick(performance.now());
    session = currentSession(config.locale);
    void send(`/v1/engagement/${pageViewId}`, "PUT", {
      visitorId,
      session,
      ...context(),
      locale: config.locale,
      startedAt: pageStartedAt.toISOString(),
      occurredAt: new Date().toISOString(),
      ...snapshot,
    });
  };

  const linkSubscriber = async () => {
    if (!linkToken || !visitorId) return;
    await send("/v1/identity/link", "POST", { visitorId, token: linkToken });
    linkToken = "";
    clearIdentityLink();
  };

  const start = async () => {
    if (running) return;
    visitorId = localStorage.getItem(VISITOR_KEY) ?? crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, visitorId);
    await send("/v1/visitors", "POST", {
      visitorId,
      consentVersion: config.consentVersion,
    });
    running = true;
    window.groveAnalytics = { track };
    session = currentSession(config.locale);
    pageViewId = crypto.randomUUID();
    pageStartedAt = new Date();
    engagement = new EngagementTracker(
      performance.now(),
      () => document.visibilityState === "visible",
      () => document.hasFocus(),
    );
    observeVitals(vitals);
    bindActivity(engagement, seenLabs, track);
    track("page_view");
    if (document.querySelector("[data-confirmation]") && !new URLSearchParams(location.search).has("status")) {
      track("newsletter_confirmed");
    }
    await linkSubscriber();
    timer = window.setInterval(flushEngagement, 15_000);
  };

  const accept = async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      status: "accepted",
      version: config.consentVersion,
    }));
    hideBanner();
    await start();
  };

  const reject = async () => {
    if (timer !== undefined) window.clearInterval(timer);
    const existingVisitor = localStorage.getItem(VISITOR_KEY);
    if (existingVisitor) {
      await send(`/v1/visitors/${encodeURIComponent(existingVisitor)}`, "DELETE");
    }
    running = false;
    window.groveAnalytics = undefined;
    localStorage.removeItem(VISITOR_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      status: "rejected",
      version: config.consentVersion,
    }));
    linkToken = "";
    clearIdentityLink();
    hideBanner();
  };

  acceptButton.addEventListener("click", () => void accept());
  rejectButton.addEventListener("click", () => void reject());
  config.settingsButton.addEventListener("click", showBanner);
  window.addEventListener("pagehide", () => {
    flushEngagement();
    for (const [name, value] of vitals) track("web_vital", { name, value: Math.round(value) });
  });
  window.addEventListener("error", (event) => {
    track("client_error", {
      kind: "error",
      source: safeSource(event.filename),
    });
  });
  window.addEventListener("unhandledrejection", () => {
    track("client_error", { kind: "unhandled_rejection" });
  });

  const consent = readConsent(config.consentVersion);
  if (consent === "accepted") {
    hideBanner();
    void start();
  } else if (consent === "rejected") {
    hideBanner();
    if (linkToken) {
      linkToken = "";
      clearIdentityLink();
    }
  } else {
    showBanner();
  }
}

function bindActivity(
  engagement: EngagementTracker,
  seenLabs: Set<string>,
  track: AnalyticsClient["track"],
) {
  const note = () => engagement.noteActivity(performance.now());
  for (const eventName of ["pointerdown", "keydown", "scroll"] as const) {
    window.addEventListener(eventName, note, { passive: true });
  }
  window.addEventListener("scroll", () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    engagement.noteScroll(available <= 0 ? 100 : (window.scrollY / available) * 100);
  }, { passive: true });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const lab = target?.closest<HTMLElement>("[data-analytics-lab]");
    const labId = lab?.dataset.analyticsLab;
    if (labId && !seenLabs.has(labId)) {
      seenLabs.add(labId);
      track("lab_started", { lab_id: labId });
    }
    const tracked = target?.closest<HTMLElement>("[data-analytics-event]");
    const eventId = tracked?.dataset.analyticsEvent;
    if (eventId) track("cta_clicked", { target_id: eventId });
    const anchor = target?.closest<HTMLAnchorElement>("a[href]");
    if (anchor?.origin && anchor.origin !== window.location.origin) {
      track("outbound_navigation", { hostname: anchor.hostname });
    }
  });
}

function currentSession(locale: "en" | "pt-BR") {
  const now = Date.now();
  let stored: { sessionId: string; startedAt: string; lastActiveAt: number } | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {}
  if (!stored || now - stored.lastActiveAt > SESSION_TIMEOUT_MS) {
    stored = {
      sessionId: crypto.randomUUID(),
      startedAt: new Date(now).toISOString(),
      lastActiveAt: now,
    };
  } else {
    stored.lastActiveAt = now;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  return {
    sessionId: stored.sessionId,
    startedAt: stored.startedAt,
    locale,
    deviceClass: deviceClass(),
  };
}

function deviceClass() {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function safeReferrer() {
  if (!document.referrer) return {};
  try {
    const referrer = new URL(document.referrer);
    return {
      referrer: referrer.origin === location.origin
        ? referrer.pathname.slice(0, 200)
        : referrer.hostname.slice(0, 200),
    };
  } catch {
    return {};
  }
}

function utmValues(query: URLSearchParams) {
  const value = (name: string) => query.get(name)?.trim().slice(0, 120) || undefined;
  return {
    ...(value("utm_source") ? { utmSource: value("utm_source") } : {}),
    ...(value("utm_medium") ? { utmMedium: value("utm_medium") } : {}),
    ...(value("utm_campaign") ? { utmCampaign: value("utm_campaign") } : {}),
  };
}

function readConsent(version: string) {
  try {
    const consent = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
    return consent?.version === version ? consent.status as "accepted" | "rejected" : null;
  } catch {
    return null;
  }
}

function readIdentityLink() {
  const parameters = new URLSearchParams(location.hash.replace(/^#/, ""));
  return parameters.get("grove-link")?.slice(0, 1000) ?? "";
}

function clearIdentityLink() {
  if (!location.hash.includes("grove-link=")) return;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

function safeSource(filename: string) {
  try {
    return new URL(filename).pathname.split("/").at(-1)?.slice(0, 120) || "unknown";
  } catch {
    return "unknown";
  }
}

function observeVitals(values: Map<string, number>) {
  try {
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (entry) values.set("LCP", entry.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) cls += shift.value;
      }
      values.set("CLS", cls * 1000);
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        values.set("INP", Math.max(values.get("INP") ?? 0, entry.duration));
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
  } catch {
    // Older browsers simply omit optional performance metrics.
  }
}
