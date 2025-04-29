import { prisma } from '@/lib/prisma';
import { QueuesService } from '@/server/services/queues/queues.service';
import { UsersService } from '@/server/services/users/users.service';
import { Queue, Stats, User } from '@prisma/client';
import { Message, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import { createEmbed } from '../utils/embeds';

dotenv.config();

const APP_URL =
  process.env.NODE_ENV === 'production' ? (process.env.APP_URL ?? '') : 'http://80.76.34.54';

type PlayerWithStats = User & { stats: Stats | null };
type QueueWithPlayers = Queue & { players: PlayerWithStats[] };

export class TeamFormationService {
  userService: UsersService;
  queueService: QueuesService;
  constructor() {
    this.userService = new UsersService(prisma);
    this.queueService = new QueuesService(prisma);
  }
  // Вспомогательная функция для получения всех комбинаций из массива длины k
  private combinations<T>(arr: T[], k: number): T[][] {
    const result: T[][] = [];
    function combine(start: number, comb: T[]) {
      if (comb.length === k) {
        result.push([...comb]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        comb.push(arr[i]);
        combine(i + 1, comb);
        comb.pop();
      }
    }
    combine(0, []);
    return result;
  }

  // Функция генерирует все разбиения массива arr на группы с указанными размерами
  private partitions<T>(arr: T[], sizes: number[]): T[][][] {
    const result: T[][][] = [];
    const combinations = this.combinations.bind(this);

    function partitionRecursive(remaining: T[], currentGroups: T[][], sizes: number[]) {
      if (sizes.length === 0) {
        if (remaining.length === 0) {
          result.push(currentGroups.map((group) => [...group]));
        }
        return;
      }
      const currentSize = sizes[0];
      const combs = combinations(remaining, currentSize);
      for (const comb of combs) {
        const newRemaining = remaining.filter((item) => !comb.includes(item));
        partitionRecursive(newRemaining, [...currentGroups, comb], sizes.slice(1));
      }
    }

    partitionRecursive(arr, [], sizes);
    return result;
  }

  // Формирует команды на основе очереди
  async formTeams(queue: QueueWithPlayers, message: Message): Promise<void> {
    const { players, botsCount, gameType } = queue;

    // Получаем список доступных ботов
    const bots = await this.userService.getBotListForEdit();

    // Определяем параметры распределения
    let condition: number;
    switch (gameType) {
      case 'TWO_VS_TWO':
        condition = 1; // 2 группы по 2 игрока
        break;
      case 'THREE_VS_THREE':
        condition = 2; // 2 группы по 3 игрока
        break;
      case 'TWO_VS_TWO_VS_TWO':
        condition = 3; // 3 группы по 2 игрока
        break;
      default:
        throw new Error('Неизвестный тип игры');
    }

    // Получаем размеры групп
    let groupCount: number, groupSize: number;
    switch (condition) {
      case 1:
        groupCount = 2;
        groupSize = 2;
        break;
      case 2:
        groupCount = 2;
        groupSize = 3;
        break;
      case 3:
        groupCount = 3;
        groupSize = 2;
        break;
      default:
        throw new Error('Неверное условие распределения');
    }

    const totalNeeded = groupCount * groupSize;
    const missingCount = totalNeeded - players.length;

    // Переменные для хранения лучшего разбиения
    let bestPartition: PlayerWithStats[][] | null = null;
    let bestDiff = Infinity;

    // Получаем все возможные наборы недостающих ботов
    let candidateMissingSets: PlayerWithStats[][] = [];
    if (missingCount > 0 && botsCount > 0) {
      candidateMissingSets = this.combinations(bots, Math.min(missingCount, botsCount));
    } else {
      candidateMissingSets = [[]];
    }

    // Перебираем каждый вариант недостающих ботов
    for (const missingSet of candidateMissingSets) {
      const fullSet = [...players, ...missingSet];
      if (fullSet.length !== totalNeeded) continue;

      // Генерируем все разбиения fullSet на группы нужного размера
      const groupSizes = Array(groupCount).fill(groupSize);
      const allPartitions = this.partitions(fullSet, groupSizes);

      // Оцениваем каждое разбиение: ищем разницу между максимальной и минимальной суммой рейтингов
      for (const partition of allPartitions) {
        const sums = partition.map((group) =>
          group.reduce((acc, player) => acc + (player.stats?.rating || 0), 0)
        );
        const maxSum = Math.max(...sums);
        const minSum = Math.min(...sums);
        const diff = maxSum - minSum;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestPartition = partition;
        }
      }
    }

    if (bestPartition === null) {
      throw new Error('Не удалось распределить игроков');
    }

    // Отправляем сформированные команды в чат
    await this.sendTeamsToChat(bestPartition, message, gameType);
  }

  private async sendTeamsToChat(
    teams: PlayerWithStats[][],
    message: Message,
    gameType: Queue['gameType']
  ): Promise<void> {
    const embed = createEmbed.info('Команды сформированы', 'Распределение игроков по командам:');

    const teamRatings: number[] = [];

    teams.forEach((team, index) => {
      const shuffledTeam = [...team].sort(() => Math.random() - 0.5);
      const teamRating = Math.round(
        shuffledTeam.reduce((sum, player) => sum + (player.stats?.rating || 0), 0) /
          shuffledTeam.length
      );

      const sumTeamRating = shuffledTeam.reduce(
        (sum, player) => sum + (player.stats?.rating || 0),
        0
      );

      teamRatings.push(sumTeamRating);

      const teamInfo = shuffledTeam
        .map((player) => `${player.name} (${player.stats?.rating || 0})`)
        .join('\n');

      embed.addFields({
        name: `Команда ${index + 1} (ср. рейтинг: ${teamRating} / ${sumTeamRating.toFixed(2)})`,
        value: teamInfo,
        inline: false,
      });
    });

    const maxRating = Math.max(...teamRatings);
    const minRating = Math.min(...teamRatings);
    const ratingDifference = (maxRating - minRating).toFixed(2);

    const gameTypeText =
      gameType === 'THREE_VS_THREE' ? '3x3' : gameType === 'TWO_VS_TWO' ? '2x2' : '2x2x2';

    embed.setTitle(
      `Команды сформированы (${gameTypeText}).\n${APP_URL}/matches\nРазница: ${ratingDifference}.`
    );

    await message.reply({ embeds: [embed] });

    // Проверяем, что канал является текстовым
    if (!(message.channel instanceof TextChannel)) {
      console.error('Канал не является текстовым');
      return;
    }

    // Удаляем очередь после отправки сообщения о командах
    const channelName = message.channel.name;

    try {
      await this.queueService.cleanQueueByChannel(channelName);

      await message.channel.send({
        embeds: [
          createEmbed.info(
            'Очередь очищена',
            'Очередь была автоматически очищена после формирования команд.'
          ),
        ],
      });
    } catch (error) {
      console.error('Ошибка при очистке очереди:', error);
    }
  }
}
