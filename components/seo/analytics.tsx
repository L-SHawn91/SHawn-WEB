import Script from "next/script";

interface AnalyticsProps {
  gaId: string;
}

function isMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/i.test(value.trim());
}

/** Optional GA4 loader. Vercel Analytics remains available independently. */
export function Analytics({ gaId }: AnalyticsProps) {
  const measurementId = gaId.trim();
  if (!isMeasurementId(measurementId)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
