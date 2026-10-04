import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "./firebase";
import { WorkerProfile, ServiceRequest, UserProfile, AppNotification, WorkerStatus, WorkerAvailability } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_PROFILES_KEY = "kaamfix_profiles";
const LOCAL_REQUESTS_KEY = "kaamfix_requests";

function readLocalRecord<T>(key: string): Record<string, T> {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}

function readLocalRequests(): ServiceRequest[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_REQUESTS_KEY) || "[]"); } catch { return []; }
}

function writeLocalRequests(requests: ServiceRequest[]): void {
  localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
}

// --- dbService API wrappers ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) return docSnap.data() as UserProfile;
    const cached = readLocalRecord<UserProfile>(LOCAL_PROFILES_KEY)[uid] || null;
    if (cached) setDoc(doc(db, "users", uid), cached).catch(error => console.warn("Could not synchronize cached profile to Firestore.", error));
    return cached;
  } catch (error) {
    console.warn("Firestore profile unavailable; using the local profile cache.", error);
    return readLocalRecord<UserProfile>(LOCAL_PROFILES_KEY)[uid] || null;
  }
}

export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  const profiles = readLocalRecord<UserProfile>(LOCAL_PROFILES_KEY);
  profiles[uid] = profile;
  localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  try {
    await setDoc(doc(db, "users", uid), profile);
  } catch (error) {
    console.warn("Firestore profile save unavailable; profile saved locally.", error);
  }
}

