export interface BusinessProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  timezone?: string;
  currency?: string;
}

export interface InviteAccountantInput {
  email: string;
  firstName: string;
  lastName: string;
}
