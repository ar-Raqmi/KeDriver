export type UserRole = 'ADMIN' | 'REQUESTER' | 'DRIVER';

export interface User {
  id: string;
  username: string;
  password?: string; // For custom auth
  role: UserRole;
  name?: string;
  createdAt?: number;
}

export type TimePreference = 'Pagi' | 'Petang';
export type RequestStatus = 'PENDING' | 'SCHEDULED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';

export interface RideRequest {
  id: string;
  requesterId: string;
  requesterUsername: string;
  requesterName?: string;
  destinations: string[];
  date: string; // YYYY-MM-DD
  timePreference: TimePreference;
  note?: string;
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Ride {
  id: string;
  driverName: string;
  vehicleId?: string;
  plateNumber?: string;
  vehicleModel?: string;
  vehicleType?: string;
  date: string;
  time: string;
  requestIds: string[];
  acceptedDestinations: string[];
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: number;
  completedAt?: number;
}

// DRIVER FEATURE TYPES (Adapted from reference)
export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: string; // Car, Van, Lorry
}

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleModel: string;
  vehicleBrand?: string;
  plateNumber: string;
  origin: string;
  destination: string;
  passengers: string; 
  remarks?: string;
  startTime: number;
  endTime?: number;
  durationMinutes?: number;
  status: 'ACTIVE' | 'COMPLETED';
}
