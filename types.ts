
export enum UserRole {
  DRIVER = 'PEMANDU',
  HEAD_DRIVER = 'KETUA_PEMANDU'
}

export interface User {
  id: string;
  name: string;
  username: string; // Login ID
  password: string; // In real app, this should be hashed
  role: UserRole;
  phone?: string;
}

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

export interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
}