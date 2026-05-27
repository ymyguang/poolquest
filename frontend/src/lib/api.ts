import type { PublicQuest, QuestAction, QuestState } from './demoEngine';

const API_BASE = import.meta.env.VITE_POOLQUEST_API || 'http://localhost:8787';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'PoolQuest API error');
  return payload as T;
};

export const fetchQuest = () => request<{ quest: PublicQuest }>('/api/quest/current');

export const startRun = () =>
  request<{ run: QuestState }>('/api/run/start', {
    method: 'POST',
    body: JSON.stringify({})
  });

export const submitAction = (runId: string, action: QuestAction) =>
  request<{ run: QuestState }>('/api/run/action', {
    method: 'POST',
    body: JSON.stringify({ runId, action })
  });

export const askHint = (runId: string, level: 1 | 2 | 3) =>
  request<{ run: QuestState; quote: { fee: number; penalty: number } }>('/api/run/hint', {
    method: 'POST',
    body: JSON.stringify({ runId, level })
  });
