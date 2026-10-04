import React, { useState } from "react";
import { ServiceRequest, SERVICE_CATEGORIES } from "../types";
import { Calendar, MapPin, ArrowRight, ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import { createRequest } from "../lib/dbService";
import { auth } from "../lib/firebase";

interface RequestServiceFormProps {
  customerId: string;
  customerName: string;
  preselectedCategory: string | null;
  preselectedWorkerId: string | null;
  preselectedWorkerName: string | null;
  prefilledDescription?: string;
  workflowId?: string;
  issueId?: string;
  onBookingComplete: () => void;
  onCancel: () => void;
}

export default function RequestServiceForm({
  customerId,
  customerName,
  preselectedCategory,
  preselectedWorkerId,
  preselectedWorkerName,
  prefilledDescription,
  workflowId,
  issueId,
  onBookingComplete,
  onCancel
}: RequestServiceFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [category, setCategory] = useState(preselectedCategory || "Electrician");
  const [title, setTitle] = useState(prefilledDescription ? prefilledDescription.slice(0, 80) : "");
  const [description, setDescription] = useState(prefilledDescription || "");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState<number>(1000);
  const [date, setDate] = useState("");

  const handleUseCurrentLocation = () => {
    setLocation("House 45, Street 3, Sector G-11, Islamabad");
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!title.trim() || !description.trim() || !location.trim()) {
        setError("Please fill out all fields in Step 1.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!budget || budget <= 0 || !date) {
        setError("Please set a realistic budget and select a service date/time.");
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const requestId = `req_${Date.now()}`;

      const requestData: ServiceRequest = {
        requestId,
        customerId,
        customerName,
        workerId: preselectedWorkerId || "",
        workerName: preselectedWorkerName || "",
        serviceCategory: category,
        title: title.trim(),
        description: description.trim(),
        status: "pending",
        budget: Number(budget),
        location: location.trim(),
        date,
        createdAt: new Date()
      };

      if (workflowId) {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...requestData, workflowId, issueId }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || "Failed to submit confirmed request");
      } else {
        await createRequest(requestData);
      }

      // Successfully Completed
      onBookingComplete();
    } catch (err: any) {
      console.error("Booking failed:", err);
      setError(err.message || "Failed to book service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <section className="text-center md:text-left flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">Book a Service</h1>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Book your expert local technician in three easy steps.</p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-bold text-gray-400 hover:text-orange-700 dark:hover:text-orange-400 bg-gray-100 dark:bg-slate-800 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition-all"
        >
          Cancel
        </button>
      </section>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between relative mb-6">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-gray-100 dark:bg-slate-800 -z-0">
          <div
            className="h-full bg-orange-600 transition-all duration-300"
            style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
          ></div>
        </div>

        <div className="flex flex-col items-center gap-1 z-10">
          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center border-2 transition-all ${
            step >= 1 ? "bg-orange-600 text-white border-transparent" : "bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-800"
          }`}>
            1
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Details</span>
        </div>

        <div className="flex flex-col items-center gap-1 z-10">
          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center border-2 transition-all ${
            step >= 2 ? "bg-orange-600 text-white border-transparent" : "bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-800"
          }`}>
            2
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Schedule</span>
        </div>

        <div className="flex flex-col items-center gap-1 z-10">
          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center border-2 transition-all ${
            step >= 3 ? "bg-orange-600 text-white border-transparent" : "bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-800"
          }`}>
            3
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Review</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-l-4 border-rose-500 rounded-r-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Form Steps */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Service & Problem Details
            </h2>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Service Category</label>
              <select
                disabled={!!preselectedCategory}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-75 cursor-pointer"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Job / Problem Title</label>
              <input
                type="text"
                placeholder="e.g. Broken master bathroom faucet leaking water"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Detailed Description</label>
              <textarea
                placeholder="Describe what needs to be fixed. Mention any specific parts, model, or instructions so the worker arrives fully prepared..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              ></textarea>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Service Address</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                >
                  <MapPin className="w-3.5 h-3.5" /> Use Current Location
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter full home/office address in Pakistan"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Schedule & Budget */}
        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Schedule & Budget
            </h2>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Budget (PKR)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rs.</span>
                <input
                  type="number"
                  placeholder="1500"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Provide a realistic budget range for this service.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Service Date & Time</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Review & Book
            </h2>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Service Category</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">{category}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Assigned Specialist</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">
                    {preselectedWorkerName ? `${preselectedWorkerName} (Direct Booking)` : "Marketplace Open Request"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Scheduled Date/Time</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">{date.replace("T", " ")}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Proposed Budget</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">Rs. {budget}</span>
                </div>
              </div>

              <div className="border-t border-gray-200/50 dark:border-slate-800 pt-3">
                <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Title</span>
                <p className="text-xs text-gray-900 dark:text-slate-100 font-bold">{title}</p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Detailed Description</span>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed italic">"{description}"</p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Service Address</span>
                <p className="text-xs text-gray-900 dark:text-slate-100 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> {location}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-relaxed text-center">
              By confirming, you agree to submit this request to the marketplace. Verified service providers matching this category will be notified.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          {step > 1 && (
            <button
              onClick={handlePrevStep}
              className="py-3 px-6 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-sm transition-colors flex justify-center items-center gap-1.5 text-xs"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold rounded-2xl shadow-md transition-colors flex justify-center items-center gap-2 text-xs"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Request Service
                </>
              )}
            </button>
          )}
        </div>

      </div>

    </div>
  );
}


