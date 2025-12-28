import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import {
  httpRequestCounter,
  httpRequestDuration,
  networkBytesOut,
} from '@/lib/metrics';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    const { fileId } = await params;
    
    // Находим файл в базе данных
    const downloadFile = await prisma.downloadFile.findUnique({
      where: {
        id: fileId,
      },
    });

    if (!downloadFile) {
      const status = 404;
      httpRequestCounter.inc({ method, route: pathname, status: status.toString() });
      httpRequestDuration.observe(
        { method, route: pathname, status: status.toString() },
        (Date.now() - startTime) / 1000
      );
      return NextResponse.json({ error: 'Файл не найден' }, { status });
    }

    // Читаем файл с диска
    const filePath = path.join(UPLOAD_DIR, downloadFile.filePath);
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      // Записываем метрики для исходящего трафика
      networkBytesOut.inc(fileBuffer.length);
      
      const status = 200;
      httpRequestCounter.inc({ method, route: pathname, status: status.toString() });
      httpRequestDuration.observe(
        { method, route: pathname, status: status.toString() },
        (Date.now() - startTime) / 1000
      );
      
      // Возвращаем файл с правильными заголовками
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${downloadFile.fileName}"`,
          'Content-Length': downloadFile.fileSize.toString(),
        },
      });
    } catch (error) {
      console.error('Error reading file:', error);
      const status = 404;
      httpRequestCounter.inc({ method, route: pathname, status: status.toString() });
      httpRequestDuration.observe(
        { method, route: pathname, status: status.toString() },
        (Date.now() - startTime) / 1000
      );
      return NextResponse.json({ error: 'Файл не найден на диске' }, { status });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    const status = 500;
    httpRequestCounter.inc({ method, route: pathname, status: status.toString() });
    httpRequestDuration.observe(
      { method, route: pathname, status: status.toString() },
      (Date.now() - startTime) / 1000
    );
    return NextResponse.json({ error: 'Ошибка при скачивании файла' }, { status });
  }
}

