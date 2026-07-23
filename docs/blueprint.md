# Боб Вебинар-бот — Bot specification

**Archetype:** booking

**Voice:** warm and concise — write every user-facing message, button label, error, and empty state in this voice.

Бот для бесплатной регистрации на вебинар Боба, сбора контактов участников и отправки уведомлений организатору. Поддерживает автоматические напоминания за 24 часа и 1 час до события, а также возможность отмены регистрации.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- новички в байинге
- участники бесплатного вебинара

## Success criteria

- Участники получают подтверждение регистрации
- Организатор получает уведомления о новых регистрациях и отменах
- Автоматические напоминания отправляются за 24 часа и 1 час до вебинара

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Открыть главное меню
- **Записаться** (button, actor: user, callback: booking:start) — Начать процесс регистрации на вебинар
  - inputs: Имя и фамилия, Email, Телефон
  - outputs: Подтверждение регистрации, Инструкции по вебинару
- **Отменить запись** (button, actor: user, callback: booking:cancel) — Отменить регистрацию на вебинар
  - inputs: Telegram ID/username
  - outputs: Подтверждение отмены
- **/send_reminders** (command, actor: admin, command: /send_reminders) — Ручная отправка напоминаний участникам

## Flows

### Регистрация
_Trigger:_ booking:start

1. Показать главное меню
2. Запросить имя и фамилию
3. Запросить email
4. Запросить телефон
5. Подтвердить данные
6. Сохранить запись

_Data touched:_ participant

### Отмена
_Trigger:_ booking:cancel

1. Проверить статус регистрации
2. Обновить статус участника
3. Отправить подтверждение отмены
4. Уведомить организатора

_Data touched:_ participant

### Напоминания
_Trigger:_ /send_reminders

1. Получить список зарегистрированных
2. Отправить 24-часовое напоминание
3. Отправить 1-часовое напоминание

_Data touched:_ participant, webinar

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **participant** _(retention: persistent)_ — Данные участника вебинара
  - fields: name, email, phone, telegram_id, status, registration_timestamp
- **webinar** _(retention: persistent)_ — Информация о вебинаре
  - fields: date_time, description, stream_link_status

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Установка даты/времени вебинара
- Настройка описания вебинара
- Включение/отключение автоматических напоминаний
- Ручная отправка напоминаний

## Notifications

- Автоматические напоминания участникам за 24 часа и 1 час
- Уведомления организатору о новых регистрациях и отменах

## Permissions & privacy

- Сбор и хранение личных данных (имя, email, телефон) с согласием пользователя
- Отправка уведомлений только по запросу или по установленному расписанию

## Edge cases

- Пользователь пытается отменить запись без предыдущей регистрации
- Вебинарная дата в прошлом
- Неполные данные при регистрации
- Отсутствие активных вебинаров при запуске бота

## Required tests

- Проверка полной регистрации участника с последующим получением подтверждения
- Тест отмены записи и уведомления организатора
- Валидация автоматической рассылки напоминаний по расписанию

## Assumptions

- Вебинар проводится в единственной сессии
- Email/телефон не требуют верификации
- Напоминания включены по умолчанию
- Формат уведомлений организатору включает кнопки управления
