export type Role = "ADMIN" | "MODERATOR" | "PLAYER";

export type GameMode = "2v2" | "3v3" | "2v2v2";

export interface Player {
  id: string;
  discordId: string;
  nickname: string;
  role: Role;
  rating: number;
  gameCount: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
  id: string;
  mode: GameMode;
  players: Player[];
  saveFile: string;
  createdAt: Date;
  createdBy: Player;
}

export interface PlayerStats {
  rating: number;
  gameCount: number;
  score: number;
  winRate: number;
  averagePosition: number;
}

// Auth types
export interface Session {
  user: {
    id: string;
    discordId: string;
    nickname: string;
    role: Role;
    accessToken: string;
  };
  expires: string;
}
