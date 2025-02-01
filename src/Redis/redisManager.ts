import { Redis } from 'ioredis';
interface RedisConfig {
  host: string;
  port: number;
  password?:string
}


export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || "localhost" ,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password:process.env.REDIS_PASSWORD
};


export class RedisService {
  private static instance: RedisService;
  private publisher: Redis;
  private subscriber: Redis;
  private client: Redis;

  private constructor(config: RedisConfig) {
    // Create separate connections for different purposes
    this.publisher = new Redis(config);
    this.subscriber = new Redis(config);
    this.client = new Redis(config);

    this.handleConnections();
  }

  private handleConnections() {
    // Publisher error handling
    this.publisher.on('error', (err) => {
      console.error('Redis Publisher Error:', err);
    });

    // Subscriber error handling
    this.subscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });

    // Client error handling
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Connection success logging
    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  public static getInstance(config: RedisConfig): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService(config);
    }
    return RedisService.instance;
  }

  public getPublisher(): Redis {
    return this.publisher;
  }

  public getSubscriber(): Redis {
    return this.subscriber;
  }

  public getClient(): Redis {
    return this.client;
  }
}