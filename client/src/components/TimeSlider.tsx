import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDate } from "@/lib/dateUtils";
import { useQuery } from "@tanstack/react-query";

interface TimeSliderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ 
  currentDate, 
  onDateChange,
  isPlaying,
  onTogglePlay
}) => {
  const animationRef = useRef<number>();
  
  // Get date range from API
  const { data: dateRange } = useQuery<{startDate: string, endDate: string}>({
    queryKey: ["/api/shows/date-range"],
  });
  
  const startDate = dateRange ? new Date(dateRange.startDate) : new Date("2025-04-01");
  const endDate = dateRange ? new Date(dateRange.endDate) : new Date("2025-10-31");
  
  // Calculate the total days in the range
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate the current day as a percentage of the total range
  const currentValue = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Animation logic for the time slider
  useEffect(() => {
    const animate = () => {
      onDateChange(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)); // Add one day
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentDate, onDateChange]);
  
  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    const newDays = value[0];
    const newDate = new Date(startDate.getTime() + newDays * 24 * 60 * 60 * 1000);
    onDateChange(newDate);
  };
  
  // Set date to today or within range if today is outside range
  const handleTodayClick = () => {
    const today = new Date();
    if (today < startDate) {
      onDateChange(startDate);
    } else if (today > endDate) {
      onDateChange(endDate);
    } else {
      onDateChange(today);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-4 shadow-lg">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-shrink-0">
            <Button 
              variant="default" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-primary text-white hover:bg-primary-dark"
              onClick={onTogglePlay}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </Button>
          </div>
          <div className="flex-grow px-2">
            <Slider
              defaultValue={[0]}
              value={[currentValue]}
              max={totalDays}
              step={1}
              onValueChange={handleSliderChange}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>{formatDate(startDate, { includeYear: true })}</span>
              <span>{formatDate(new Date(startDate.getTime() + totalDays/3 * 24 * 60 * 60 * 1000), { includeYear: true })}</span>
              <span>{formatDate(new Date(startDate.getTime() + totalDays*2/3 * 24 * 60 * 60 * 1000), { includeYear: true })}</span>
              <span>{formatDate(endDate, { includeYear: true })}</span>
            </div>
          </div>
          <div className="flex-shrink-0 space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border border-gray-300"
            >
              <i className="fas fa-calendar-alt mr-1"></i> Select Date
            </Button>
            <Button 
              size="sm"
              className="bg-primary text-white hover:bg-primary-dark"
              onClick={handleTodayClick}
            >
              Today
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlider;
