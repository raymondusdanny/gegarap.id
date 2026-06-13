/** Shape passed from server components to client UI for a provider listing. */
export interface ProviderListItem {
  id: string;
  category: string;
  dailyRate: number;
  bio: string | null;
  avatarUrl: string | null;
  rating: number;
  ratingCount: number;
  completedJobs: number;
  latitude: number | null;
  longitude: number | null;
  user: { name: string };
}
