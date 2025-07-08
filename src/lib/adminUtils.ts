export function isAdminUser(userId: string): boolean {
  const adminIds = process.env.DISCORD_ADMIN_IDS?.split(',') || [];
  return adminIds.includes(userId);
}
