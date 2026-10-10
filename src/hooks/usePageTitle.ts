import { useEffect } from 'react';

const SITE = 'EcoHotel Madeguadua';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} · Cabañas en Norcasia, Caldas`;
  }, [title]);
}