export const INITIAL_APPROVED_WORKERS: WorkerProfile[] = [
  {
    uid: "w_lahore_elec_01",
    name: "Tariq Mehmood",
    category: "Electrician",
    city: "Lahore",
    experience: 8,
    pricing: 2500,
    rating: 4.9,
    reviewCount: 142,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-1.png",
    profileImage: "/assets/workers/worker-1.png",
    about: "Master Electrician in Lahore with 8 years of experience specializing in residential wiring, short-circuit troubleshooting, breaker panel upgrades, and inverter/UPS installations.",
    createdAt: "2026-01-15T08:00:00.000Z"
  },
  {
    uid: "w_karachi_plumb_01",
    name: "Muhammad Usman",
    category: "Plumber",
    city: "Karachi",
    experience: 10,
    pricing: 3000,
    rating: 4.8,
    reviewCount: 188,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-2.png",
    profileImage: "/assets/workers/worker-2.png",
    about: "Certified Senior Plumber serving Karachi. Expert in underground pipe leak detection, bathroom sanitary fitting, water pump repair, and instant geyser installation.",
    createdAt: "2026-01-16T09:00:00.000Z"
  },
  {
    uid: "w_islamabad_ac_01",
    name: "Farhan Ahmad",
    category: "AC Technician",
    city: "Islamabad",
    experience: 6,
    pricing: 3500,
    rating: 4.9,
    reviewCount: 96,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-3.png",
    profileImage: "/assets/workers/worker-3.png",
    about: "HVAC Specialist in Islamabad providing DC inverter AC installation, chemical master servicing, gas refilling (R32/R410), and PCB board repair.",
    createdAt: "2026-01-17T10:00:00.000Z"
  },
  {
    uid: "w_rawalpindi_carp_01",
    name: "Rashid Ali",
    category: "Carpenter",
    city: "Rawalpindi",
    experience: 12,
    pricing: 2800,
    rating: 4.7,
    reviewCount: 115,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-4.png",
    profileImage: "/assets/workers/worker-4.png",
    about: "Master Carpenter in Rawalpindi with 12 years expertise in custom kitchen cabinets, wardrobe design, door lock fitting, and hardwood furniture repair.",
    createdAt: "2026-01-18T11:00:00.000Z"
  },
  {
    uid: "w_faisalabad_paint_01",
    name: "Bilal Hassan",
    category: "Painter",
    city: "Faisalabad",
    experience: 7,
    pricing: 2000,
    rating: 4.6,
    reviewCount: 78,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-5.png",
    profileImage: "/assets/workers/worker-5.png",
    about: "Professional Painter in Faisalabad specializing in interior/exterior weather sheet painting, wall putty finish, texture painting, and dampness/seepage waterproofing treatment.",
    createdAt: "2026-01-19T12:00:00.000Z"
  },
  {
    uid: "w_multan_elec_02",
    name: "Imran Nazir",
    category: "Electrician",
    city: "Multan",
    experience: 9,
    pricing: 2200,
    rating: 4.8,
    reviewCount: 165,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-6.png",
    profileImage: "/assets/workers/worker-6.png",
    about: "Experienced Electrician in Multan. Expert in solar panel wiring, distribution box setup, commercial lighting, and generator changeover switch wiring.",
    createdAt: "2026-01-20T13:00:00.000Z"
  },
  {
    uid: "w_peshawar_plumb_02",
    name: "Zahid Hussain",
    category: "Plumber",
    city: "Peshawar",
    experience: 11,
    pricing: 2700,
    rating: 4.9,
    reviewCount: 210,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-7.png",
    profileImage: "/assets/workers/worker-7.png",
    about: "Senior Plumbing Specialist in Peshawar. Expert in PPRC/PEX piping, drainage unclogging, overhead tank cleaning, and automatic pressure pump installation.",
    createdAt: "2026-01-21T14:00:00.000Z"
  },
  {
    uid: "w_lahore_ac_02",
    name: "Kamran Shah",
    category: "AC Technician",
    city: "Lahore",
    experience: 7,
    pricing: 3200,
    rating: 4.7,
    reviewCount: 130,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-8.png",
    profileImage: "/assets/workers/worker-8.png",
    about: "AC Maintenance Expert in Lahore. Specializes in split AC jet washing, compressor replacement, leak testing, and seasonal maintenance packages.",
    createdAt: "2026-01-22T15:00:00.000Z"
  },
  {
    uid: "w_karachi_carp_02",
    name: "Faisal Iqbal",
    category: "Carpenter",
    city: "Karachi",
    experience: 8,
    pricing: 3000,
    rating: 4.8,
    reviewCount: 145,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-9.png",
    profileImage: "/assets/workers/worker-9.png",
    about: "Skilled Carpenter in Karachi. Custom furniture restoration, office partition work, wooden flooring, and modular kitchen door alignments.",
    createdAt: "2026-01-23T16:00:00.000Z"
  },
  {
    uid: "w_islamabad_paint_02",
    name: "Hamza Chaudhry",
    category: "Painter",
    city: "Islamabad",
    experience: 5,
    pricing: 2400,
    rating: 4.9,
    reviewCount: 82,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-10.png",
    profileImage: "/assets/workers/worker-10.png",
    about: "Premium Wall Finishing & Painting Specialist in Islamabad. High-gloss enamel coating, plastic emulsion, stencilling, and ceiling design coating.",
    createdAt: "2026-01-24T17:00:00.000Z"
  },
  {
    uid: "w_rawalpindi_elec_03",
    name: "Sajid Khan",
    category: "Electrician",
    city: "Rawalpindi",
    experience: 6,
    pricing: 1800,
    rating: 4.5,
    reviewCount: 64,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-11.png",
    profileImage: "/assets/workers/worker-11.png",
    about: "Reliable Electrician in Rawalpindi. Smart home switchboard installation, ceiling fan installation, LED concealed lighting, and short circuit repairs.",
    createdAt: "2026-01-25T18:00:00.000Z"
  },
  {
    uid: "w_faisalabad_plumb_03",
    name: "Noman Akhtar",
    category: "Plumber",
    city: "Faisalabad",
    experience: 5,
    pricing: 1900,
    rating: 4.6,
    reviewCount: 52,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-12.png",
    profileImage: "/assets/workers/worker-12.png",
    about: "Sanitary & Plumbing Specialist in Faisalabad. Quick response for pipe leaks, tap repair, water heater fitting, and sewer line unblocking.",
    createdAt: "2026-01-26T19:00:00.000Z"
  },
  {
    uid: "w_multan_ac_03",
    name: "Tanveer Ahmed",
    category: "AC Technician",
    city: "Multan",
    experience: 9,
    pricing: 3800,
    rating: 4.9,
    reviewCount: 175,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-13.png",
    profileImage: "/assets/workers/worker-13.png",
    about: "Commercial & Domestic AC Technician in Multan. Floor standing & cassette AC servicing, copper piping work, gas leak repair, and inverter unit diagnostic.",
    createdAt: "2026-01-27T20:00:00.000Z"
  },
  {
    uid: "w_peshawar_carp_03",
    name: "Waqas Malik",
    category: "Carpenter",
    city: "Peshawar",
    experience: 10,
    pricing: 2600,
    rating: 4.7,
    reviewCount: 108,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-14.png",
    profileImage: "/assets/workers/worker-14.png",
    about: "Precision Woodwork Specialist in Peshawar. Wooden door repair, lock replacement, custom shelving, sofa frame repairing, and polishing.",
    createdAt: "2026-01-28T21:00:00.000Z"
  },
  {
    uid: "w_lahore_paint_03",
    name: "Arshad Bashir",
    category: "Painter",
    city: "Lahore",
    experience: 11,
    pricing: 2800,
    rating: 5.0,
    reviewCount: 224,
    verified: true,
    status: "approved",
    availability: "available",
    photoURL: "/assets/workers/worker-15.png",
    profileImage: "/assets/workers/worker-15.png",
    about: "Expert Painter in Lahore. Complete villa & bungalow painting, damp proofing, rockwall finish, wood stain polishing, and spray painting.",
    createdAt: "2026-01-29T22:00:00.000Z"
  }
];

