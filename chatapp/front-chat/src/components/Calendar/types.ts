export type ViewMode = "day" | "week" | "month" | "year";

export type EventType = "meeting" | "slot";

export interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  date: string;
  startTime?: string,
  endTime?: string,
  meetingLink?: string;
  guests?: string[];
}