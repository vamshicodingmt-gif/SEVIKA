import { create } from "zustand";

export interface WizardService {
  id: string;
  name: string;
  priceFrom: number;
  durationMin: number;
  category: string;
}

interface BookingWizardState {
  step: number;
  serviceIds: string[];
  date: string | null; // YYYY-MM-DD (artist wall clock)
  slot: string | null; // ISO
  locationType: "HOME" | "STUDIO" | "VENUE";
  addressLine: string;
  city: string;
  pincode: string;
  notes: string;
  isGroup: boolean;
  groupName: string;
  headcount: string;
  contactPhone: string;
  setStep: (step: number) => void;
  toggleService: (id: string) => void;
  setDate: (date: string | null) => void;
  setSlot: (slot: string | null) => void;
  patch: (partial: Partial<Omit<BookingWizardState, "patch" | "setStep" | "toggleService" | "setDate" | "setSlot" | "reset">>) => void;
  reset: () => void;
}

const initial = {
  step: 0,
  serviceIds: [] as string[],
  date: null,
  slot: null,
  locationType: "HOME" as const,
  addressLine: "",
  city: "",
  pincode: "",
  notes: "",
  isGroup: false,
  groupName: "",
  headcount: "",
  contactPhone: "",
};

export const useBookingWizard = create<BookingWizardState>((set, get) => ({
  ...initial,
  setStep: (step) => set({ step }),
  toggleService: (id) => {
    const { serviceIds, slot } = get();
    set({
      serviceIds: serviceIds.includes(id) ? serviceIds.filter((s) => s !== id) : [...serviceIds, id],
      // changing services changes total duration → invalidate the chosen slot
      slot: null,
    });
  },
  setDate: (date) => set({ date, slot: null }),
  setSlot: (slot) => set({ slot }),
  patch: (partial) => set(partial),
  reset: () => set({ ...initial }),
}));
