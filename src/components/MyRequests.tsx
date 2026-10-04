import React, { useState } from "react";
import { ServiceRequest, RequestStatus } from "../types";
import { Calendar, MapPin, DollarSign, Ban, ShieldAlert, Star, MessageSquare, CheckCircle, AlertTriangle, CreditCard } from "lucide-react";
import { updateRequestStatus, addReview } from "../lib/dbService";
import WorkerAvatar from "./WorkerAvatar";
import { auth } from "../lib/firebase";

interface PriceBid { bidId: string; workerId: string; workerName: string; workerRating: number; price: number; etaMinutes: number; message: string; status: string; }

interface MyRequestsProps {
  requests: ServiceRequest[];
  onRefresh: () => void;
  onPay: (request: ServiceRequest) => void;
  onTrack: (request: ServiceRequest) => void;
}

export default function MyRequests({ requests, onRefresh, onPay, onTrack }: MyRequestsProps) {
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "cancelled">("active");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  
  // Review submission state
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [bids, setBids] = useState<Record<string, PriceBid[]>>({});

  const loadBids = async (requestId: string) => { const token=await auth.currentUser?.getIdToken(); const response=await fetch(`/api/requests/${requestId}/bids`,{headers:{Authorization:`Bearer ${token}`}}); const body=await response.json(); if(response.ok)setBids(current=>({...current,[requestId]:body})); };
  const acceptBid = async (requestId: string, workerId: string) => { setLoadingActionId(requestId); try { const token=await auth.currentUser?.getIdToken(); const response=await fetch(`/api/requests/${requestId}/bids/${workerId}/accept`,{method:"POST",headers:{Authorization:`Bearer ${token}`}}); const body=await response.json(); if(!response.ok)throw new Error(body.detail||"Could not accept offer"); await onRefresh(); } catch(err){console.error(err);} finally{setLoadingActionId(null);} };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "active") {
      return ["pending", "accepted", "en_route", "arrived", "in_progress", "work_finished", "disputed"].includes(req.status);
    } else if (activeTab === "completed") {
      return req.status === "completed";
    } else {
      return ["cancelled", "rejected"].includes(req.status);
    }
  });

  const handleUpdateStatus = async (requestId: string, newStatus: RequestStatus) => {
    setLoadingActionId(requestId);
    try {
      await updateRequestStatus(requestId, newStatus);
      onRefresh();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleOpenReview = (reqId: string) => {
    setReviewRequestId(reqId);
    setRating(5);
    setReviewText("");
    setReviewSuccess(false);
  };

  const handleSubmitReview = async (e: React.FormEvent, req: ServiceRequest) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    setSubmittingReview(true);
    try {
      const reviewId = `rev_${Date.now()}`;

      await addReview({
        reviewId,
        workerId: req.workerId,
        customerId: req.customerId,
        customerName: req.customerName,
        rating,
        review: reviewText.trim(),
        createdAt: new Date()
      });

      setReviewSuccess(true);
      setTimeout(() => {
        setReviewRequestId(null);
        onRefresh();
      }, 1500);
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">My Service Bookings</h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Manage and track your home service requests in real time.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "active"
              ? "border-orange-600 text-orange-600 dark:text-orange-400"
              : "border-transparent text-gray-400 dark:text-slate-500 hover:text-orange-600"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "completed"
              ? "border-orange-600 text-orange-600 dark:text-orange-400"
              : "border-transparent text-gray-400 dark:text-slate-500 hover:text-orange-600"
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setActiveTab("cancelled")}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "cancelled"
              ? "border-orange-600 text-orange-600 dark:text-orange-400"
              : "border-transparent text-gray-400 dark:text-slate-500 hover:text-orange-600"
          }`}
        >
          Cancelled / Rejected
        </button>
      </div>

      {/* List Container */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-50 shadow-sm text-gray-400">
            <p className="text-sm font-semibold">No requests in this category.</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <article
              key={req.requestId}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_24px_rgba(11,28,48,0.01)] space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Header block */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">ID: {req.requestId.slice(0, 8)}</span>
                  <h3 className="font-bold text-gray-800 text-base mt-0.5">{req.title}</h3>
                  <p className="text-xs text-gray-400 font-semibold">{req.serviceCategory}</p>
                </div>

                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize ${
                  req.status === "completed"
                    ? "bg-orange-50 text-orange-700 border border-orange-100"
                    : req.status === "pending"
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : req.status === "accepted" || req.status === "in_progress"
                    ? "bg-stone-50 text-stone-700 border border-stone-100"
                    : req.status === "disputed"
                    ? "bg-red-50 text-red-700 border border-red-100 animate-pulse"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}>
                  {req.status.replace("_", " ")}
                </span>
              </div>

              {/* Description body */}
              <p className="text-xs text-gray-500 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                {req.description}
              </p>

              {/* Schedule and Address footer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>{req.date.replace("T", " ")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <span className="truncate">{req.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-700 font-bold">
                  <span>PKR Budget: Rs. {req.budget}</span>
                </div>
              </div>

              {/* Assigned Worker Info */}
              <div className="flex items-center justify-between border-t border-gray-50 pt-4 text-xs">
                <div className="flex items-center gap-2">
                  <WorkerAvatar name={req.workerName || "Waiting for Assignment..."} sizeClassName="w-8 h-8 text-xs" />
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Assigned Pro</span>
                    <span className="font-bold text-gray-700">{req.workerName || "Waiting for Assignment..."}</span>
                  </div>
                </div>

                {/* Actions Block */}
                <div className="flex gap-2">
                  {loadingActionId === req.requestId ? (
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {req.status === "work_finished" && !req.paymentId && (
                        <button onClick={() => onPay(req)} className="px-3.5 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-xl font-bold flex items-center gap-1 transition-colors text-xs">
                          <CreditCard className="w-3.5 h-3.5" /> Pay securely
                        </button>
                      )}
                      {req.paymentStatus && (
                        <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl font-bold text-xs capitalize">Payment: {req.paymentStatus.replace("_", " ")}</span>
                      )}
                      {["accepted", "en_route", "arrived", "in_progress", "work_finished", "completed", "disputed"].includes(req.status) && (
                        <button onClick={() => onTrack(req)} className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-xs">Map, chat & contact</button>
                      )}
                      {/* Customer Can Cancel Pending or Accepted */}
                      {(req.status === "pending" || req.status === "accepted") && (
                        <button
                          onClick={() => handleUpdateStatus(req.requestId, "cancelled")}
                          className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold flex items-center gap-1 transition-colors text-xs"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel Request
                        </button>
                      )}
                      {req.status === "pending" && (
                        <button onClick={() => loadBids(req.requestId)} className="px-3.5 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-bold text-xs">View price offers</button>
                      )}

                      {/* Customer Can Dispute in_progress */}
                      {req.status === "in_progress" && (
                        <button
                          onClick={() => handleUpdateStatus(req.requestId, "disputed")}
                          className="px-3.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-bold flex items-center gap-1 transition-colors text-xs animate-pulse"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> File Dispute
                        </button>
                      )}

                      {/* Customer Can Review Completed */}
                      {req.status === "completed" && req.workerId && (
                        <button
                          onClick={() => handleOpenReview(req.requestId)}
                          className="px-3.5 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-bold flex items-center gap-1 transition-colors text-xs"
                        >
                          <Star className="w-3.5 h-3.5" /> Review Job
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {req.status === "pending" && bids[req.requestId] && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Professional price offers</h4>
                  {bids[req.requestId].length === 0 ? <p className="text-xs text-gray-400">No price offers yet. Nearby online workers can submit one.</p> : bids[req.requestId].map(bid => <div key={bid.bidId} className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-black text-sm">{bid.workerName} <span className="text-amber-600">★ {bid.workerRating || "New"}</span></p><p className="text-xs text-gray-600 mt-1">Arrives in about {bid.etaMinutes} min • {bid.message}</p></div><div className="flex items-center gap-3"><strong className="text-lg">Rs. {bid.price.toLocaleString()}</strong><button onClick={()=>acceptBid(req.requestId,bid.workerId)} className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-black">Accept & book</button></div></div>)}
                </div>
              )}

              {/* Review Dialog Panel */}
              {reviewRequestId === req.requestId && (
                <div className="mt-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100 animate-slide-up">
                  {reviewSuccess ? (
                    <div className="text-center py-4 flex flex-col items-center justify-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-orange-600 animate-bounce" />
                      <p className="text-xs font-bold text-orange-800">Review Submitted successfully! Thank you.</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmitReview(e, req)} className="space-y-3">
                      <h4 className="font-bold text-orange-800 text-xs uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-orange-700" /> Share Your Service Review
                      </h4>

                      {/* Star Rating selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setRating(s)}
                              className="focus:outline-none transition-transform active:scale-125"
                            >
                              <Star className={`w-6 h-6 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Written feedback */}
                      <textarea
                        required
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Describe your experience with the professional (e.g. prompt arrival, neat work, friendly service)..."
                        rows={3}
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                      ></textarea>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewRequestId(null)}
                          className="px-4 py-2 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-lg text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-bold shadow-sm"
                        >
                          {submittingReview ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </article>
          ))
        )}
      </div>

    </div>
  );
}

