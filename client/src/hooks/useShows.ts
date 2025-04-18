import { useQuery } from "@tanstack/react-query";
import { CircusShowWithCoords, CircusVenue } from "@shared/schema";
import { formatDateForApi } from "@/lib/dateUtils";

/**
 * Hook to get circus shows for a specific date
 */
export const useShowsByDate = (date: Date) => {
  const formattedDate = formatDateForApi(date);
  
  return useQuery<CircusShowWithCoords[]>({
    queryKey: ["/api/shows/date", formattedDate],
  });
};

/**
 * Hook to get venue information (grouped by location)
 */
export const useVenues = () => {
  return useQuery<CircusVenue[]>({
    queryKey: ["/api/shows/venues"],
  });
};

/**
 * Hook to get date range for all shows
 */
export const useDateRange = () => {
  return useQuery<{startDate: string, endDate: string}>({
    queryKey: ["/api/shows/date-range"],
  });
};
