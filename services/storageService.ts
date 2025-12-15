
import { Trip, User, Vehicle, UserRole } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where
} from 'firebase/firestore';

// Collection Names
const COLL_USERS = 'users';
const COLL_VEHICLES = 'vehicles';
const COLL_TRIPS = 'trips';

// Local Storage Keys
const LS_KEYS = {
  USERS: 'kedriver_users',
  VEHICLES: 'kedriver_vehicles',
  TRIPS: 'kedriver_trips'
};

// Helper: Generate simple ID for local storage
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// Helper: Get Local Data
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper: Set Local Data
const setLocal = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- INITIALIZATION ---
export const checkAndSeedAdmin = async () => {
  if (db) {
    // --- CLOUD MODE ---
    try {
      const q = query(collection(db, COLL_USERS), where("role", "==", UserRole.HEAD_DRIVER));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(collection(db, COLL_USERS), {
           name: 'Admin', 
           username: 'admin', 
           password: 'password123', 
           role: UserRole.HEAD_DRIVER 
        });
        console.log("Cloud: Default admin created");
      }
    } catch (e) {
      console.error("Cloud Error seeding admin:", e);
    }
  } else {
    // --- LOCAL MODE ---
    const users = getLocal<User>(LS_KEYS.USERS);
    if (!users.some(u => u.role === UserRole.HEAD_DRIVER)) {
      const admin: User = {
         id: 'admin_local',
         name: 'Admin', 
         username: 'admin', 
         password: 'password123', 
         role: UserRole.HEAD_DRIVER 
      };
      users.push(admin);
      setLocal(LS_KEYS.USERS, users);
      console.log("Local: Default admin created");
    }
  }
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  if (db) {
    const snapshot = await getDocs(collection(db, COLL_USERS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } else {
    return getLocal<User>(LS_KEYS.USERS);
  }
};

export const addUser = async (user: User) => {
  // Check duplicate username locally before adding
  const users = await getUsers();
  if (users.some(u => u.username === user.username)) {
    throw new Error("Nama pengguna sudah wujud.");
  }

  if (db) {
    const { id, ...userData } = user; 
    await addDoc(collection(db, COLL_USERS), userData);
  } else {
    const users = getLocal<User>(LS_KEYS.USERS);
    users.push({ ...user, id: generateId() });
    setLocal(LS_KEYS.USERS, users);
  }
};

export const updateUser = async (updatedUser: User) => {
  if (db) {
    const userRef = doc(db, COLL_USERS, updatedUser.id);
    const { id, ...data } = updatedUser;
    await updateDoc(userRef, data);
  } else {
    const users = getLocal<User>(LS_KEYS.USERS);
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      setLocal(LS_KEYS.USERS, users);
    }
  }
};

export const deleteUser = async (userId: string) => {
  if (db) {
    await deleteDoc(doc(db, COLL_USERS, userId));
  } else {
    const users = getLocal<User>(LS_KEYS.USERS);
    const filtered = users.filter(u => u.id !== userId);
    setLocal(LS_KEYS.USERS, filtered);
  }
};

// --- VEHICLES ---
export const getVehicles = async (): Promise<Vehicle[]> => {
  if (db) {
    const snapshot = await getDocs(collection(db, COLL_VEHICLES));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
  } else {
    return getLocal<Vehicle>(LS_KEYS.VEHICLES);
  }
};

export const addVehicle = async (vehicle: Vehicle) => {
  if (db) {
    const { id, ...data } = vehicle;
    await addDoc(collection(db, COLL_VEHICLES), data);
  } else {
    const vehicles = getLocal<Vehicle>(LS_KEYS.VEHICLES);
    vehicles.push({ ...vehicle, id: generateId() });
    setLocal(LS_KEYS.VEHICLES, vehicles);
  }
};

export const updateVehicle = async (updatedVehicle: Vehicle) => {
  if (db) {
    const ref = doc(db, COLL_VEHICLES, updatedVehicle.id);
    const { id, ...data } = updatedVehicle;
    await updateDoc(ref, data);
  } else {
    const vehicles = getLocal<Vehicle>(LS_KEYS.VEHICLES);
    const index = vehicles.findIndex(v => v.id === updatedVehicle.id);
    if (index !== -1) {
      vehicles[index] = updatedVehicle;
      setLocal(LS_KEYS.VEHICLES, vehicles);
    }
  }
};

export const deleteVehicle = async (vehicleId: string) => {
  if (db) {
    await deleteDoc(doc(db, COLL_VEHICLES, vehicleId));
  } else {
    const vehicles = getLocal<Vehicle>(LS_KEYS.VEHICLES);
    const filtered = vehicles.filter(v => v.id !== vehicleId);
    setLocal(LS_KEYS.VEHICLES, filtered);
  }
};

// --- TRIPS ---
export const getTrips = async (): Promise<Trip[]> => {
  if (db) {
    const snapshot = await getDocs(collection(db, COLL_TRIPS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
  } else {
    return getLocal<Trip>(LS_KEYS.TRIPS);
  }
};

export const getActiveTripForDriver = async (driverId: string): Promise<Trip | null> => {
  if (db) {
    const q = query(
      collection(db, COLL_TRIPS), 
      where("driverId", "==", driverId),
      where("status", "==", "ACTIVE")
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() } as Trip;
    }
    return null;
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    return trips.find(t => t.driverId === driverId && t.status === 'ACTIVE') || null;
  }
};

export const startTrip = async (trip: Trip) => {
  if (db) {
    const { id, ...data } = trip;
    await addDoc(collection(db, COLL_TRIPS), data);
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    trips.push({ ...trip, id: generateId() });
    setLocal(LS_KEYS.TRIPS, trips);
  }
};

export const endTrip = async (trip: Trip) => {
  if (db) {
    if (!trip.id) return;
    const ref = doc(db, COLL_TRIPS, trip.id);
    const { id, ...data } = trip;
    await updateDoc(ref, data);
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    const index = trips.findIndex(t => t.id === trip.id);
    if (index !== -1) {
      trips[index] = trip;
      setLocal(LS_KEYS.TRIPS, trips);
    }
  }
};

export const updateTrip = async (updatedTrip: Trip) => {
  if (db) {
    const ref = doc(db, COLL_TRIPS, updatedTrip.id);
    const { id, ...data } = updatedTrip;
    await updateDoc(ref, data);
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    const index = trips.findIndex(t => t.id === updatedTrip.id);
    if (index !== -1) {
      trips[index] = updatedTrip;
      setLocal(LS_KEYS.TRIPS, trips);
    }
  }
};

export const deleteTrip = async (tripId: string) => {
  if (db) {
    await deleteDoc(doc(db, COLL_TRIPS, tripId));
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    const filtered = trips.filter(t => t.id !== tripId);
    setLocal(LS_KEYS.TRIPS, filtered);
  }
};
