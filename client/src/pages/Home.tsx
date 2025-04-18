import React, { useState } from "react";
import MapView from "@/components/MapView";
import TimeSlider from "@/components/TimeSlider";

const Home: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date("2025-04-01"));
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="relative h-full">
      <MapView 
        currentDate={currentDate}
      />
      
      <TimeSlider 
        currentDate={currentDate}
        onDateChange={handleDateChange}
        isPlaying={isPlaying}
        onTogglePlay={togglePlayPause}
      />
      
      {/* Mobile Bottom Navigation - Fixed to bottom on mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t z-10">
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
