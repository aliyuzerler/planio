export interface ServiceProfile {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: string;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  price?: string;
  isActive?: boolean;
}

export interface ListServicesQuery {
  isActive?: boolean;
  q?: string;
}
