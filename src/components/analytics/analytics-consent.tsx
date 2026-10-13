"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CONSENT_STORAGE_KEY = "idcardtools-analytics-consent";
const isValidMeasurementId = Boolean(GA_MEASUREMENT_ID && /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID));

type ConsentChoice = "accepted" | "rejected";

declare global {
  interface Window {
    dataLayer?: IArguments[];
    idcardtoolsAnalyticsConsent?: boolean;
    gtag?: (...args: unknown[]) => void;
  }
}

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const reportWebVital: ReportWebVitalsCallback = (metric) => {
  if (!window.idcardtoolsAnalyticsConsent || !window.gtag) return;

  window.gtag("event", metric.name, {
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    metric_navigation_type: metric.navigationType,
    non_interaction: true,
  });
};

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);

  useReportWebVitals(reportWebVital);

  useEffect(() => {
    if (GA_MEASUREMENT_ID && !isValidMeasurementId) {
      console.error("NEXT_PUBLIC_GA_MEASUREMENT_ID must be a valid GA4 ID, such as G-XXXXXXXXXX.");
      return;
    }

    if (!isValidMeasurementId) return;

    try {
      const savedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (savedConsent === "accepted" || savedConsent === "rejected") {
        window.idcardtoolsAnalyticsConsent = savedConsent === "accepted";
        setConsent(savedConsent);
      } else {
        setIsBannerOpen(true);
      }
    } catch {
      setStorageError(true);
      setIsBannerOpen(true);
    }
  }, []);

  const saveConsent = useCallback((choice: ConsentChoice) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
      window.idcardtoolsAnalyticsConsent = choice === "accepted";
      if (choice === "rejected") {
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
      }
      setConsent(choice);
      setStorageError(false);
      setIsBannerOpen(false);
    } catch {
      setStorageError(true);
    }
  }, []);

  const trackPageView = useCallback(() => {
    if (consent !== "accepted" || !window.gtag || lastTrackedPath.current === pathname) return;

    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
    lastTrackedPath.current = pathname;
  }, [consent, pathname]);

  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  if (!isValidMeasurementId) return null;

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script id="ga4-consent-bootstrap" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; window.gtag = function(){window.dataLayer.push(arguments);}; window.gtag('js', new Date()); window.gtag('consent', 'default', {analytics_storage: 'granted'}); window.gtag('config', '${GA_MEASUREMENT_ID}', {send_page_view: false});`}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
            onReady={trackPageView}
          />
        </>
      )}

      {isBannerOpen ? (
        <section
          aria-label="Analytics preferences"
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-100 mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-5 shadow-2xl md:inset-x-8 md:p-6"
        >
          <h2 className="text-base font-semibold text-black">Your privacy choices</h2>
          <p className="mt-2 text-sm leading-6 text-black/65">
            With your permission, we use Google Analytics to understand site visits and
            Core Web Vitals. Analytics is optional and is not loaded unless you accept.
            You can change your choice at any time.
          </p>
          {storageError && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              We could not save your preference in this browser. Analytics will stay off
              until your choice can be saved.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveConsent("accepted")}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-[#ff6a00]"
            >
              Accept analytics
            </button>
            <button
              type="button"
              onClick={() => saveConsent("rejected")}
              className="rounded-full border border-black/20 px-5 py-2.5 text-sm font-medium text-black hover:border-black"
            >
              Reject analytics
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setIsBannerOpen(true)}
          className="fixed bottom-4 left-4 z-90 rounded-full border border-black/15 bg-white px-4 py-2 text-xs text-black/70 shadow-md hover:text-black"
        >
          Privacy settings
        </button>
      )}
    </>
  );
}
