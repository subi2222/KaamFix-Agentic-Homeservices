import React from "react";

export function WorkerCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2"></div>
          <div className="flex gap-2 pt-1">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-12 mb-1"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
        </div>
        <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-28"></div>
      </div>
    </div>
  );
}

export function WorkerGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <WorkerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse pb-16">
      {/* Hero Banner Skeleton */}
      <div className="h-44 bg-slate-200 dark:bg-slate-800/80 rounded-3xl w-full"></div>

      {/* Bento Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0"></div>
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Chart + Feed Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-4 h-72">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800/60 rounded-2xl mt-4"></div>
        </div>

        <div className="space-y-4">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    </div>
  );
}

export function RequestItemSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
        </div>
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-24"></div>
      </div>
      <div className="h-12 bg-slate-200 dark:bg-slate-800/60 rounded-xl"></div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
        <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-32"></div>
      </div>
    </div>
  );
}

export function RequestListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <RequestItemSkeleton key={i} />
      ))}
    </div>
  );
}