export async function seedInitialWorkersIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, "workers"));
    if (snap.empty) {
      console.log("[dbService] Firestore 'workers' collection is empty. Auto-seeding initial approved workers to Firestore database...");
      const promises = INITIAL_APPROVED_WORKERS.map((worker) =>
        setDoc(doc(db, "workers", worker.uid), worker, { merge: true })
      );
      await Promise.all(promises);
      console.log(`[dbService] Successfully seeded ${INITIAL_APPROVED_WORKERS.length} workers into live Firestore.`);
    }
  } catch (err) {
    console.warn("[dbService] Notice: Could not auto-seed workers to Firestore:", err);
  }
}

export function getDeletedWorkerIds(): Set<string> {
  try {
    const raw = localStorage.getItem("kaamfix_deleted_worker_ids");
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markWorkerDeletedLocally(workerId: string): void {
  try {
    const deleted = getDeletedWorkerIds();
    deleted.add(workerId);
    localStorage.setItem("kaamfix_deleted_worker_ids", JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.warn("Failed to update deleted worker IDs in localStorage", e);
  }
}

export async function deleteWorker(workerId: string): Promise<void> {
  try {
    markWorkerDeletedLocally(workerId);
    const workerRef = doc(db, "workers", workerId);
    await deleteDoc(workerRef);
    console.log(`[deleteWorker] Successfully deleted worker document '${workerId}' from Firestore 'workers' collection.`);
  } catch (err: any) {
    console.error(`[deleteWorker] Error deleting worker doc '${workerId}' from Firestore:`, err);
    throw err;
  }
}

export function ensureWorkerProfileFields(raw: any, docId?: string): { worker: WorkerProfile; isModified: boolean } {
  if (!raw) {
    const fallbackId = docId || "worker_" + Date.now();
    return {
      worker: {
        uid: fallbackId,
        name: "Service Worker",
        category: "Electrician",
        city: "Lahore",
        status: "approved",
        availability: "available",
        pricing: 1500,
        experience: 5,
        rating: 5.0,
        reviewCount: 1,
        verified: true,
        about: "Experienced handyman providing professional home services.",
        photoURL: "",
        profileImage: "",
        phone: "0300-0000000",
        skills: ["Maintenance", "Repair"],
        createdAt: new Date().toISOString()
      },
      isModified: true
    };
  }

  let isModified = false;
  const uid = raw.uid || docId || "";
  if (!raw.uid) isModified = true;

  const name = raw.name || "Service Worker";
  if (!raw.name) isModified = true;

  const category = raw.category || "Electrician";
  if (!raw.category) isModified = true;

  const city = raw.city || "Lahore";
  if (!raw.city) isModified = true;

  const status: WorkerStatus = (raw.status === "approved" || raw.status === "pending" || raw.status === "suspended" || raw.status === "rejected")
    ? raw.status
    : "approved";
  if (!raw.status) isModified = true;

  const availability: WorkerAvailability = (raw.availability === "available" || raw.availability === "busy" || raw.availability === "offline")
    ? raw.availability
    : "available";
  if (!raw.availability) isModified = true;

  const pricing = typeof raw.pricing === "number" && !isNaN(raw.pricing) ? raw.pricing : 1500;
  if (typeof raw.pricing !== "number" || isNaN(raw.pricing)) isModified = true;

  const experience = typeof raw.experience === "number" && !isNaN(raw.experience) ? raw.experience : 5;
  if (typeof raw.experience !== "number" || isNaN(raw.experience)) isModified = true;

  const profileImage = raw.profileImage || raw.photoURL || "";
  const photoURL = raw.photoURL || raw.profileImage || "";
  if (!raw.profileImage && photoURL) isModified = true;
  if (!raw.photoURL && profileImage) isModified = true;

  const rating = typeof raw.rating === "number" && !isNaN(raw.rating) ? raw.rating : 5.0;
  const reviewCount = typeof raw.reviewCount === "number" && !isNaN(raw.reviewCount) ? raw.reviewCount : 0;
  const verified = typeof raw.verified === "boolean" ? raw.verified : true;
  const about = raw.about || raw.bio || `Skilled ${category} specialist in ${city} with ${experience} years of experience.`;
  if (!raw.about) isModified = true;

  const worker: WorkerProfile = {
    uid,
    name,
    category,
    city,
    status,
    availability,
    pricing,
    experience,
    profileImage,
    photoURL,
    rating,
    reviewCount,
    verified,
    about,
    phone: raw.phone || "0300-0000000",
    skills: Array.isArray(raw.skills) && raw.skills.length > 0 ? raw.skills : [category, "Maintenance", "Repair"],
    createdAt: raw.createdAt || new Date().toISOString()
  };

  return { worker, isModified };
}

export async function getWorkers(): Promise<WorkerProfile[]> {
  try {
    const q = query(collection(db, "workers"), where("status", "==", "approved"));
    const snapshot = await getDocs(q);
    const workers: WorkerProfile[] = [];
    snapshot.forEach((d) => {
      const { worker, isModified } = ensureWorkerProfileFields(d.data(), d.id);
      workers.push(worker);
      if (isModified && worker.uid) {
        updateWorkerProfile(worker.uid, worker).catch(() => {});
      }
    });

    if (snapshot.empty) {
      seedInitialWorkersIfEmpty().catch(() => {});
    }
    
    const existingUids = new Set(workers.map(w => w.uid));
    const missing = INITIAL_APPROVED_WORKERS.filter(w => !existingUids.has(w.uid) && w.status === "approved");
    const fullList = [...workers, ...missing];
    const deletedIds = getDeletedWorkerIds();
    return fullList.filter(w => !deletedIds.has(w.uid) && w.status === "approved");
  } catch (err) {
    console.warn("Firestore getWorkers notice, returning initial approved workers:", err);
    const deletedIds = getDeletedWorkerIds();
    return INITIAL_APPROVED_WORKERS.filter(w => !deletedIds.has(w.uid) && w.status === "approved");
  }
}

export async function getWorker(workerId: string): Promise<WorkerProfile | null> {
  const deletedIds = getDeletedWorkerIds();
  if (deletedIds.has(workerId)) return null;
  try {
    const docSnap = await getDoc(doc(db, "workers", workerId));
    if (docSnap.exists()) {
      const { worker, isModified } = ensureWorkerProfileFields(docSnap.data(), docSnap.id);
      if (isModified && worker.uid) {
        updateWorkerProfile(worker.uid, worker).catch(() => {});
      }
      return worker;
    }
    const found = INITIAL_APPROVED_WORKERS.find(w => w.uid === workerId);
    return found || null;
  } catch (err) {
    console.warn("Firestore getWorker notice, looking up in initial approved workers:", err);
    const found = INITIAL_APPROVED_WORKERS.find(w => w.uid === workerId);
    return found || null;
  }
}

export async function saveWorkerProfile(workerId: string, profile: WorkerProfile): Promise<void> {
  await setDoc(doc(db, "workers", workerId), profile);
}

export async function updateWorkerProfile(workerId: string, updates: Partial<WorkerProfile>): Promise<void> {
  try {
    const workerRef = doc(db, "workers", workerId);
    const snap = await getDoc(workerRef);
    if (snap.exists()) {
      await updateDoc(workerRef, updates);
      console.log(`[updateWorkerProfile] Updated existing worker doc ${workerId} in Firestore.`);
    } else {
      const initial = INITIAL_APPROVED_WORKERS.find(w => w.uid === workerId);
      const fullData = initial ? { ...initial, ...updates } : updates;
      await setDoc(workerRef, fullData, { merge: true });
      console.log(`[updateWorkerProfile] Created worker doc ${workerId} in Firestore via setDoc merge.`);
    }
  } catch (err) {
    console.warn(`[updateWorkerProfile] updateDoc failed for worker ${workerId}, executing setDoc merge fallback:`, err);
    const workerRef = doc(db, "workers", workerId);
    const initial = INITIAL_APPROVED_WORKERS.find(w => w.uid === workerId);
    const fullData = initial ? { ...initial, ...updates } : updates;
    await setDoc(workerRef, fullData, { merge: true });
  }
}

export async function getReviews(workerId: string): Promise<any[]> {
  try {
    const q = query(collection(db, "reviews"), where("workerId", "==", workerId));
    const snapshot = await getDocs(q);
    const reviews: any[] = [];
    snapshot.forEach(d => reviews.push(d.data()));
    return reviews;
  } catch (err) {
    console.error("Firestore getReviews error:", err);
    return [];
  }
}

export async function addReview(review: any): Promise<void> {
  // 1. Add review
  await setDoc(doc(db, "reviews", review.reviewId), review);

  // 2. Recalculate worker stats
  const workerRef = doc(db, "workers", review.workerId);
  try {
    const workerSnap = await getDoc(workerRef);
    if (workerSnap.exists()) {
      const workerData = workerSnap.data();
      const count = workerData.reviewCount || 0;
      const currentRating = workerData.rating || 0;
      const newCount = count + 1;
      const newRating = Number(((currentRating * count + review.rating) / newCount).toFixed(1));
      
      await updateDoc(workerRef, {
        rating: newRating,
        reviewCount: newCount
      });
    }
  } catch (err) {
    console.error("Failed to update worker rating and reviewCount in Live Firestore:", err);
  }
}

export async function getRequests(customerId?: string, workerId?: string, category?: string): Promise<ServiceRequest[]> {
  try {
    let q;
    if (customerId) {
      q = query(collection(db, "requests"), where("customerId", "==", customerId));
    } else if (workerId && category) {
      const pendingQuery = query(
        collection(db, "requests"),
        where("serviceCategory", "==", category),
        where("status", "==", "pending")
      );
      const assignedQuery = query(
        collection(db, "requests"),
        where("workerId", "==", workerId)
      );
      
      const [pendingSnap, assignedSnap] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(assignedQuery)
      ]);
      
      const list: ServiceRequest[] = [];
      pendingSnap.forEach(d => list.push(d.data() as ServiceRequest));
      assignedSnap.forEach(d => {
        if (!list.some(r => r.requestId === d.id)) {
          list.push(d.data() as ServiceRequest);
        }
      });
      return list;
    } else {
      q = query(collection(db, "requests"));
    }

    const snapshot = await getDocs(q);
    const list: ServiceRequest[] = [];
    snapshot.forEach((d) => list.push(d.data() as ServiceRequest));
    const local = readLocalRequests().filter(request => !list.some(item => item.requestId === request.requestId));
    return [...list, ...local].filter(request => !customerId || request.customerId === customerId);
  } catch (err) {
    console.error("Firestore getRequests error:", err);
    return readLocalRequests().filter(request => {
      if (customerId) return request.customerId === customerId;
      if (workerId && category) return request.workerId === workerId || (request.serviceCategory === category && request.status === "pending");
      return true;
    });
  }
}

export async function createRequest(request: any): Promise<void> {
  const localRequests = readLocalRequests().filter(item => item.requestId !== request.requestId);
  writeLocalRequests([request, ...localRequests]);

  try {
    await setDoc(doc(db, "requests", request.requestId), request);
  } catch (error) {
    console.warn("Firestore booking save unavailable; booking saved locally.", error);
    window.dispatchEvent(new Event("kaamfix:requests-changed"));
    return;
  }

  if (request.workerId) {
    await createNotification(request.workerId, `New service booking requested: "${request.title}"`);
  }
  window.dispatchEvent(new Event("kaamfix:requests-changed"));
}

export async function updateRequestStatus(requestId: string, status: string, additionalFields?: any): Promise<void> {
  const localRequests = readLocalRequests();
  const localIndex = localRequests.findIndex(item => item.requestId === requestId);
  if (localIndex >= 0) {
    localRequests[localIndex] = { ...localRequests[localIndex], status, ...additionalFields };
    writeLocalRequests(localRequests);
    window.dispatchEvent(new Event("kaamfix:requests-changed"));
  }
  let request: any = null;
  try {
    const docSnap = await getDoc(doc(db, "requests", requestId));
    if (docSnap.exists()) {
      request = docSnap.data();
    }
  } catch (err) {
    console.error("Error fetching request for notification:", err);
  }

  try {
    await updateDoc(doc(db, "requests", requestId), { status, ...additionalFields });
  } catch (error) {
    console.warn("Firestore request update unavailable; request updated locally.", error);
    if (!request && localIndex >= 0) request = localRequests[localIndex];
  }

  if (request) {
    const title = request.title;
    const customerId = request.customerId;
    const workerId = additionalFields?.workerId || request.workerId;
    const workerName = additionalFields?.workerName || request.workerName;

    if (status === "accepted") {
      await createNotification(customerId, `Your service booking "${title}" was accepted by ${workerName || "a worker"}`);
    } else if (status === "in_progress") {
      await createNotification(customerId, `Your project "${title}" is now in progress.`);
    } else if (status === "completed") {
      await createNotification(customerId, `Your project "${title}" has been marked completed! Please write a review.`);
      if (workerId) {
        await createNotification(workerId, `Job "${title}" completed successfully.`);
      }
    } else if (status === "disputed") {
      await createNotification(customerId, `A dispute has been opened for "${title}". Admin arbitration is active.`);
      if (workerId) {
        await createNotification(workerId, `A dispute has been opened for "${title}". Admin arbitration is active.`);
      }
    } else if (status === "cancelled") {
      await createNotification(customerId, `Your booking for "${title}" has been cancelled.`);
      if (workerId) {
        await createNotification(workerId, `Booking for "${title}" was cancelled.`);
      }
    }
  }
}

// --- Notification API wrappers ---

export async function createNotification(userId: string, message: string): Promise<void> {
  const notificationId = "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  const notification: AppNotification = {
    notificationId,
    userId,
    message,
    read: false,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
  };

  try {
    await setDoc(doc(db, "notifications", notificationId), {
      ...notification,
      createdAt: new Date()
    });
  } catch (err) {
    console.error("Firestore createNotification error:", err);
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (err) {
    console.error("Firestore markNotificationAsRead error:", err);
  }
}

// --- Real-Time Subscribe functions ---

export function subscribeRequests(
  callback: (requests: ServiceRequest[]) => void,
  options: { customerId?: string; workerId?: string; category?: string; isAdmin?: boolean; onError?: (error: Error) => void }
): () => void {
  const handleSubscriptionError = (context: string, error: Error) => {
    console.error(`subscribeRequests ${context} error:`, error);
    const local = readLocalRequests().filter(request => {
      if (options.customerId) return request.customerId === options.customerId;
      if (options.workerId && options.category) return request.workerId === options.workerId || (request.serviceCategory === options.category && request.status === "pending");
      return true;
    });
    callback(local);
    options.onError?.(error);
  };
  if (options.isAdmin) {
    const q = query(collection(db, "requests"));
    return onSnapshot(q, (snapshot) => {
      const list: ServiceRequest[] = [];
      snapshot.forEach(d => list.push(d.data() as ServiceRequest));
      callback(list);
    }, (err) => handleSubscriptionError("admin", err));
  }

  if (options.customerId) {
    const q = query(collection(db, "requests"), where("customerId", "==", options.customerId));
    return onSnapshot(q, (snapshot) => {
      const list: ServiceRequest[] = [];
      snapshot.forEach(d => list.push(d.data() as ServiceRequest));
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    }, (err) => handleSubscriptionError("customer", err));
  }

  if (options.workerId && options.category) {
    const pendingQuery = query(
      collection(db, "requests"),
      where("serviceCategory", "==", options.category),
      where("status", "==", "pending")
    );
    const assignedQuery = query(
      collection(db, "requests"),
      where("workerId", "==", options.workerId)
    );

    let pendingList: ServiceRequest[] = [];
    let assignedList: ServiceRequest[] = [];

    const mergeAndTrigger = () => {
      const mergedMap = new Map<string, ServiceRequest>();
      pendingList.forEach(r => mergedMap.set(r.requestId, r));
      assignedList.forEach(r => mergedMap.set(r.requestId, r));
      const mergedList = Array.from(mergedMap.values());
      mergedList.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(mergedList);
    };

    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      pendingList = [];
      snapshot.forEach(d => pendingList.push(d.data() as ServiceRequest));
      mergeAndTrigger();
    }, (err) => handleSubscriptionError("pending", err));

    const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
      assignedList = [];
      snapshot.forEach(d => assignedList.push(d.data() as ServiceRequest));
      mergeAndTrigger();
    }, (err) => handleSubscriptionError("assigned", err));

    return () => {
      unsubPending();
      unsubAssigned();
    };
  }

  const q = query(collection(db, "requests"));
  return onSnapshot(q, (snapshot) => {
    const list: ServiceRequest[] = [];
    snapshot.forEach(d => list.push(d.data() as ServiceRequest));
    callback(list);
  });
}

