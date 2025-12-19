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
}).superRefine((val, ctx)=>{
  if((val.type==='EN' || val.type==='EM') && !val.model){
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Укажите модель расцепителя', path: ['model'] })
  }
})

export const OrderFormSchema = z.object({
  customer: z.object({ name: z.string().optional(), contact: z.string().optional() }).default({ name: undefined, contact: undefined }),
  project: z.object({ name: z.string().optional(), location: z.string().optional() }).default({ name: undefined, location: undefined }),
  base: BaseParamsSchema,
  release: ReleaseSchema,
  protections: z.array(z.string()).default([]),
  uki: z.object({ enabled: z.boolean(), model: z.string().optional() }).superRefine((val, ctx)=>{
    if(val.enabled && !val.model){
      ctx.addIssue({ code:'custom', message:'Укажите модель УКИ', path:['model'] })
    }
  }),
  interfaces: z.array(z.string()).default([]),
  enclosure: z.object({ 
    id: z.string(), 
    inlets: z.number().min(1).max(10),
    material: z.enum(['carbon', 'stainless', 'explosive']).default('carbon'),
    ip: z.string().default('IP40')
  }),
  cabling: z.object({
    inputLines: z.number().min(0).max(10).default(0),
    cableEntries: z.string().optional()
  }).default({ inputLines: 0, cableEntries: undefined }),
  controls: z.object({ 
    buttons: z.array(z.string()), 
    indicators: z.array(z.string()), 
    auxContacts: z.number().min(0).max(8),
    controlType: z.enum(['local', 'remote', 'combined']).default('local'),
    hasHandle: z.boolean().default(false)
  })
})

export type OrderForm = z.infer<typeof OrderFormSchema>