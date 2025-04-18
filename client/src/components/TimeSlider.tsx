import React, { useEffect, useRef, useState } from "react";
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
  const lastUpdateRef = useRef<number>(0);
  
  // Animation speed control - lower value means slower animation
  const [speed, setSpeed] = useState<number>(0.5); // days per second
  
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
  
  // Animation logic for the time slider with speed control
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }
      
      // Calculate elapsed time since last update (in seconds)
      const elapsed = (timestamp - lastUpdateRef.current) / 1000;
      
      // Only update if enough time has passed based on speed setting
      if (elapsed >= 1 / speed) {
        // Update the date by adding one day
        onDateChange(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
        lastUpdateRef.current = timestamp;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      lastUpdateRef.current = 0; // Reset time tracking when starting playback
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentDate, onDateChange, speed]);
  
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

  // Speed control handlers
  const increaseSpeed = () => {
    setSpeed(prev => Math.min(prev + 0.25, 2)); // Maximum 2 days per second
  };

  const decreaseSpeed = () => {
    setSpeed(prev => Math.max(prev - 0.25, 0.25)); // Minimum 0.25 days per second
  };

  return (
    <div className="fixed bottom-0 left-0 right-lg lg:right-0 bg-white p-4 shadow-lg z-20 border-t border-gray-200 lg:left-64">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-shrink-0 flex items-center space-x-2">
            <Button 
              variant="default" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-primary text-white hover:bg-primary-dark"
              onClick={onTogglePlay}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </Button>
            
            {/* Speed Controls */}
            <div className="flex items-center space-x-1 text-xs">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-6 w-6 border border-gray-300"
                onClick={decreaseSpeed}
                disabled={speed <= 0.25}
                title="Decrease speed"
              >
                <i className="fas fa-minus"></i>
              </Button>
              <span className="text-gray-600 w-16 text-center">
                {speed === 1 ? '1 day/sec' : speed < 1 ? 'Slower' : 'Faster'}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-6 w-6 border border-gray-300"
                onClick={increaseSpeed}
                disabled={speed >= 2}
                title="Increase speed"
              >
                <i className="fas fa-plus"></i>
              </Button>
            </div>
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