export function subscribeNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach(d => list.push(d.data() as AppNotification));
    list.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (typeof a.createdAt === 'object' && a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
      const timeB = b.createdAt?.seconds || (typeof b.createdAt === 'object' && b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
      return timeB - timeA;
    });
    callback(list);
  }, (err) => {
    console.error("subscribeNotifications error:", err);
    callback([]);
  });
}

export function subscribeWorkers(callback: (workers: WorkerProfile[]) => void): () => void {
  const q = query(collection(db, "workers"));
  return onSnapshot(q, (snapshot) => {
    const list: WorkerProfile[] = [];
    snapshot.forEach(d => {
      const { worker, isModified } = ensureWorkerProfileFields(d.data(), d.id);
      list.push(worker);
      if (isModified && worker.uid) {
        updateWorkerProfile(worker.uid, worker).catch(() => {});
      }
    });
    
    const existingUids = new Set(list.map(w => w.uid));
    const missing = INITIAL_APPROVED_WORKERS.filter(w => !existingUids.has(w.uid));
    const fullList = [...list, ...missing];
    const deletedIds = getDeletedWorkerIds();
    const activeList = fullList.filter(w => !deletedIds.has(w.uid));
    
    console.log(`[subscribeWorkers] Firestore collection 'workers' query executed. Fetched from Firestore: ${list.length} doc(s). Active worker profiles returned: ${activeList.length}`);
    callback(activeList);
  }, (err) => {
    console.error("subscribeWorkers error:", err);
    const deletedIds = getDeletedWorkerIds();
    const fallback = INITIAL_APPROVED_WORKERS.filter(w => !deletedIds.has(w.uid));
    console.log(`[subscribeWorkers] Fallback triggered due to error. Returning ${fallback.length} initial workers`);
    callback(fallback);
  });
}

