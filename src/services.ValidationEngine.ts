import { z } from 'zod'

export const BaseParamsSchema = z.object({
  current: z.number(),
  voltage: z.number(),
  frequency: z.number(),
  poles: z.enum(['1P', '1P+N', '2P', '3P', '4P', '3P+N']),
  icu: z.number().optional()
})

export const ReleaseSchema = z.object({
  type: z.enum(['TM','EN','EM']),
  model: z.string().optional()
})

export const OrderFormSchema = z.object({
  customer: z.object({ name: z.string().optional(), contact: z.string().optional() }).optional(),
  project: z.object({ name: z.string().optional(), location: z.string().optional() }).optional(),
  base: BaseParamsSchema,
  release: ReleaseSchema,
  protections: z.array(z.string()).default([]),
  uki: z.object({ enabled: z.boolean(), model: z.string().optional() }).optional(),
  interfaces: z.array(z.string()).default([]),
  enclosure: z.object({ 
    id: z.string(), 
    inlets: z.number().min(1).max(10),
    material: z.enum(['carbon', 'stainless', 'explosive']).optional(),
    ip: z.string().optional()
  }),
  cabling: z.object({
    inputLines: z.number().min(0).max(10).optional(),
    cableEntries: z.string().optional()
  }).optional(),
  controls: z.object({ 
    buttons: z.array(z.string()).optional(), 
    indicators: z.array(z.string()).optional(), 
    auxContacts: z.number().min(0).max(8).optional(),
    controlType: z.enum(['local', 'remote', 'combined']).optional(),
    hasHandle: z.boolean().optional()
  }).optional(),
  additionalRequirements: z.string().optional()
})

export type OrderForm = z.infer<typeof OrderFormSchema>