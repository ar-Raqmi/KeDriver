import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, RideRequest, Ride, UserRole, Trip, Vehicle } from './types';
import { getTodayStrGMT8 } from './lib/dateUtils';
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  getDocs,
  limit
} from 'firebase/firestore';

interface State {
  currentUser: User | null;
  users: User[];
  requests: RideRequest[];
  rides: Ride[];
  trips: Trip[];
  vehicles: Vehicle[];
  isLoading: boolean;
}

interface AppContextType extends State {
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  
  // User Management
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Vehicle Management
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  
  // Ride Requests
  addRequest: (req: Omit<RideRequest, 'id' | 'requesterId' | 'requesterUsername' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  rejectRequests: (ids: string[]) => Promise<void>;
  
  // Scheduling
  scheduleRide: (driverName: string, date: string, time: string, requestIds: string[], destinations: string[]) => Promise<void>;
  completeRide: (rideId: string) => Promise<void>;
  deleteRide: (rideId: string) => Promise<void>;
  
  // Driving (Trips)
  startTrip: (trip: Omit<Trip, 'id' | 'status' | 'startTime'>) => Promise<string>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;

  // Request Management
  deleteRequest: (requestId: string) => Promise<void>;
  updateRequest: (requestId: string, req: Partial<RideRequest>) => Promise<void>;
  cleanupOldData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    currentUser: null,
    users: [],
    requests: [],
    rides: [],
    trips: [],
    vehicles: [],
    isLoading: true,
  });

  // Rehydrate auth from local storage (UI only, verification still checks Firestore)
  useEffect(() => {
    const savedUser = localStorage.getItem('kedriver_auth');
    if (savedUser) {
      setState(prev => ({ ...prev, currentUser: JSON.parse(savedUser) }));
    }
    

  }, []);

  // Real-time Sync
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
      setState(prev => ({ ...prev, users }));
    });

    const unsubRequests = onSnapshot(collection(db, 'requests'), (snapshot) => {
      const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RideRequest));
      setState(prev => ({ ...prev, requests }));
    });

    const unsubRides = onSnapshot(collection(db, 'rides'), (snapshot) => {
      const rides = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ride));
      setState(prev => ({ ...prev, rides }));
    });

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snapshot) => {
      const trips = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
      setState(prev => ({ ...prev, trips }));
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
      const vehicles = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      setState(prev => ({ ...prev, vehicles, isLoading: false }));
    });

    return () => {
      unsubUsers();
      unsubRequests();
      unsubRides();
      unsubTrips();
      unsubVehicles();
    };
  }, []);

  // Auto-expire requests (Logic maintained from original app)
  useEffect(() => {
    if (state.isLoading) return;
    
    if (state.isLoading || state.requests.length === 0) return;
    
    const todayGMT8Str = getTodayStrGMT8();
    const pastRequests = state.requests.filter(req => req.date < todayGMT8Str);
    
    if (pastRequests.length > 0) {
      pastRequests.forEach(req => {
        deleteDoc(doc(db, 'requests', req.id));
      });
    }
  }, [state.requests, state.isLoading]);

  const login = async (username: string, pass: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('username', '==', username), where('password', '==', pass), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
      setState(prev => ({ ...prev, currentUser: userData }));
      localStorage.setItem('kedriver_auth', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    localStorage.removeItem('kedriver_auth');
  };

  // User Management
  const addUser = async (user: Omit<User, 'id'>) => {
    // Check if username already exists
    const existing = state.users.find(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (existing) {
      throw new Error(`ID "${user.username}" telah digunakan. Sila guna ID lain.`);
    }
    await addDoc(collection(db, 'users'), user);
  };

  const updateUser = async (user: User) => {
    const { id, ...data } = user;
    await updateDoc(doc(db, 'users', id), data as any);
  };

  const deleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
  };

  // Vehicle Management
  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    await addDoc(collection(db, 'vehicles'), vehicle);
  };

  const updateVehicle = async (vehicle: Vehicle) => {
    const { id, ...data } = vehicle;
    await updateDoc(doc(db, 'vehicles', id), data as any);
  };

  const deleteVehicle = async (vehicleId: string) => {
    await deleteDoc(doc(db, 'vehicles', vehicleId));
  };

  // Ride Requests
  const addRequest = async (req: Omit<RideRequest, 'id' | 'requesterId' | 'requesterUsername' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!state.currentUser) return;
    const now = Date.now();
    await addDoc(collection(db, 'requests'), {
      ...req,
      requesterId: state.currentUser.id,
      requesterUsername: state.currentUser.username,
      requesterName: state.currentUser.name || state.currentUser.username,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
  };

  const rejectRequests = async (ids: string[]) => {
    const now = Date.now();
    for (const id of ids) {
      await updateDoc(doc(db, 'requests', id), { status: 'REJECTED', updatedAt: now });
    }
  };

  // Scheduling
  const scheduleRide = async (
    driverName: string, 
    date: string, 
    time: string, 
    requestIds: string[], 
    destinations: string[],
    vehicleId?: string,
    plateNumber?: string,
    vehicleModel?: string,
    vehicleType?: string
  ) => {
    const now = Date.now();
    const rideRef = await addDoc(collection(db, 'rides'), {
      driverName, date, time, requestIds, acceptedDestinations: destinations,
      vehicleId: vehicleId || '',
      plateNumber: plateNumber || '',
      vehicleModel: vehicleModel || '',
      vehicleType: vehicleType || '',
      status: 'SCHEDULED', createdAt: now
    });
    
    for (const id of requestIds) {
      await updateDoc(doc(db, 'requests', id), { status: 'SCHEDULED', updatedAt: now });
    }
  };

  const completeRide = async (rideId: string) => {
    const now = Date.now();
    const ride = state.rides.find(r => r.id === rideId);
    if (!ride) return;

    await updateDoc(doc(db, 'rides', rideId), { status: 'COMPLETED', completedAt: now });
    for (const id of ride.requestIds) {
      await updateDoc(doc(db, 'requests', id), { status: 'COMPLETED', updatedAt: now });
    }
  };

  const deleteRide = async (rideId: string) => {
    const ride = state.rides.find(r => r.id === rideId);
    if (!ride) return;

    await deleteDoc(doc(db, 'rides', rideId));
    const now = Date.now();
    for (const id of ride.requestIds) {
      await updateDoc(doc(db, 'requests', id), { status: 'REJECTED', updatedAt: now });
    }
  };

  const updateRide = async (rideId: string, data: Partial<Ride>) => {
    await updateDoc(doc(db, 'rides', rideId), data as any);
  };

  // Driving (Trips Logic from Reference)
  const startTrip = async (trip: Omit<Trip, 'id' | 'status' | 'startTime'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'trips'), {
      ...trip,
      status: 'ACTIVE',
      startTime: Date.now()
    });
    return docRef.id;
  };

  const updateTrip = async (trip: Trip) => {
    const { id, ...data } = trip;
    await updateDoc(doc(db, 'trips', id), data as any);
  };

  const deleteTrip = async (tripId: string) => {
    await deleteDoc(doc(db, 'trips', tripId));
  };
  const deleteRequest = async (id: string) => {
    await deleteDoc(doc(db, 'requests', id));
  };

  const updateRequest = async (id: string, data: Partial<RideRequest>) => {
    await updateDoc(doc(db, 'requests', id), data as any);
  };

  const cleanupOldData = async () => {
    const today = getTodayStrGMT8();
    
    // 1. Cleanup Requests older than today
    const pastRequests = state.requests.filter(r => r.date < today);
    for (const req of pastRequests) {
      await deleteDoc(doc(db, 'requests', req.id));
    }

    // 2. Cleanup Rides that are COMPLETED and older than today
    const pastRides = state.rides.filter(r => r.status === 'COMPLETED' && r.date < today);
    for (const ride of pastRides) {
      await deleteDoc(doc(db, 'rides', ride.id));
    }

    // 3. Cleanup Trips (Logs) that are COMPLETED and older than 48 hours
    const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
    const oldTrips = state.trips.filter(t => t.status === 'COMPLETED' && t.endTime && t.endTime < twoDaysAgo);
    for (const trip of oldTrips) {
      await deleteDoc(doc(db, 'trips', trip.id));
    }
  };

  return (
    <AppContext.Provider value={{ 
      ...state, 
      login, 
      logout,
      addUser,
      updateUser,
      deleteUser,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addRequest, 
      rejectRequests, 
      scheduleRide, 
      completeRide, 
      deleteRide,
      updateRide,
      startTrip,
      updateTrip,
      deleteTrip,
      deleteRequest,
      updateRequest,
      cleanupOldData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppStore = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be within AppProvider");
  return ctx;
};
