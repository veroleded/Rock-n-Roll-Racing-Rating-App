import React from 'react';

export const MatchLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
    </div>
  );
};

export const MatchNotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">Матч не найден</h1>
      <p className="text-muted-foreground">Возможно, он был удален или у вас нет к нему доступа</p>
    </div>
  );
};
