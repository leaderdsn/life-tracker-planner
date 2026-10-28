export type QuickStartStep = {
  title: string
  description: string
  command: string
}

export const QUICK_START_STEPS: readonly QuickStartStep[] = [
  {
    title: 'Клонировать шаблон',
    description: 'Создайте новый проект на основе репозитория.',
    command: 'git clone https://github.com/leaderdsn/vue-fsd-starter.git my-app',
  },
  {
    title: 'Установить зависимости',
    description: 'Node.js 22.18+ или 24.12+ и pnpm 11. Хуки Husky установятся автоматически.',
    command: 'pnpm install',
  },
  {
    title: 'Запустить dev-сервер',
    description: 'Приложение откроется на http://localhost:5173.',
    command: 'pnpm dev',
  },
  {
    title: 'Проверить качество',
    description: 'Линт, проверка типов и тесты — то же, что и в CI.',
    command: 'pnpm lint && pnpm type-check && pnpm test',
  },
]
