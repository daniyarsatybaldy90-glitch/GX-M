import { create } from 'zustand'

export type DeviceBase = { current:number; voltage:number; frequency:number; poles:'3P'|'4P' }
export type Release = { type:'TM'|'ELN'; model?:string }
export type Order = {
  version:string; catalogVersion:string;
  customer?: { name:string; contact?:string };
  project?: { name?:string; location?:string };
  device: {
    id:string;
    base: DeviceBase;
    release: Release;
    protections: string[];
    uki: { enabled:boolean; model?:string };
    interfaces: string[];
    enclosure: { id:string; inlets:number };
    controls: { buttons:string[]; indicators:string[]; auxContacts:number };
  };
  items:{ code:string; name:string; qty:number }[];
  meta:{ createdAt:string; userAgent:string; hash?:string };
}

type State = {
  catalogVersion: string
  orderDraft: any | null
  setOrderDraft: (o: any) => void
}

export const useAppState = create<State>((set)=>({
  catalogVersion: '2025.12',
  orderDraft: null,
  setOrderDraft: (o)=> set({ orderDraft: { ...o } })
}))