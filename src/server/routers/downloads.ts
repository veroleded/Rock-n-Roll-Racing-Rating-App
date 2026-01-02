import { TRPCError } from '@trpc/server';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { adminProcedure, publicProcedure, router } from '../trpc';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Убеждаемся, что директория существует
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const downloadsRouter = router({
  // Получить список доступных файлов для скачивания
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      const files = await ctx.prisma.downloadFile.findMany({
        orderBy: {
          uploadedAt: 'desc',
        },
      });
      return files;
    } catch (error) {
      console.error('Error fetching download files:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Не удалось получить список файлов',
      });
    }
  }),

  // Загрузить файл (только для админов)
  upload: adminProcedure
    .input(
      z.object({
        type: z.enum(['GAME', 'EMULATOR']),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded file data
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureUploadDir();

        // Декодируем base64 данные
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        const fileSize = fileBuffer.length;

        // Находим существующий файл того же типа
        const existingFile = await ctx.prisma.downloadFile.findUnique({
          where: {
            type: input.type,
          },
        });

        // Удаляем старый файл, если он существует
        if (existingFile) {
          try {
            const oldFilePath = path.join(UPLOAD_DIR, existingFile.filePath);
            await fs.unlink(oldFilePath);
          } catch (error) {
            console.error('Error deleting old file:', error);
            // Продолжаем, даже если не удалось удалить старый файл
          }

          // Удаляем запись из базы данных
          await ctx.prisma.downloadFile.delete({
            where: {
              id: existingFile.id,
            },
          });
        }

        // Сохраняем новый файл
        const filePath = `${input.type.toLowerCase()}_${Date.now()}_${input.fileName}`;
        const fullPath = path.join(UPLOAD_DIR, filePath);
        await fs.writeFile(fullPath, fileBuffer);

        // Создаем запись в базе данных
        const downloadFile = await ctx.prisma.downloadFile.create({
          data: {
            type: input.type,
            fileName: input.fileName,
            filePath: filePath,
            fileSize: fileSize,
            uploadedBy: ctx.session.user.id,
          },
        });

        return downloadFile;
      } catch (error) {
        console.error('Error uploading file:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось загрузить файл',
        });
      }
    }),

  // Удалить файл (только для админов)
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Находим файл в базе данных
        const downloadFile = await ctx.prisma.downloadFile.findUnique({
          where: {
            id: input.id,
          },
        });

        if (!downloadFile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Файл не найден',
          });
        }

        // Удаляем физический файл
        try {
          const filePath = path.join(UPLOAD_DIR, downloadFile.filePath);
          await fs.unlink(filePath);
        } catch (error) {
          console.error('Error deleting file from disk:', error);
          // Продолжаем удаление записи из БД, даже если файл не найден на диске
        }

        // Удаляем запись из базы данных
        await ctx.prisma.downloadFile.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true };
      } catch (error) {
        console.error('Error deleting file:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось удалить файл',
        });
      }
    }),
});
