import { z } from 'zod'

export const ClickEventPayload = z.object({
  shortCode: z.string(),
  originalUrl: z.string(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  referer: z.string().optional(),
  timestamp: z.string().datetime(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const ClickEvent = z.object({
  type: z.literal('url-shortener.click'),
  payload: ClickEventPayload,
})

export type ClickEventPayload = z.infer<typeof ClickEventPayload>
export type ClickEvent = z.infer<typeof ClickEvent>
