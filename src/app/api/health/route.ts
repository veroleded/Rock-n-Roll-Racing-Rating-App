import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Проверка подключения к базе данных
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 503 }
    );
  }
}