export function subscribeUsers(callback: (users: UserProfile[]) => void): () => void {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    const list: UserProfile[] = [];
    snapshot.forEach(d => list.push(d.data() as UserProfile));
    callback(list);
  }, (err) => {
    console.error("subscribeUsers error:", err);
    callback([]);
  });
}

// Admin API wrappers
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const list: UserProfile[] = [];
    snapshot.forEach((d) => list.push(d.data() as UserProfile));
    return list;
  } catch (err) {
    console.error("Firestore getAllUsers error:", err);
    return [];
  }
}

export async function getAllWorkers(): Promise<WorkerProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, "workers"));
    const list: WorkerProfile[] = [];
    snapshot.forEach((d) => {
      const { worker, isModified } = ensureWorkerProfileFields(d.data(), d.id);
      list.push(worker);
      if (isModified && worker.uid) {
        updateWorkerProfile(worker.uid, worker).catch(() => {});
      }
    });
    const existingUids = new Set(list.map(w => w.uid));
    const missing = INITIAL_APPROVED_WORKERS.filter(w => !existingUids.has(w.uid));
    const fullList = [...list, ...missing];
    const deletedIds = getDeletedWorkerIds();
    const activeList = fullList.filter(w => !deletedIds.has(w.uid));
    console.log(`[getAllWorkers] Query: collection('workers') | Fetched: ${list.length} | Active returned: ${activeList.length}`);
    return activeList;
  } catch (err) {
    console.error("Firestore getAllWorkers error:", err);
    const deletedIds = getDeletedWorkerIds();
    return INITIAL_APPROVED_WORKERS.filter(w => !deletedIds.has(w.uid));
  }
}

export async function getAllRequests(): Promise<ServiceRequest[]> {
  try {
    const snapshot = await getDocs(collection(db, "requests"));
    const list: ServiceRequest[] = [];
    snapshot.forEach((d) => list.push(d.data() as ServiceRequest));
    return list;
  } catch (err) {
    console.error("Firestore getAllRequests error:", err);
    return [];
  }
}
