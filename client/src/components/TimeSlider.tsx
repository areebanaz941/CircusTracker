import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDate } from "@/lib/dateUtils";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Define interface for POI objects (optional if you're not using TypeScript)
interface POI {
  _id: string;
  circusName: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
  showDate: string;
  coords: [number, number];
  [key: string]: any; // Allow for additional properties
}

interface TimeSliderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  pois?: POI[]; // Make pois optional
  onFilteredPoisChange?: (filteredPois: POI[]) => void; // Make callback optional
}

const TimeSlider: React.FC<TimeSliderProps> = ({ 
  currentDate, 
  onDateChange,
  isPlaying,
  onTogglePlay,
  pois,
  onFilteredPoisChange
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
  
  // Filter POIs based on current date
  useEffect(() => {
    // Make sure pois and callback are defined before proceeding
    if (!pois || !onFilteredPoisChange) return;
    
    // Convert current date to YYYY-MM-DD format for comparison
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    // Filter POIs that match the current date
    const filtered = pois.filter(poi => {
      const poiDate = new Date(poi.showDate).toISOString().split('T')[0];
      return poiDate === currentDateStr;
    });
    
    // Send filtered POIs to parent component
    onFilteredPoisChange(filtered);
  }, [currentDate, pois, onFilteredPoisChange]);
  
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

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(currentDate);
  
  // Date selection handlers
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setCalendarOpen(false);
    }
  };
  
  // Calculate the list of dates with events for the selected month
  const getDatesWithEvents = () => {
    if (!selectedMonth || !pois || pois.length === 0) return [];
    
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    // First day of selected month
    const firstDay = new Date(year, month, 1);
    // Last day of selected month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get all unique dates in the selected month that have POIs
    const datesWithPois = new Set();
    
    pois.forEach(poi => {
      const poiDate = new Date(poi.showDate);
      if (
        poiDate.getFullYear() === year && 
        poiDate.getMonth() === month &&
        poiDate >= startDate && 
        poiDate <= endDate
      ) {
        datesWithPois.add(new Date(
          poiDate.getFullYear(), 
          poiDate.getMonth(), 
          poiDate.getDate()
        ));
      }
    });
    
    return Array.from(datesWithPois) as Date[];
  };
  
  // Calculate current period - for displaying the selected month/date
  const currentMonthInfo = (() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return {
      month: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      day: currentDate.getDate()
    };
  })();
  
  // When month changes, update relevant dates
  useEffect(() => {
    // When initially selected month changes, update the calendar
    if (selectedMonth && selectedMonth.getMonth() !== currentDate.getMonth()) {
      setSelectedMonth(currentDate);
    }
  }, [currentDate]);
  
  // Highlight dates that have events
  const datesWithEvents = getDatesWithEvents();
  
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
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border border-gray-300"
                >
                  <i className="fas fa-calendar-alt mr-1"></i> {format(currentDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={handleDateSelect}
                  onMonthChange={setSelectedMonth}
                  month={selectedMonth}
                  defaultMonth={currentDate}
                  fromDate={startDate}
                  toDate={endDate}
                  numberOfMonths={1}
                  modifiers={{
                    highlighted: datesWithEvents
                  }}
                  modifiersClassNames={{
                    highlighted: "bg-primary text-primary-foreground"
                  }}
                  className="rounded-md border"
                  footer={
                    <div className="px-4 pb-2 pt-0 text-xs text-center text-gray-500">
                      Shows highlighted in color
                    </div>
                  }
                />
              </PopoverContent>
            </Popover>
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