import type { WeeklyHoursSlot } from "./notification";

export interface StaffSpecialization {
  id: string;
  name: string;
  isActive: boolean;
  assignedAt: string;
}

export interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  isSelf?: boolean;
  specializations: StaffSpecialization[];
  createdAt: string;
  updatedAt: string;
}

export interface SpecializationProfile {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  specializationIds?: string[];
}

export interface UpdateStaffInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface CreateSpecializationInput {
  name: string;
}

export interface UpdateSpecializationInput {
  isActive: boolean;
}

export interface AssignStaffSpecializationInput {
  specializationId: string;
}

export interface ListStaffQuery {
  isActive?: boolean;
  q?: string;
}

export interface StaffHoursSettings {
  days: WeeklyHoursSlot[];
}

export interface UpdateStaffHoursInput {
  days: WeeklyHoursSlot[];
}
