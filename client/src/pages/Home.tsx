import React, { useState } from "react";
import MapView from "@/components/MapView";
import TimeSlider from "@/components/TimeSlider";
import Sidebar from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";

const Home: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hiddenCircuses, setHiddenCircuses] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<'user' | 'admin'>('user');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Fetch date range for the time slider
  const { data: dateRange } = useQuery<{startDate: string, endDate: string}>({
    queryKey: ["/api/shows/date-range"],
  });
  
  // Handle date change from the time slider
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };
  
  // Toggle play/pause
  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  // Handle circus visibility changes
  const handleCircusVisibilityChange = (hidden: string[]) => {
    console.log('Home received hidden circuses:', hidden);
    setHiddenCircuses(hidden);
  };

  return (
    <div className="relative h-full">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        isAdmin={isAdmin}
        currentView={currentView}
        onCircusVisibilityChange={handleCircusVisibilityChange}
      />

      {/* Main content with padding to accommodate fixed sidebar and sliders */}
      <div className="lg:ml-64 pb-[100px]"> {/* 100px bottom padding for time slider */}
        <MapView 
          currentDate={currentDate} 
          isPlaying={isPlaying}
          hiddenCircuses={hiddenCircuses}
        />
      </div>
      
      <TimeSlider
        currentDate={currentDate}
        onDateChange={handleDateChange}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
      />
      
      {/* Mobile Bottom Navigation - Fixed to bottom on mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t z-30" 
           style={{ bottom: '100px' }} // Position above the time slider
      >
        <div className="flex justify-around">
          <button className="flex flex-col items-center py-2 px-4 text-primary">
            <i className="fas fa-map-marker-alt mb-1"></i>
            <span className="text-xs">Map</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-500">
            <i className="fas fa-list mb-1"></i>
            <span className="text-xs">List</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-500">
            <i className="fas fa-calendar-alt mb-1"></i>
            <span className="text-xs">Calendar</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-500">
            <i className="fas fa-info-circle mb-1"></i>
            <span className="text-xs">Info</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;