import { useEffect, useState } from 'react';
import type { DeviceKind } from '../../../content/scenes';

const MOBILE_QUERY = '(max-width: 767px)';

export function deviceKindForMatches(matchesMobile: boolean): DeviceKind {
  return matchesMobile ? 'mobile' : 'desktop';
}

export function useDeviceKind(): DeviceKind {
  const [device, setDevice] = useState<DeviceKind>(() => (
    deviceKindForMatches(window.matchMedia(MOBILE_QUERY).matches)
  ));

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setDevice(deviceKindForMatches(media.matches));
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return device;
}
