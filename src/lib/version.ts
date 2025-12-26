/**
 * Получает текущую версию из переменной окружения
 * На клиенте использует NEXT_PUBLIC_VERSION, на сервере - VERSION
 * По умолчанию используется 'bogdan'
 */
export function getVersion(): 'bogdan' | 'fedor' {
  if (typeof window !== 'undefined') {
    // Клиентская сторона
    const version = process.env.NEXT_PUBLIC_VERSION?.toLowerCase();
    return version === 'fedor' ? 'fedor' : 'bogdan';
  } else {
    // Серверная сторона
    const version = process.env.VERSION?.toLowerCase();
    return version === 'fedor' ? 'fedor' : 'bogdan';
  }
}

