export type UserRole = "customer" | "worker" | "admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: any;
  location?: { latitude: number; longitude: number; address?: string };
  online?: boolean;
}

export type WorkerStatus = "pending" | "approved" | "rejected" | "suspended";
export type WorkerAvailability = "available" | "busy" | "offline";

export interface WorkerProfile {
  uid: string;
  name: string;
  category: string;
  city: string;
  experience: number;
  pricing: number; // PKR rate per hour/job
  rating: number;
  reviewCount: number;
  verified: boolean;
  status: WorkerStatus;
  availability: WorkerAvailability;
  about: string;
  photoURL?: string;
  profileImage?: string;
  phone?: string;
  skills?: string[];
  createdAt: any;
  location?: { latitude: number; longitude: number; address?: string };
  online?: boolean;
}

export type RequestStatus = 
  | "pending"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "work_finished"
  | "completed"
  | "rejected"
  | "cancelled"
  | "disputed";

export interface ServiceRequest {
  requestId: string;
  customerId: string;
  customerName: string;
  workerId: string; // empty if unassigned
  workerName: string; // empty if unassigned
  serviceCategory: string;
  title: string;
  description: string;
  status: RequestStatus;
  budget: number; // in PKR
  location: string; // address
  date: string; // scheduled date
  createdAt: any;
  paymentId?: string;
  paymentProvider?: "easypaisa" | "jazzcash" | "bank_transfer" | "cash";
  paymentStatus?: "awaiting_worker_confirmation" | "confirmed" | "failed" | "refunded";
  customerLocation?: { latitude: number; longitude: number; address?: string };
  negotiatedPrice?: number;
  workerCompletionConfirmed?: boolean;
  customerCompletionConfirmed?: boolean;
}

export interface Review {
  reviewId: string;
  workerId: string;
  customerId: string;
  customerName: string;
  rating: number;
  review: string;
  createdAt: any;
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export const SERVICE_CATEGORIES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "AC Technician",
  "Mason",
  "Welder",
  "Labor Worker",
  "CCTV Installer",
  "Solar Technician",
  "Home Cleaning",
  "Appliance Repair"
];

export const CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta"
];
