
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
  where,
  getDoc
} from 'firebase/firestore';

const COLL_USERS = 'users';
const COLL_VEHICLES = 'vehicles';
const COLL_TRIPS = 'trips';

const LS_KEYS = {
  USERS: 'kedriver_users',
  VEHICLES: 'kedriver_vehicles',
  TRIPS: 'kedriver_trips'
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const getLocal = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocal = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
};

export const checkAndSeedAdmin = async () => {
  if (db) {
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
      }
    } catch (e) {}
  } else {
    const users = getLocal<User>(LS_KEYS.USERS);
    if (!users.some(u => u.role === UserRole.HEAD_DRIVER)) {
      users.push({
         id: 'admin_local',
         name: 'Admin', 
         username: 'admin', 
         password: 'password123', 
         role: UserRole.HEAD_DRIVER 
      });
      setLocal(LS_KEYS.USERS, users);
    }
  }
};

export const getUsers = async (): Promise<User[]> => {
  if (db) {
    const snapshot = await getDocs(collection(db, COLL_USERS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as User));
  }
  return getLocal<User>(LS_KEYS.USERS);
};

export const addUser = async (user: User) => {
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
    setLocal(LS_KEYS.USERS, users.filter(u => u.id !== userId));
  }
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  if (db) {
    const snapshot = await getDocs(collection(db, COLL_VEHICLES));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Vehicle));
  }
  return getLocal<Vehicle>(LS_KEYS.VEHICLES);
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
    setLocal(LS_KEYS.VEHICLES, vehicles.filter(v => v.id !== vehicleId));
  }
};

export const getTrips = async (): Promise<Trip[]> => {
  if (db) {
    const snapshot = await getDocs(collection(db, COLL_TRIPS));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Trip));
  }
  return getLocal<Trip>(LS_KEYS.TRIPS);
};

export const getActiveTripForDriver = async (driverId: string): Promise<Trip | null> => {
  if (db) {
    try {
      const q = query(
        collection(db, COLL_TRIPS), 
        where("driverId", "==", driverId),
        where("status", "==", "ACTIVE")
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any } as Trip;
      }
    } catch (e) {
      return null;
    }
    return null;
  }
  const trips = getLocal<Trip>(LS_KEYS.TRIPS);
  return trips.find(t => t.driverId === driverId && t.status === 'ACTIVE') || null;
};

export const startTrip = async (trip: Trip) => {
  if (db) {
    const { id, ...data } = trip;
    const docRef = await addDoc(collection(db, COLL_TRIPS), data);
    return docRef.id;
  }
  const trips = getLocal<Trip>(LS_KEYS.TRIPS);
  const newId = generateId();
  trips.push({ ...trip, id: newId });
  setLocal(LS_KEYS.TRIPS, trips);
  return newId;
};

export const updateTrip = async (updatedTrip: Trip) => {
  if (!updatedTrip.id) throw new Error("ID trip tidak dijumpai");
  
  const cleanData: any = {};
  Object.keys(updatedTrip).forEach(key => {
    const val = (updatedTrip as any)[key];
    if (val !== undefined && key !== 'id') {
      cleanData[key] = val;
    }
  });

  if (db) {
    const ref = doc(db, COLL_TRIPS, updatedTrip.id);
    await updateDoc(ref, cleanData);
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    const index = trips.findIndex(t => t.id === updatedTrip.id);
    if (index !== -1) {
      trips[index] = { ...updatedTrip };
      setLocal(LS_KEYS.TRIPS, trips);
    }
  }
};

export const endTrip = async (trip: Trip) => {
  return updateTrip(trip);
};

export const deleteTrip = async (tripId: string) => {
  if (db) {
    await deleteDoc(doc(db, COLL_TRIPS, tripId));
  } else {
    const trips = getLocal<Trip>(LS_KEYS.TRIPS);
    setLocal(LS_KEYS.TRIPS, trips.filter(t => t.id !== tripId));
  }
};