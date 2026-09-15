export interface ResourceProfile {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceInput {
  name: string;
}

export interface UpdateResourceInput {
  name?: string;
  isActive?: boolean;
}

export interface ListResourcesQuery {
  isActive?: boolean;
  q?: string;
}
