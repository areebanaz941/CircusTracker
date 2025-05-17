import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircusShowWithCoords } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";
import { createCircusIcon } from "@/lib/circusIcon";

interface MapViewProps {
  currentDate: Date;
  isPlaying: boolean;
  hiddenCircuses?: string[]; // Add this prop to receive hidden circuses from parent
}

declare global {
  interface Window {
    L: any;
  }
}

const MapView: React.FC<MapViewProps> = ({ currentDate, isPlaying, hiddenCircuses = [] }) => {
  console.log('MapView received hiddenCircuses:', hiddenCircuses);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markersByDate = useRef<Record<string, any[]>>({});
  const [previousDateString, setPreviousDateString] = useState<string>("");
  const [previousPlayingState, setPreviousPlayingState] = useState<boolean>(false);
  
  // Fetch all circus shows
  const { data: shows, isLoading } = useQuery<CircusShowWithCoords[]>({
    queryKey: ["/api/shows"],
  });

  // Custom function to create icons based on circus name
  const createCustomIcon = (L: any, circusName: string, isActive: boolean = false) => {
    // Using a consistent icon size with a bit larger dimensions
    const iconSize = [40, 40];
    const iconAnchor = [20, 40];
    const popupAnchor = [0, -40];
    
    // Map of circus names to their corresponding icon files
    const circusIcons: Record<string, string> = {
      "ALL AMERICAN CIRCUS": '/ALL AMERICAN CIRCUS.png',
      "CANADAS CIRCUS SPECTACULAR": '/CANADAS CIRCUS SPECTACULAR.png',
      "CIRQUE DE PARIS": '/CIRQUE DE PARIS.png',
      "EUROPA SUPER CIRCUS": '/EUROPA SUPER CIRCUS.webp',
      "GREAT BENJAMIN CIRCUS": '/GREAT BENJAMIN CIRCUS.jpg',
      "GREAT PAGES CIRCUS": '/GREAT PAGES CIRCUS.webp',
      "JORDAN WORLD CIRCUS": '/JORDAN WORLD CIRCUS.jpg',
      "MONSTER TRUCKS MOST WANTED": '/MONSTER TRUCKS MOST WANTED.webp',
      "ROYAL HANNEFORD CIRCUS": '/ROYAL HANNEFORD CIRCUS.webp',
      "ZERBINI FAMILY CIRCUS": '/ZERBINBI FAMILY CIRCUS.png',
      "MOTO XTREME CIRCUS": '/MOTO XTREME CIRCUS.png',
    };

    // Check if we have a custom icon for this circus
    if (circusIcons[circusName]) {
      return L.icon({
        iconUrl: circusIcons[circusName],
        iconSize,
        iconAnchor,
        popupAnchor,
        className: isActive ? 'active-marker' : ''
      });
    } else {
      // Use default circus icon for others
      return createCircusIcon(L, isActive);
    }
  };

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
    
    // Group markers by date for easy updating
    shows.forEach(show => {
      const { latitude, longitude, circusName, venueName, address, city, state, zip, showDate } = show;
      const showDateObj = new Date(show.showDate);
      const showDateString = showDateObj.toISOString().split('T')[0];
      
      // Create both icon versions for each marker (active and inactive)
      const latLng: [number, number] = [parseFloat(latitude), parseFloat(longitude)];
      
      // Create icon based on circus name
      const circusIcon = createCustomIcon(L, circusName, false);
      
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

  // Update markers visibility based on hidden circuses
  useEffect(() => {
    console.log('Hidden circuses effect triggered. Hidden:', hiddenCircuses);
    
    if (!leafletMap.current || !window.L || Object.keys(markersByDate.current).length === 0) {
      console.log('Effect returning early - map not ready');
      return;
    }
    
    const map = leafletMap.current;
    const currentDateString = currentDate.toISOString().split('T')[0];
    
    // Update visibility for all markers based on hiddenCircuses
    let hiddenCount = 0;
    let shownCount = 0;
    
    Object.values(markersByDate.current).forEach(markersOnDate => {
      markersOnDate.forEach(({ marker, data }) => {
        const isHidden = hiddenCircuses.includes(data.circusName);
        const markerDateString = new Date(data.showDate).toISOString().split('T')[0];
        
        if (isHidden) {
          // Remove marker from map if circus is hidden
          map.removeLayer(marker);
          hiddenCount++;
        } else {
          // Show marker if circus is not hidden and conditions are met
          if (isPlaying) {
            // If playing, only show markers for the current date
            if (markerDateString === currentDateString) {
              map.addLayer(marker);
              shownCount++;
            } else {
              map.removeLayer(marker);
            }
          } else {
            // If not playing, show all markers (that aren't hidden)
            map.addLayer(marker);
            shownCount++;
          }
        }
      });
    });
    
    console.log(`Markers hidden: ${hiddenCount}, shown: ${shownCount}`);
  }, [hiddenCircuses, currentDate, isPlaying]);

  // Update markers display when current date changes or play state changes
  useEffect(() => {
  if (!leafletMap.current || !shows || !window.L || Object.keys(markersByDate.current).length === 0) return;
  
  const L = window.L;
  const map = leafletMap.current;
  const currentDateString = currentDate.toISOString().split('T')[0];
  const playStateChanged = isPlaying !== previousPlayingState;
  
  // If date hasn't changed and play state hasn't changed, do nothing
  if (currentDateString === previousDateString && !playStateChanged) return;
  
  // When play state changes, we need to handle visibility for all markers
  if (playStateChanged) {
    if (isPlaying) {
      // If we're starting to play, hide all markers except the current date
      Object.keys(markersByDate.current).forEach(dateStr => {
        markersByDate.current[dateStr].forEach(({ marker, data }) => {
          // Check if this circus is hidden
          if (hiddenCircuses.includes(data.circusName)) {
            map.removeLayer(marker);
            return;
          }
          
          if (dateStr === currentDateString) {
            const activeIcon = createCustomIcon(L, data.circusName, true);
            marker.setIcon(activeIcon);
            marker.setOpacity(1.0);
            map.addLayer(marker);
          } else {
            map.removeLayer(marker);
          }
        });
      });
      
      // REMOVED: Focus map on visible markers - Don't zoom in when playing
    } else {
      // If we're stopping playback, show all markers again but highlight current date
      Object.keys(markersByDate.current).forEach(dateStr => {
        markersByDate.current[dateStr].forEach(({ marker, data }) => {
          // Check if this circus is hidden
          if (hiddenCircuses.includes(data.circusName)) {
            map.removeLayer(marker);
            return;
          }
          
          if (dateStr === currentDateString) {
            const activeIcon = createCustomIcon(L, data.circusName, true);
            marker.setIcon(activeIcon);
            marker.setOpacity(1.0);
          } else {
            const inactiveIcon = createCustomIcon(L, data.circusName, false);
            marker.setIcon(inactiveIcon);
            marker.setOpacity(0.6);
          }
          map.addLayer(marker);
        });
      });
      
      // MODIFIED: Only fit bounds when stopping playback
      const visibleMarkers = markersRef.current.filter(marker => {
        const markerData = Object.values(markersByDate.current)
          .flat()
          .find(item => item.marker === marker);
        return markerData && !hiddenCircuses.includes(markerData.data.circusName);
      });
      
      if (visibleMarkers.length > 0) {
        const group = L.featureGroup(visibleMarkers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }
  // Date has changed while playing
  else if (isPlaying && currentDateString !== previousDateString) {
    // Hide previous date markers
    if (previousDateString && markersByDate.current[previousDateString]) {
      markersByDate.current[previousDateString].forEach(({ marker }) => {
        map.removeLayer(marker);
      });
    }
    
    // Show current date markers (if not hidden)
    if (markersByDate.current[currentDateString]) {
      const activeMarkers = markersByDate.current[currentDateString]
        .filter(({ data }) => !hiddenCircuses.includes(data.circusName));
      
      activeMarkers.forEach(({ marker, data }) => {
        const activeIcon = createCustomIcon(L, data.circusName, true);
        marker.setIcon(activeIcon);
        marker.setOpacity(1.0);
        map.addLayer(marker);
        
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
      
      // REMOVED: Don't zoom when date changes during playback
    }
  }
  // Date has changed while not playing - just update highlighting
  else if (!isPlaying && currentDateString !== previousDateString) {
    // Reset previous active markers
    if (previousDateString && markersByDate.current[previousDateString]) {
      markersByDate.current[previousDateString].forEach(({ marker, data }) => {
        if (!hiddenCircuses.includes(data.circusName)) {
          const inactiveIcon = createCustomIcon(L, data.circusName, false);
          marker.setIcon(inactiveIcon);
          marker.setOpacity(0.6);
        }
      });
    }
    
    // Highlight new active markers (if not hidden)
    if (markersByDate.current[currentDateString]) {
      const activeMarkers = markersByDate.current[currentDateString]
        .filter(({ data }) => !hiddenCircuses.includes(data.circusName));
      
      activeMarkers.forEach(({ marker, data }) => {
        const activeIcon = createCustomIcon(L, data.circusName, true);
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
      
      // REMOVED: Don't zoom when date changes while not playing
    }
  }
  
  setPreviousDateString(currentDateString);
  setPreviousPlayingState(isPlaying);
}, [shows, currentDate, previousDateString, isPlaying, previousPlayingState, hiddenCircuses]);
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
