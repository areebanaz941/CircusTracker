import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircusShowWithCoords } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";
import { createCircusIcon } from "@/lib/circusIcon";

interface MapViewProps {
  currentDate: Date;
}

declare global {
  interface Window {
    L: any;
  }
}

const MapView: React.FC<MapViewProps> = ({ currentDate }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  // Fetch all circus shows
  const { data: shows, isLoading } = useQuery<CircusShowWithCoords[]>({
    queryKey: ["/api/shows"],
  });

  // Initialize the map
  useEffect(() => {
    // Dynamically import Leaflet
    const loadLeaflet = async () => {
      // Load Leaflet script if not already loaded
      if (!window.L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        document.body.appendChild(script);
        
        await new Promise(resolve => {
          script.onload = resolve;
        });
      }
      
      if (mapRef.current && !leafletMap.current) {
        // Initialize the map
        const L = window.L;
        leafletMap.current = L.map(mapRef.current).setView([49.2827, -123.1207], 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMap.current);
      }
    };
    
    loadLeaflet();
    
    // Cleanup when component unmounts
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update markers when shows or current date changes
  useEffect(() => {
    if (!leafletMap.current || !shows || !window.L) return;
    
    const L = window.L;
    const map = leafletMap.current;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];
    
    // Create custom circus icon
    const circusIcon = createCircusIcon(L);
    
    // Find shows for current date
    const currentDateString = currentDate.toISOString().split('T')[0];
    const activeShows = shows.filter(show => {
      const showDateString = new Date(show.showDate).toISOString().split('T')[0];
      return showDateString === currentDateString;
    });
    
    // Add markers for active shows
    activeShows.forEach(show => {
      const { latitude, longitude, circusName, venueName, address, city, state, zip, showDate } = show;
      
      const latLng: [number, number] = [parseFloat(latitude), parseFloat(longitude)];
      const marker = L.marker(latLng, { icon: circusIcon }).addTo(map);
      
      const popupContent = `
        <div class="circus-popup">
          <div class="font-bold text-primary">${circusName}</div>
          <div class="font-medium">${venueName}</div>
          <div>${address}</div>
          <div>${city}, ${state} ${zip}</div>
          <div class="text-sm mt-2">
            <span class="font-medium">Show date:</span> ${formatDate(new Date(showDate))}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });
    
    // If no active shows, try to find the next upcoming show
    if (activeShows.length === 0) {
      const upcomingShows = shows
        .filter(show => new Date(show.showDate) > currentDate)
        .sort((a, b) => new Date(a.showDate).getTime() - new Date(b.showDate).getTime());
      
      if (upcomingShows.length > 0) {
        const nextShow = upcomingShows[0];
        const { latitude, longitude, circusName, venueName, address, city, state, zip, showDate } = nextShow;
        
        const latLng: [number, number] = [parseFloat(latitude), parseFloat(longitude)];
        const marker = L.marker(latLng, { 
          icon: circusIcon,
          opacity: 0.6
        }).addTo(map);
        
        const popupContent = `
          <div class="circus-popup">
            <div class="font-bold text-gray-500">${circusName}</div>
            <div class="font-medium">${venueName}</div>
            <div>${address}</div>
            <div>${city}, ${state} ${zip}</div>
            <div class="text-sm mt-2">
              <span class="font-medium">Upcoming show:</span> ${formatDate(new Date(showDate))}
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      }
    }
    
    // If we have active shows, fit the map to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [shows, currentDate]);

  // Update map size when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      ref={mapRef} 
      className="map-container w-full"
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      {isLoading && (
        <div className="flex justify-center items-center h-full w-full bg-gray-100 bg-opacity-70 absolute top-0 left-0 z-10">
          <div className="text-lg">Loading map data...</div>
        </div>
      )}
    </div>
  );
};

export default MapView;
