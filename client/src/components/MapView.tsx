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
  const markersByDate = useRef<Record<string, any[]>>({});
  const [previousDateString, setPreviousDateString] = useState<string>("");
  
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
        leafletMap.current = L.map(mapRef.current).setView([39.8283, -98.5795], 4); // Center on US
        
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

  // Initial setup of all markers
  useEffect(() => {
    if (!leafletMap.current || !shows || !window.L) return;
    
    const L = window.L;
    const map = leafletMap.current;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];
    markersByDate.current = {};
    
    // Create custom circus icon
    const circusIcon = createCircusIcon(L);
    const activeIcon = createCircusIcon(L, true); // Pass true for active icon
    
    // Group markers by date for easy updating
    shows.forEach(show => {
      const { latitude, longitude, circusName, venueName, address, city, state, zip, showDate } = show;
      const showDateObj = new Date(show.showDate);
      const showDateString = showDateObj.toISOString().split('T')[0];
      
      // Create both icon versions for each marker (active and inactive)
      const latLng: [number, number] = [parseFloat(latitude), parseFloat(longitude)];
      
      // Initially set all markers as inactive
      const marker = L.marker(latLng, { 
        icon: circusIcon,
        opacity: 0.6
      }).addTo(map);
      
      // Different popup content
      const popupContent = `
        <div class="circus-popup">
          <div class="font-bold text-gray-500">${circusName}</div>
          <div class="font-medium">${venueName}</div>
          <div>${address}</div>
          <div>${city}, ${state} ${zip}</div>
          <div class="text-sm mt-2">
            <span class="font-medium">Show date:</span> ${formatDate(showDateObj)}
          </div>
          <div class="mt-2">
            <button class="show-details-btn bg-primary text-white px-3 py-1 rounded text-xs">Show Details</button>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      // Store the marker by date for easy access later
      if (!markersByDate.current[showDateString]) {
        markersByDate.current[showDateString] = [];
      }
      
      // Store marker details for later updates
      markersByDate.current[showDateString].push({
        marker,
        data: show,
        isActive: false,
      });
      
      markersRef.current.push(marker);
    });
    
    // Fit the map to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [shows]);

  // Update markers highlighting when current date changes
  useEffect(() => {
    if (!leafletMap.current || !shows || !window.L || Object.keys(markersByDate.current).length === 0) return;
    
    const L = window.L;
    const map = leafletMap.current;
    const currentDateString = currentDate.toISOString().split('T')[0];
    
    // If date hasn't changed, do nothing
    if (currentDateString === previousDateString) return;
    
    // Create custom icons
    const circusIcon = createCircusIcon(L);
    const activeIcon = createCircusIcon(L, true); // Pass true for active icon
    
    // Reset previous active markers
    if (previousDateString && markersByDate.current[previousDateString]) {
      markersByDate.current[previousDateString].forEach(({ marker, data }) => {
        marker.setIcon(circusIcon);
        marker.setOpacity(0.6);
      });
    }
    
    // Highlight new active markers
    if (markersByDate.current[currentDateString]) {
      const activeMarkers = markersByDate.current[currentDateString];
      
      activeMarkers.forEach(({ marker, data }) => {
        marker.setIcon(activeIcon);
        marker.setOpacity(1.0);
        
        // Update popup content to show active status
        const { circusName, venueName, address, city, state, zip, showDate } = data;
        const showDateObj = new Date(showDate);
        
        const popupContent = `
          <div class="circus-popup">
            <div class="font-bold text-primary">${circusName}</div>
            <div class="font-medium">${venueName}</div>
            <div>${address}</div>
            <div>${city}, ${state} ${zip}</div>
            <div class="text-sm mt-2">
              <span class="font-medium">Show date:</span> ${formatDate(showDateObj)}
            </div>
            <div class="text-xs mt-1 text-primary font-semibold">Active today!</div>
            <div class="mt-2">
              <button class="show-details-btn bg-primary text-white px-3 py-1 rounded text-xs">Show Details</button>
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
      });
      
      // If we have active markers, pan the map to show them
      if (activeMarkers.length > 0) {
        const group = L.featureGroup(activeMarkers.map(item => item.marker));
        map.flyToBounds(group.getBounds(), { padding: [50, 50], duration: 0.5 });
      }
    }
    
    setPreviousDateString(currentDateString);
  }, [shows, currentDate, previousDateString]);

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
      style={{ height: 'calc(100vh - 164px)' }} // Account for the fixed header (64px) and time slider (100px)
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
