import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { ConflictError, ValidationError } from '../lib/error-handler.ts'
import { publishUrlCreatedEvent } from '../lib/kafka/producers/index.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const createUrl: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    '/api/urls',
    {
      schema: {
        body: z.object({
          url: z.string().url(),
          customCode: z.string().optional(),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            originalUrl: z.string(),
            shortCode: z.string(),
            shortUrl: z.string(),
            clickCount: z.number(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { url, customCode } = request.body
      const userId = request.headers['x-user-id']

      try {
        // Validate URL format
        new URL(url)
      } catch (error) {
        throw new ValidationError('Invalid URL format')
      }

      const urlId = createId()
      const shortCode = customCode || createId().slice(0, 8)
      
      try {
        // Check if custom code already exists
        if (customCode) {
          const existingUrl = await db
            .select()
            .from(urls)
            .where(eq(urls.shortCode, customCode))
            .limit(1)
          
          if (existingUrl.length > 0) {
            throw new ConflictError('Custom short code already exists')
          }
        }

        // Insert new URL into database
        const [createdUrl] = await db
          .insert(urls)
          .values({
            id: urlId,
            originalUrl: url,
            shortCode,
            clickCount: 0,
          })
          .returning()

        // INSERT_YOUR_CODE
        // Connect to Kafka broker, create producer, and send a test message using kafkajs
        // (no imports here, assume kafkajs is available in project dependencies)
        const { Kafka } = await import('kafkajs')
        const kafka = new Kafka({
          clientId: 'url-shortener-test',
          brokers: process.env.KAFKA_BROKERS
            ? process.env.KAFKA_BROKERS.split(',')
            : ['localhost:9092'],
        })
        const producer = kafka.producer()
        await producer.connect()
        await producer.send({
          topic: 'test-topic',
          messages: [
            {
              key: 'test-key',
              value: JSON.stringify({ message: 'Test message from create-url route' }),
            },
          ],
        })
        await producer.disconnect()
        console.log('createdUrl', createdUrl)
        // Publish URL creation event to Kafka (fire-and-forget)
        await publishUrlCreatedEvent({
          eventId: createId(),
          urlId: createdUrl.id,
          shortCode: createdUrl.shortCode,
          originalUrl: createdUrl.originalUrl,
          userId,
          createdAt: createdUrl.createdAt.toISOString(),
          metadata: {
            host: request.headers.host,
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
          },
        }).catch((error: any) => {
          console.error('Failed to publish URL creation event:', error)
          // In production, you might want to send this to a monitoring service
        })

        return reply.status(201).send({
          id: createdUrl.id,
          originalUrl: createdUrl.originalUrl,
          shortCode: createdUrl.shortCode,
          shortUrl: `http://localhost:8000/${createdUrl.shortCode}`,
          clickCount: createdUrl.clickCount ?? 0,
          createdAt: createdUrl.createdAt.toISOString(),
        })
      } catch (error) {
        if (error instanceof ConflictError) {
          throw error
        }
        console.error('Error creating URL:', error)
        throw new ValidationError('Failed to create short URL')
      }
    }
  )
}