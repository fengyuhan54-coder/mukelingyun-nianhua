import type { MulingPetState } from '@/lib/muling-pet-types';

export const MULING_PET_EVENT = 'muling:pet-state';

export function notifyMulingPet(state: MulingPetState, message?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MULING_PET_EVENT, { detail: { state, message } }));
}
