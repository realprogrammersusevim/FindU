interface LocationStatusBannerProps {
  locationStatus: string;
}

export function LocationStatusBanner({ locationStatus }: LocationStatusBannerProps) {
  if (
    locationStatus !== 'denied' &&
    locationStatus !== 'unavailable' &&
    locationStatus !== 'acquiring' &&
    locationStatus !== 'insecure'
  ) {
    return null;
  }

  return (
    <div
      className={`mt-2 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-start gap-2 shadow ${
        locationStatus === 'denied' || locationStatus === 'insecure'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : locationStatus === 'unavailable'
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
      }`}
    >
      {locationStatus === 'acquiring' && (
        <>
          <div className="w-3 h-3 mt-0.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
          Requesting your location…
        </>
      )}
      {locationStatus === 'denied' && (
        <>
          <span className="flex-shrink-0 mt-0.5">📍</span>
          <span>
            Location access denied.{' '}
            <span className="font-normal">
              On iPhone: go to <strong>Settings → Privacy &amp; Security → Location Services → Safari Websites</strong> and set to <em>While Using</em>. Then reload this page.
              If already enabled there, tap the <strong>AA</strong> icon in Safari&apos;s address bar → Website Settings → Location → Allow.
            </span>
          </span>
        </>
      )}
      {locationStatus === 'insecure' && (
        <>
          <span className="flex-shrink-0 mt-0.5">🔒</span>
          <span>
            Location requires a secure connection.{' '}
            <span className="font-normal">Open this page over <strong>HTTPS</strong> or use <strong>localhost</strong> instead of an IP address.</span>
          </span>
        </>
      )}
      {locationStatus === 'unavailable' && (
        <>
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          Location unavailable — your device may not support GPS or the request timed out.
        </>
      )}
    </div>
  );
}
