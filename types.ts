
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  location?: Coordinates;
  distanceFromPoint?: number;
  isNearby: boolean;
  status: 'active' | 'arrived' | 'offline';
}

export interface FriendCircle {
  id: string;
  name: string;
  icon: string;
  color: string; // Ex: 'indigo', 'emerald', 'rose', 'amber', 'sky'
  members: User[];
  activeMeetingPoint: MeetingPoint | null;
}

export interface SubsplashEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  locationName: string;
  address: string;
  coordinates: Coordinates;
  attendance?: string[];
}

export interface MeetingPoint extends SubsplashEvent {
  radius: number;
  isArchived?: boolean;
  travelTimeMinutes?: number;
}

export type ViewMode = 'radar' | 'map';

export type Language = 'pt' | 'en';

export interface AppState {
  currentUser: User;
  circles: FriendCircle[];
  activeCircleId: string;
  isTracking: boolean;
  error: string | null;
  selectedUserForChat: User | null;
  messages: ChatMessage[];
  viewMode: ViewMode;
  subsplashEvents: SubsplashEvent[];
  archivedEvents: MeetingPoint[];
  language: Language;
}
