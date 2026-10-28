export type FsdLayer = {
  name: string
  description: string
  example: string
}

/** Ordered top to bottom: each layer may import only from the layers below it. */
export const FSD_LAYERS: readonly FsdLayer[] = [
  { name: 'app', description: 'Инициализация: провайдеры, роутер, глобальные стили', example: 'app/providers/router.ts' },
  { name: 'pages', description: 'Страницы — композиция виджетов под маршрут', example: 'pages/home' },
  { name: 'widgets', description: 'Крупные самостоятельные блоки интерфейса', example: 'widgets/app-header' },
  { name: 'features', description: 'Пользовательские действия с ценностью', example: 'features/toggle-theme' },
  { name: 'entities', description: 'Бизнес-сущности: типы, запросы, UI', example: 'entities/technology' },
  { name: 'shared', description: 'Переиспользуемое без бизнес-логики', example: 'shared/api, shared/ui' },
]

export const FSD_RULES: readonly string[] = [
  'Слой импортирует только из слоёв ниже себя.',
  'Слайсы одного слоя не знают друг о друге.',
  'Наружу слайс отдаёт только то, что есть в index.ts.',
  'Границы проверяет ESLint — нарушение не пройдёт pre-commit.',
]
