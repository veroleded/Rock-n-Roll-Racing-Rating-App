/**
 * Проверяет, является ли пользователь администратором по его Discord ID
 */
export function isAdminUser(userId: string): boolean {
  const adminIds = process.env.DISCORD_ADMIN_IDS?.split(",") || [];
  return adminIds.includes(userId);
}
