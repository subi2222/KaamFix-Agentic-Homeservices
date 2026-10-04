import React, { useEffect } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { WorkerProfile } from "../types";

interface MapWorker extends WorkerProfile { distanceKm?: number; matchScore?: number; }
const customerIcon = L.divIcon({ className: "", html: '<div style="width:20px;height:20px;border-radius:50%;background:#f97316;border:4px solid white;box-shadow:0 2px 12px #0005"></div>', iconAnchor:[10,10] });
const workerIcon = L.divIcon({ className: "", html: '<div style="width:28px;height:28px;border-radius:10px;background:#111827;color:white;border:3px solid white;box-shadow:0 2px 12px #0005;display:grid;place-items:center;font-size:15px">🔧</div>', iconAnchor:[14,14] });
function Recenter({ center }: { center: [number,number] }) { const map=useMap(); useEffect(()=>{map.setView(center,map.getZoom());},[center,map]); return null; }
function PickLocation({ onPick }: { onPick?: (location:[number,number])=>void }) { useMapEvents({click(event){onPick?.([event.latlng.lat,event.latlng.lng]);}}); return null; }

export default function LiveWorkerMap({ customer, workers, selectedId, onSelect, onCustomerMove, customerLabel="Customer service destination", showRadius=true }: { customer:[number,number]; workers:MapWorker[]; selectedId?:string; onSelect:(worker:MapWorker)=>void; onCustomerMove?: (location:[number,number])=>void; customerLabel?:string; showRadius?:boolean }) {
  const selected=workers.find(worker=>worker.uid===selectedId);
  return <div className="h-[430px] rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm"><MapContainer center={customer} zoom={13} scrollWheelZoom className="h-full w-full"><Recenter center={customer}/><PickLocation onPick={onCustomerMove}/><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{showRadius&&<Circle center={customer} radius={1500} pathOptions={{color:"#f97316",fillColor:"#fb923c",fillOpacity:.08}}/>}<Marker position={customer} icon={customerIcon}><Popup><strong>{customerLabel}</strong>{onCustomerMove&&<><br/>Click anywhere to move the pin</>}</Popup></Marker>{workers.map(worker=>worker.location&&<Marker key={worker.uid} position={[worker.location.latitude,worker.location.longitude]} icon={workerIcon} eventHandlers={{click:()=>onSelect(worker)}}><Popup><strong>{worker.name}</strong><br/>{worker.category}<br/>{worker.distanceKm} km away</Popup></Marker>)}{selected?.location&&<Polyline positions={[customer,[selected.location.latitude,selected.location.longitude]]} pathOptions={{color:"#f97316",weight:4,dashArray:"8 8"}}/>}</MapContainer></div>;
}
