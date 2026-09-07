export const stages = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "INTERESTED",
  "NEGOTIATION",
  "BOOKED",
  "LOST",
] as const;
export type Stage = (typeof stages)[number];
export type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "SALES";
};
export type Note = {
  id: number;
  text: string;
  authorName: string;
  createdAt: string;
};
export type Lead = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  stage: Stage;
  assignedTo: number;
  assigneeName: string;
  nextFollowUp: string | null;
  updatedAt: string;
  notes?: Note[];
  booking?: Booking[];
};
export type Project = { id: number; name: string; location: string };
export type Building = { id: number; name: string; projectId: number };
export type Unit = {
  id: number;
  buildingId: number;
  projectId: number;
  unitNumber: string;
  type: string;
  price: number;
  availability: "AVAILABLE" | "BOOKED";
  buildingName: string;
  projectName: string;
};
export type Inventory = {
  projects: Project[];
  buildings: Building[];
  units: Unit[];
};
export type Booking = {
  id: number;
  leadId: number;
  leadName: string;
  bookedPrice: number;
  bookedAt: string;
  unitNumber: string;
  buildingName: string;
  projectName: string;
  bookedByName: string;
};
export type DashboardData = {
  counts: {
    totalLeads: number;
    activeLeads: number;
    dueToday: number;
    overdue: number;
  };
  bookings: { bookingCount: number; bookedValue: number };
  stages: { stage: Stage; count: number }[];
  followUps: Lead[];
  today: string;
  timezone: string;
};
