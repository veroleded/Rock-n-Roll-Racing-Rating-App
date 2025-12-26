import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // Находим файл в базе данных
    const downloadFile = await prisma.downloadFile.findUnique({
      where: {
        id: fileId,
      },
    });

    if (!downloadFile) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    // Читаем файл с диска
    const filePath = path.join(UPLOAD_DIR, downloadFile.filePath);
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      
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
      return NextResponse.json({ error: 'Файл не найден на диске' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Ошибка при скачивании файла' }, { status: 500 });
  }
}

