import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '../api/client';

export function useDashboard(params = {}) {
  return useQuery({ queryKey: ['dashboard', params], queryFn: () => get('/mobility/dashboard', params) });
}

export function useCities() {
  return useQuery({ queryKey: ['cities'], queryFn: () => get('/mobility/cities') });
}

export function useGisLayers(params = {}) {
  return useQuery({
    queryKey: ['gis', params],
    queryFn: async () => {
      const [zones, points, routes] = await Promise.all([
        get('/mobility/gis/zones', params),
        get('/mobility/gis/points', params),
        get('/mobility/gis/routes', params),
      ]);
      return { zones: zones.data, points: points.data, routes: routes.data };
    },
  });
}

export function useHeatmap(layer, params = {}) {
  return useQuery({ queryKey: ['heatmap', layer, params], queryFn: () => get(`/mobility/heatmap/${layer}`, params) });
}

export function useConnectivity(params) {
  return useQuery({ queryKey: ['connectivity', params], queryFn: () => get('/connectivity', params) });
}

export function useConnectivityRankings() {
  return useQuery({ queryKey: ['connectivity-rankings'], queryFn: () => get('/connectivity/rankings') });
}

export function useFirstMile() {
  return useQuery({ queryKey: ['first-mile'], queryFn: () => get('/first-mile') });
}

export function useLastMile() {
  return useQuery({ queryKey: ['last-mile'], queryFn: () => get('/last-mile') });
}

export function useGapUrgency() {
  return useQuery({ queryKey: ['gap-urgency'], queryFn: () => get('/gap-urgency', { limit: 50 }) });
}

export function useForecast(granularity, horizon) {
  return useQuery({
    queryKey: ['forecast', granularity, horizon],
    queryFn: () => get('/forecast', { granularity, horizon }),
  });
}

export function useRecommendations(params) {
  return useQuery({ queryKey: ['recommendations', params], queryFn: () => get('/recommendations', params) });
}

export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/recommendations/generate'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }),
  });
}

export function useUpdateRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }) => patch(`/recommendations/${id}`, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendations'] }),
  });
}

export function useSimulations() {
  return useQuery({ queryKey: ['simulations'], queryFn: () => get('/simulations') });
}

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => post('/simulations', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simulations'] }),
  });
}

export function useReports() {
  return useQuery({ queryKey: ['reports'], queryFn: () => get('/reports') });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => post('/reports', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: () => get('/notifications') });
}

export function useMarkNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path) => post(`/notifications/${path}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useCopilotChat() {
  return useMutation({ mutationFn: (body) => post('/copilot/chat', body) });
}

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: () => get('/admin/users', { limit: 50 }) });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => patch(`/admin/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useAuditLog() {
  return useQuery({ queryKey: ['audit'], queryFn: () => get('/admin/audit', { limit: 30 }) });
}
