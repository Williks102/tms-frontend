import useSWR from 'swr';
import { apiFetchPublic, BoardData, BoardStation } from '@/lib/api';

export function useBoardLive(stationId?: number) {
  const query = stationId ? `?station_id=${stationId}` : '';

  return useSWR<BoardData>(
    `/board/live${query}`,
    (url: string) => apiFetchPublic(url),
    { refreshInterval: 15000 }
  );
}

export function useBoardStations() {
  return useSWR<{ data: BoardStation[] }>(
    '/board/stations',
    (url: string) => apiFetchPublic(url),
    { revalidateOnFocus: false }
  );
}
