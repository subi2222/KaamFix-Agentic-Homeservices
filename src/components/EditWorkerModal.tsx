import React, { useState, useRef, useEffect } from "react";
import { WorkerProfile, WorkerStatus, WorkerAvailability } from "../types";
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Phone,
  Briefcase,
  MapPin,
  DollarSign,
  Star,
  ShieldCheck,
  Award,
  Check,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WorkerAvatar from "./WorkerAvatar";
import { uploadWorkerProfileImage } from "../lib/supabase";
import { updateWorkerProfile } from "../lib/dbService";

interface EditWorkerModalProps {
  worker: WorkerProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onWorkerUpdated?: (updatedWorker: Partial<WorkerProfile>) => void;
}

const CATEGORIES = [
  "Electrician",
  "Plumber",
  "AC Technician",
  "Carpenter",
  "Painter",
  "Mason",
  "Welder",
  "Handyman",
  "Mechanics",
  "CCTV & Security"
];

const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Gujranwala",
  "Sialkot"
];

export default function EditWorkerModal({
  worker,
  isOpen,
  onClose,
  onWorkerUpdated
}: EditWorkerModalProps) {
  if (!isOpen || !worker) return null;

  const [name, setName] = useState(worker.name || "");
  const [category, setCategory] = useState(worker.category || CATEGORIES[0]);
  const [city, setCity] = useState(worker.city || CITIES[0]);
  const [phone, setPhone] = useState(worker.phone || "");
  const [pricing, setPricing] = useState<number | "">(worker.pricing ?? 2000);
  const [experience, setExperience] = useState<number | "">(worker.experience ?? 5);
  const [rating, setRating] = useState<number | "">(worker.rating ?? 5.0);
  const [reviewCount, setReviewCount] = useState<number | "">(worker.reviewCount ?? 0);
  const [status, setStatus] = useState<WorkerStatus>(worker.status || "approved");
  const [availability, setAvailability] = useState<WorkerAvailability>(worker.availability || "available");
  const [verified, setVerified] = useState<boolean>(worker.verified ?? true);
  const [about, setAbout] = useState(worker.about || "");
  const [skillsStr, setSkillsStr] = useState((worker.skills || []).join(", "));

  // Image Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    worker.photoURL || worker.profileImage || null
  );

  // Status & Notification state
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when worker prop changes
  useEffect(() => {
    if (worker) {
      setName(worker.name || "");
      setCategory(worker.category || CATEGORIES[0]);
      setCity(worker.city || CITIES[0]);
      setPhone(worker.phone || "");
      setPricing(worker.pricing ?? 2000);
      setExperience(worker.experience ?? 5);
      setRating(worker.rating ?? 5.0);
      setReviewCount(worker.reviewCount ?? 0);
      setStatus(worker.status || "approved");
      setAvailability(worker.availability || "available");
      setVerified(worker.verified ?? true);
      setAbout(worker.about || "");
      setSkillsStr((worker.skills || []).join(", "));
      setPreviewUrl(worker.photoURL || worker.profileImage || null);
      setSelectedFile(null);
      setStatusMessage(null);
      setUploadProgress(0);
    }
  }, [worker]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type.toLowerCase())) {
      setStatusMessage({
        type: "error",
        text: "Please select a valid image file (JPG, PNG, or WEBP)."
      });
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        type: "error",
        text: "File size exceeds 5MB limit. Please choose a smaller image."
      });
      return;
    }

    setSelectedFile(file);
    setStatusMessage(null);

    // Generate instant preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;

    if (!name.trim()) {
      setStatusMessage({ type: "error", text: "Worker name is required." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setUploadProgress(10);

    try {
      let photoURL = worker.photoURL || worker.profileImage || "";

      // 1. Upload profile image to Supabase bucket if a new file was chosen
      if (selectedFile) {
        setUploadProgress(30);
        const uploadRes = await uploadWorkerProfileImage(
          worker.uid,
          selectedFile,
          (progress) => setUploadProgress(progress)
        );

        if (uploadRes.error) {
          throw new Error(uploadRes.error);
        }

        if (uploadRes.publicUrl) {
          photoURL = uploadRes.publicUrl;
        }
      }

      // 2. Prepare updated worker object
      const skillsArr = skillsStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const updatedFields: Partial<WorkerProfile> = {
        name: name.trim(),
        category,
        city,
        phone: phone.trim(),
        pricing: Number(pricing) || 0,
        experience: Number(experience) || 0,
        rating: Math.min(5, Math.max(1, Number(rating) || 5.0)),
        reviewCount: Math.max(0, Number(reviewCount) || 0),
        status,
        availability,
        verified,
        about: about.trim(),
        skills: skillsArr,
        photoURL,
        profileImage: photoURL
      };

      // 3. Save to Firestore database
      await updateWorkerProfile(worker.uid, updatedFields);

      setStatusMessage({
        type: "success",
        text: "Worker profile updated successfully!"
      });

      if (onWorkerUpdated) {
        onWorkerUpdated(updatedFields);
      }

      // Close modal after brief success feedback
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Failed to update worker profile:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update worker profile. Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-gray-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base md:text-lg">Edit Worker Profile</h3>
                <p className="text-xs text-slate-400">UID: {worker.uid}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Notification Banner */}
            {statusMessage && (
              <div
                className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
                  statusMessage.type === "success"
                    ? "bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                    : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-orange-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Profile Image Management */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3">
              <label className="block font-bold text-xs text-gray-700 dark:text-slate-300">
                Profile Photo
              </label>

              <div className="flex items-center gap-4">
                <div className="relative group">
                  <WorkerAvatar
                    photoURL={previewUrl}
                    name={name || "Worker"}
                    sizeClassName="w-20 h-20 text-2xl ring-4 ring-orange-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 border border-slate-700"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload New Photo
                    </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(worker.photoURL || worker.profileImage || null);
                        }}
                        className="p-2 text-gray-400 hover:text-rose-500 text-xs font-bold rounded-xl transition-colors"
                        title="Reset photo"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">
                    JPG, PNG or WEBP up to 5MB. Stored in Supabase bucket <span className="font-mono text-orange-600 dark:text-orange-400">worker-profiles</span>.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  City *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Pricing Rate (PKR / hr)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={pricing}
                    onChange={(e) => setPricing(e.target.value ? Number(e.target.value) : "")}
                    placeholder="2500"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Years of Experience
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value ? Number(e.target.value) : "")}
                    placeholder="8"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Rating (1.0 - 5.0)
                </label>
                <div className="relative">
                  <Star className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(e.target.value ? Number(e.target.value) : "")}
                    placeholder="4.9"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Review Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={reviewCount}
                  onChange={(e) => setReviewCount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="142"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>
            </div>

            {/* Status & Availability Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Approval Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WorkerStatus)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="approved">Approved (Active Listing)</option>
                  <option value="pending">Pending Audit</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Current Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as WorkerAvailability)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="available">Available for Hire</option>
                  <option value="busy">Busy / On Job</option>
                  <option value="offline">Offline / Off Duty</option>
                </select>
              </div>
            </div>

            {/* Verification Checkbox */}
            <div className="flex items-center gap-3 p-3.5 bg-orange-50/50 dark:bg-orange-950/30 rounded-2xl border border-orange-200/50 dark:border-orange-800/50">
              <input
                type="checkbox"
                id="verifiedCheck"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="verifiedCheck" className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                Mark Specialist as Verified Professional
              </label>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Specialties & Skills (Comma-separated)
              </label>
              <input
                type="text"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                placeholder="e.g. UPS Wiring, Circuit Breakers, Solar Panel Fitting"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            {/* About / Bio */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Professional Bio & Work Summary
              </label>
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Describe experience, specialties, background..."
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

