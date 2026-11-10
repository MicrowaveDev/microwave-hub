# Серверная публикация в Bluesky, Discord и Telegram

Статус: архитектура уточнена аудитом существующего node; реализация не начата. Дата: 2026-11-10.

Область: прежде всего `geesome-node`, затем `microwave-girls`; `geesome-client`
участвует в проверке изоляции и управляемом переключении маршрутов.

Основа: [первый этап назначений](social-publication-destinations-stage-one.md),
[node PR #1571](https://github.com/galtproject/geesome-node/pull/1571) и
[client PR #28](https://github.com/galtproject/geesome-client/pull/28).
Перед реализацией проверить их фактический merge/status и продолжать от
соответствующих integration branches. Пользовательские PR merges не выполнять.

## Содержание

- [Требования и границы](#требования-и-границы)
- [Исходный код и ограничения](#исходный-код-и-ограничения)
- [Минимальная архитектура](#минимальная-архитектура)
- [Подключение серверных аккаунтов](#подключение-серверных-аккаунтов)
- [Контракт задач и совместимость](#контракт-задач-и-совместимость)
- [Worker и неизвестные исходы](#worker-и-неизвестные-исходы)
- [Три адаптера](#три-адаптера)
- [Girls и переключение Era of Wave](#girls-и-переключение-era-of-wave)
- [Рабочие потоки и порядок](#рабочие-потоки-и-порядок)
- [Проверка и критерии завершения](#проверка-и-критерии-завершения)
- [Развёртывание и откат](#развёртывание-и-откат)
- [Открытые решения](#открытые-решения)
- [Заметки реализации](#заметки-реализации)

## Требования и границы

Запрошено пользователем:

- Постить из microwave-girls через сервер geesome-node в Bluesky, Discord и Telegram.
- Сохранить чёткое разделение server/client аккаунтов и простой подход первого этапа.
- В Girls сохранить selector групп соцсетей без чекбоксов назначения. На этом этапе
  остаются согласованные варианты отдельных сетей и комбинированной группы.

Предлагаемые решения:

- Один каталог `PublicationDestination`, одна `PublicationJob`, один серверный worker.
- Серверные credentials подключаются явно к node. Локальные credentials из client
  автоматически не копируются. Секреты из старых Girls profiles не импортируются молча.
- Twitter/X, Rule34 и Patreon сохраняют локальную отправку. Менять эти адаптеры не нужно.
- Server destinations принимают private source group Girls и замороженный payload;
  делать исходные материалы публичными не требуется.
- Текст и still-image публикации: Bluesky до четырёх изображений; Discord/Telegram
  по одному изображению на job, как уже разбивает Girls. Альбомы, видео и новые
  форматные возможности провайдеров в этот этап не входят.

Не входят: отдельный executor registry, очередь Redis/Bull, новый брокер сообщений,
микросервис, отдельная таблица attempts, heartbeat, автоматический failover,
автоматическое перепланирование неизвестных отправок, редактор групп соцсетей,
массовая миграция существующей очереди и deployment как способ проверки кода.

## Исходный код и ограничения

Проверено по текущим checkout первого этапа:

| Репозиторий / место | Что переиспользовать или изменить |
| --- | --- |
| Node `app/modules/localClient/{models,destinations,index,outbox,producer,api}.ts` | Каталог, compose, атомарный claim, result/cancel, source ACL, frozen payload и digests |
| Node `app/modules/socNetAccount/{models,index,api}.ts` | Owner-scoped записи аккаунтов и safe response projection; секретные поля уже исключаются из ответов |
| Node `app/backgroundWorker.ts`; `bluesky/{index,cron}.ts` | Готовые interval worker, nonoverlap и stop lifecycle; новый worker подключать по этому образцу |
| Node `app/index.ts` encryptTextWithAppPass/decryptTextWithAppPass | Серверное шифрование, используемое pin/tgContentBot; отдельный master key для публикации не вводить |
| Node `app/modules/bluesky/index.ts` | Протокольные helpers по месту; существующий crossPostPost не использовать как worker adapter: он читает текущий native post и требует публичный источник |
| Client `src/providers/official-networks.js`, `bluesky-facets.js` | Проверенные формы запросов, ограничения, NSFW/spoiler, безопасная классификация ошибок и tests как reference |
| Girls `app/services/localPublicationBridge.ts` | Выбор назначений, source-group scoping, v4 receipts, digest/prepared-media verification, интервалы и recovery |
| Girls `frontend/components/SocialPublishing/SocialPublishDialog.vue` | Прежний selector; сообщения об исполнителе обновить для смешанной отправки |

В первом этапе server-режим зарезервирован, но запрещён в resolve/claim. В registry
`clientId`/`localAccountId` пока обязательны; одного переключения executionMode
недостаточно. V4 digest включает clientId/localAccountId и требует отдельной
совместимой версии для server. В Girls каталог и выбор сейчас принимают только
client-mode, валидация результата также требует client identity.

`socNetAccount.isEncrypted` у существующих интеграций может означать секрет,
который расшифровывает клиент и передаёт для одного запроса. Такой аккаунт
нельзя считать пригодным для unattended server worker.

## Минимальная архитектура

Поток: **Girls → существующий compose на node → PublicationJob → серверный
worker → API соцсети → существующий результат/история → Girls**.

1. В `PublicationDestination` включить явный server-режим только для трёх сетей.
   Server destination содержит приватную ссылку `socNetAccountId`, sourceGroupId,
   network, label, target и enabled. Client-поля для него отсутствуют; не вводить
   фиктивный local account или clientId, маскирующий сервер под локальное устройство.
2. Привязка назначения к аккаунту и режиму неизменна. Другой профиль/бот или
   другой режим — новое назначение. Переименование и ротация секрета того же
   подтверждённого профиля допустимы.
3. Job фиксирует mode, destination ID, приватный server account reference,
   публичную стабильную identity провайдера, разрешённый target, source и payload.
   Новая nullable колонка ссылки на server account нужна, если текущих полей
   недостаточно; credentials в job/producer/receipt не записываются.
4. Server claim выбирает только server jobs. Client destination-claim и legacy
   claim никогда их не возвращают; server worker не забирает client/legacy jobs.
5. Переиспользовать общий внутренний код переходов состояний и source checks.
   Серверный claim/result не нуждаются в новом публичном endpoint, позволяющем
   producer изображать серверного исполнителя.
6. Использовать `startIntervalWorker` из `app/backgroundWorker.ts`, обычный module
   `cron.ts` и `setCronWorker/stop`, как в bluesky/pin. Helper уже исключает
   overlapping ticks и ждёт текущий run при stop; свой lifecycle не писать.
   Начать с одного ограниченного последовательного worker цикла раз в минуту,
   без параллельных provider sends внутри процесса. DB lock/skipLocked защищает
   от конкурирующего второго node процесса. Интервалы — срок доступности job,
   а не обещание отправки в точную секунду.

## Подключение серверных аккаунтов

Минимальный setup — owner-authenticated node API по существующему module pattern
и документированные запросы с закрытым JSON-файлом/stdin. Отдельные operator CLI
и страницу управления geesome-ui не добавлять как обязательные deliverables.
Точный набор endpoint и scopes зафиксировать в контракте до реализации.

| Сеть | Вводится только на node | Read-only проверка подключения | Стабильная identity |
| --- | --- | --- | --- |
| Bluesky | Handle и app password | createSession и проверка профиля; без создания поста | DID |
| Discord | Bot token, channel ID, необязательные guild/SFW channel | Текущий bot user, канал/guild и доступность назначения; без сообщения | Bot user ID |
| Telegram | Bot token, chat ID, необязательный SFW chat | getMe, getChat, права бота в целевом канале/чате; без сообщения | Bot user ID |

Проверка credentials не публикует тестовый пост и не доказывает будущую
приёмку любого контента. Handle/@channel по возможности разрешать в стабильные
DID/numeric IDs при setup, сохраняя отображаемое имя отдельно.

Credential storage:

- Переиспользовать owner-scoped `socNetAccount`: существующий аккаунт явно
  включается для server publishing после проверки identity. Не создавать
  дублирующую запись того же owner/network/DID: существующий upsert ищет её по
  provider identity. Import/session accounts автоматически не включаются.
- Добавить одно nullable поле `serverCredentialsEncrypted TEXT` для JSON с
  appPassword/botToken и шифровать через существующие
  `app.encryptTextWithAppPass` / `app.decryptTextWithAppPass`, как pin/tgContentBot.
  Новый secret store, master key и собственный crypto helper не нужны.
- Не использовать `sessionKey` для нового формата: там уже Telegram MTProto
  session и Twitter OAuth secret. Не менять прежнюю семантику `isEncrypted`.
- Существующий helper использует CryptoJS passphrase AES и не является AEAD.
  Не обещать аутентификацию ciphertext; глобальное усиление шифрования приложения
  — отдельная задача. Отсутствие/неверность app-pass или невалидная расшифровка
  блокирует отправку.
- Перед кодом проверить, что generic socNetAccount update не может изменить
  identity/secret server-enabled записи в обход dedicated setup. Запретить запись
  нового encrypted поля через generic update, исключить его из всех ответов и
  защитить identity аккаунта, связанного с server destination.
- API/CLI возвращают только безопасную identity, label, состояние готовности и
  назначение. Токены, app password, sessions и приватные DB references не выдаются
  Girls/client. Telegram bot token в URL также не должен попадать в request/error logs.
- При ротации секрет сверяется с прежним DID/bot ID до сохранения. Другой
  DID/bot ID требует нового account/destination; jobs старого аккаунта не переназначаются.

Источник ключей для Era of Wave согласовать при настройке. Реальные секреты
не искать в чатах и не помещать в issue, примеры, recovery notes или screenshots.

## Контракт задач и совместимость

Рекомендуется **server receipt/digest v5**, сохраняя v4(client) и v1–v3(legacy)
без изменения их canonical representations.

До реализации зафиксировать одну canonical v5 форму в node и Girls. Минимальный
публичный набор identity: `{version:5,destinationId,executionMode:'server',
accountIdentity,network,text,attachments:[{storageId,mimeType}],target}`.
`accountIdentity` — стабильная строка DID/bot ID с согласованной формой. Ключи
target сортируются, порядок attachments сохраняется. Приватная ссылка на
credentials в публичный digest не входит; она неизменно связана с destination
и заморожена отдельно в job. Не подставлять server значения в v4 clientId.

- Safe catalog добавляет server-mode и публичную accountIdentity; server secret
  reference остаётся внутри node. Advertise отдельный additive support flag для
  producer negotiation, без универсального capabilities registry.
- Compose принимает destination ID и ожидаемый digest/route snapshot. Node
  проверяет mode, owner, sourceGroupId, readiness и неизменность ожидаемого
  аккаунта/target до сохранения поста/jobs. Перед транзакционным commit повторно
  проверить enabled/route под блокировкой, как в первом этапе.
- Prepared media остаётся `social-images-v1`; замороженные оригиналы и JPEG
  manifest проверяются прежним способом. Worker читает bytes через внутренний
  owner-scoped content/storage API, без публичного URL и без SSRF по attachment.url.
- Один combined Girls request может создать v4 Twitter child и v5 children
  Bluesky/Discord/Telegram. Receipt version относится к child, а не всему batch.
- Новая попытка требует advertised server support. При downgrade и v5 receipt
  нет fallback на v4/network-only или иной аккаунт. Уже принятые jobs читаются
  без повторного выбора сегодняшних назначений.
- Старые client jobs, request keys, digests и исторические результаты не мигрируют
  и не пересчитываются. Интервалы остаются по destination ID; ошибка более позднего
  compose child восстанавливается исходными ключами без новой batch-транзакции.

## Worker и неизвестные исходы

- Worker по умолчанию выключен. Явное server-side включение не включает local
  client и не меняет назначения. Ввести простой pause/config flag, безопасный
  shutdown и запрет перекрывающихся tick внутри процесса.
- Claim короткий и атомарный. Provider/media I/O выполняется вне DB транзакции.
  Перед отдачей payload перепроверяются доступ, приватность источника,
  sourceGroupId и принадлежность server credentials текущему owner.
- Перед отправкой проверить неизменную provider identity, target, формат/размер
  медиа, окончательный текст и чувствительность. Не читать заново изменённый
  текст native post вместо job.payload.
- State machine сохраняется: queued → processing → posted/failed/needs_review;
  cancel разрешён только до processing. Paused/disabled/missing credentials
  блокируют claim, не переводят задачу другому исполнителю.
- Таймаут/read-error/5xx после publish request — unknown/needs_review. Крах
  процесса после claim оставляет processing для ручной сверки; lease expiry и
  автоматическая повторная отправка не добавляются.
- Если результат соцсети уже известен, retry относится только к DB result,
  без второго provider call. После краха при потере этого результата автоматической
  отправки нет. Не обещать exactly-once публикацию через сторонние API.
- Для 429 до отправки и недоступного provider preflight остановить текущий tick
  либо показать явную ошибку согласно контракту; не создавать новый job и не
  строить отдельный retry scheduler. Readiness check ничего не отправляет.
- Owner manual resolution для server needs_review/processing использует отдельный
  разрешённый путь и original claim token; не открывать публичное создание
  server-result любому ключу Girls с обычными enqueue scopes.

## Три адаптера

| Адаптер | Минимальная реализация | Сохраняемые свойства |
| --- | --- | --- |
| Bluesky | Session → bounded blob upload → один createRecord; результат AT URI/CID | DID, facets/UTF-8 offsets, ≤300 graphemes/3000 bytes, ≤4 images, sensitive labels |
| Discord | Проверка bot/channel → один Create Message с bytes/multipart | Frozen channel/guild, sensitive только в проверенном NSFW channel, allowed_mentions отключены, message ID |
| Telegram | Проверка bot/chat → один sendPhoto или sendMessage | Frozen numeric chat, has_spoiler для sensitive photo, plain caption без parse-mode инъекций, message_id |

Использовать ограничения подготовленного media policy, даже если провайдер
допускает больше. Не увеличивать payload limits одновременно с переносом отправки.

Переиспользовать node SDK/helpers там, где они уже удовлетворяют этим правилам.
Для Bluesky использовать уже экспортированные `createBlueskySession`,
`uploadBlueskyBlob`, `createBlueskyRecord`, image embed helpers из node
`bluesky/helpers.ts`. Нужен небольшой snapshot wrapper, а не вызов
`crossPostPost(job.postId)`. Добавить sensitive labels, bounded responses и
классификацию unknown publish outcomes: существующий cross-post этого целиком
не решает. Результат queue хранится в PublicationJob, без второй независимой
crossPosts metadata идемпотентности.

Client-код служит протокольным reference и источником тест-векторов; не импортировать
соседний checkout по относительному пути в production, не публиковать новую shared
библиотеку только ради трёх адаптеров. Небольшие переносимые функции можно скопировать
с паритетными тестами; не переносить browser-cookie transports.

Официальные источники, проверяемые заново при реализации:

- [Bluesky creating a post](https://docs.bsky.app/docs/tutorials/creating-a-post)
- [Bluesky posts/images](https://docs.bsky.app/docs/advanced-guides/posts)
- [Discord Create Message](https://docs.discord.com/developers/resources/message#create-message)
- [Telegram Bot API](https://core.telegram.org/bots/api#sendphoto)

Provider-specific idempotency (например Discord nonce) может быть дополнительной
защитой после проверки актуального контракта, но не заменяет неизвестный исход
и не является основанием автоматически повторять publish.

## Girls и переключение Era of Wave

1. Catalog parser/selection разрешает готовые client и server destinations.
   Требуется ровно одно enabled подходящее назначение на сеть/source group.
   Если доступны оба режима для одной сети — явная неоднозначность, без
   приоритета «server первый» или «online client первый».
2. Selector сохраняет нынешние пункты, без новых чекбоксов. Комбинированная
   группа может отправить Twitter через client и три остальные сети через server.
   Будущие группы/редактор не входят в этот этап.
3. Receipt/digest validation ветвится по версии и mode. Сообщения очереди
   показывают server/client; нельзя писать «ждём локальный client» для server job.
4. Для Era of Wave сначала создать server accounts/destinations с выключенным
   worker и проверить подключения. Затем pause client/server execution и
   проинвентаризировать pending jobs трёх сетей.
5. Старые client jobs либо исполнить старым маршрутом, либо явно отменить queued
   и создать новое намерение; processing/needs_review сначала сверить вручную.
   Не переносить их обновлением executionMode в БД.
6. Отключить локальные mappings трёх сетей, сохранив Twitter/Rule34/Patreon.
   Подтвердить, что registry отключил их destinations. Только затем включить
   соответствующие server destinations для новых jobs и проверить однозначность.
7. Включение worker — отдельное явное действие. Live smoke ограничивается
   конкретными согласованными destination/content/count; запрос плана не
   разрешает реальную публикацию, перенос секретов или production deployment.

## Рабочие потоки и порядок

Зависимости: foundation первого этапа → контракт/schema/credentials →
worker/adapters → Girls → полная интеграция → отдельный operator rollout.

| Поток | Вход и разрешённая область записи | Выход / завершение | Зависимости и проверка |
| --- | --- | --- | --- |
| A. Контракт | Этот план, node local publishing docs, client contract, Girls bridge docs | Точные API формы, v5 vectors, encrypted JSON field через app-pass, auth/scopes, upgrade/rollback | Первый; проверить текущий merge первого этапа и production schema baseline |
| B. Node foundation | Node localClient/socNetAccount/secret helper/migrations и focused tests/docs | Server registry/setup с identity, private credentials, frozen server binding, client exclusion | После A; API ACL/secret redaction/SQL migration tests |
| C. Worker | Node localClient worker/lifecycle и tests | Pause, bounded serial ticks, shared atomic claim/result, unknown-outcome handling | После B; restart/concurrency/timeout/disabled/source change tests |
| D. Adapters | Node provider helpers и protocol fixtures | Три bytes-based adapters с confirmed IDs и паритетом client | После A; три адаптера могут идти параллельно в разных файлах; финальная интеграция после B/C |
| E. Girls | Bridge/catalog/receipts/dialog/queue/docs и их tests | Mixed v4/v5 combined request, прежний selector, mode-correct feedback/recovery | После A; mocks можно параллельно B–D, real integration после B–D |
| F. Интеграция | Тесты и docs всех затронутых repos, общий план | Actual node/Postgres/Kubo + Girls + mock providers, client isolation, desktop/narrow evidence | Последний; реальные provider sends и production secrets запрещены |

При делегировании передать конкретную строку таблицы, локальные AGENTS и текущий
контракт. Запретить сторонние edits/merge/deployment/live sends. Общие контрактные
файлы редактирует один владелец; координатор интегрирует изменения, обновляет этот
план, ведёт issues и проверяет итог. Реализация требует tracking issues и обычных
commit/push/PR по правилам repos. Hub pointers — только после нужных base commits.

## Проверка и критерии завершения

- [ ] Setup и повтор после потерянного ответа не создают duplicate accounts/destinations; секреты write-only и отсутствуют в logs/fixtures/errors.
- [ ] Client-encrypted/import-only account не включается для server worker автоматически; generic update не обходит managed identity/secret checks.
- [ ] Secret-key loss/wrong key и смена внешней identity не вызывают отправку другим аккаунтом; token rotation того же ID работает.
- [ ] Client A/B и legacy claim не видят server jobs; server worker не видит client/legacy jobs. Другой owner не читает/меняет назначения или jobs.
- [ ] Конкурирующие node workers захватывают job один раз; pause и restart не дублируют публикацию.
- [ ] Payload/target frozen, source остаётся private; moved/public/deleted source и disabled destination проверяются до отправки.
- [ ] Bytes берутся из owned storage, arbitrary URLs/redirects не загружаются; JPEG/MIME/size/text limits соответствуют policy.
- [ ] Bluesky DID/facets/labels/images; Discord bot/channel/guild/NSFW/mentions; Telegram bot/chat/spoiler/plain caption проверены mocked tests.
- [ ] Потерянный publish response и crash после send оставляют review/processing, второй send не вызывается; потерянный DB result повторяется без публикации.
- [ ] V5 mismatched binding отклонён до source/job эффектов; v1–v4 frozen recovery, partial combined batch и downgrade не меняют намерение.
- [ ] Girls комбинирует client Twitter и server остальные сети, сохраняя один selector; missing/ambiguous targets блокируют весь новый batch до effects.
- [ ] Сроки считаются по destination; сохранённые jobs не меняются при переключении mappings.
- [ ] SQL upgrade на released schema сохраняет queued/processing/history; rollback блокируется при несовместимых server jobs/credentials.
- [ ] Node targeted tests и подходящие Docker gates, apiDoc generation, security route inventory и migration integrity проходят; известные посторонние отказы сообщены отдельно.
- [ ] Girls focused backend/frontend, обязательные Generation gates и Docker social desktop/narrow проходят; screenshot paths/manifest/viewport/content визуально сверены.
- [ ] Интеграционный сценарий использует настоящий node и storage с mock провайдерами, без реальной публикации. Client isolation проверена действующим client или его реальным worker с тестовым publisher.
- [ ] Документация содержит настройку трёх сетей, pause/unknown handling, миграцию Era of Wave, rollback и точные результаты проверок.

## Развёртывание и откат

- Node schema, API и worker поставляются согласованно, worker изначально paused.
  Existing server accounts/imports не переписываются. Учитывать, что registry
  таблица первого этапа к моменту реализации уже может быть production: её
  изменение требует upgrade migration, а не только правки model definition.
- Сначала node с v5 capability и готовыми disabled server destinations; затем
  Girls с mixed-mode receipts. Обновление client необходимо лишь при выявленном
  нарушении совместимости; новый server runtime в client не добавляется.
- Backup БД и существующего app-pass защищаются отдельно. Смена app-pass не
  выполняется молча при deploy; восстановление должно сохранять доступ к старым
  секретам и frozen account bindings.
- До downgrade остановить worker и запретить создание v5 jobs. Не запускать
  старый node binary при существующих server jobs: его прежние claim filters
  могут не обеспечивать нужное разделение. Сначала завершить/сверить очередь либо
  использовать совместимый rollback build; migration down проверяет guard.
- Переключение обратно на client требует явных новых назначений/намерений.
  История остаётся на server; неизвестные исходы не создают замену автоматически.

## Открытые решения

- Фактические Era of Wave handle/DID, bots, каналы и SFW endpoints: собрать при
  подключении; не подменять догадками или данными синтетических fixtures.
- Runtime secret helper и lifecycle подтверждены: app-pass helpers и
  `app/backgroundWorker.ts`. При A зафиксировать JSON server credentials,
  восстановление существующего app-pass и migration нового nullable TEXT поля,
  сохранив прежнюю семантику imports/isEncrypted.
- При A зафиксировать единственную v5 canonical форму, setup API, management
  scopes и manual result authorization. Producer key не должен менять secrets
  или создавать server-result с обычными enqueue правами.
- Live smoke content/destinations/count и production rollout требуют отдельной
  задачи после реализации. Критерий завершения реализации — проверенный код,
  документация и переданные PR; пользователь сохраняет право merge.

## Заметки реализации

### Аудит существующей архитектуры, 2026-11-10

Сабагент проверил provider posting/import paths; основной агент независимо
проверил scheduler lifecycle, account storage и шифрование. Выводы заменяют
предварительные варианты envelope/new-key/обязательного CLI в первой версии плана.

- Исходящая публикация уже есть в `bluesky/index.ts:502` (также update/delete),
  login/verify — там же. Но high-level cross-post читает текущий native post,
  требует публичную группу (`:1154`) и сохраняет отдельные crossPosts properties.
  Для queue переиспользуются helpers (`createBlueskySession:434`,
  `createBlueskyRecord:484`, `uploadBlueskyBlob:593`, builder `:317`), а не native-post orchestration.
- `socNetImport.publishPost` создаёт пост **в GeeSome**, а не в соцсети.
  `telegramClient` — MTProto import/login, `twitterClient` — read-only/import;
  `tgContentBot` отвечает на входящие storage-bot interactions. Готового Discord
  module и unattended Telegram Bot API queue publisher не найдено.
- `app/backgroundWorker.ts:15` уже решает nonoverlap/unref/stop. Готовый module
  wiring: `bluesky/index.ts:182–205` и `pin/index.ts:91–96`.
- `app/index.ts:726–731` предоставляет app-pass encryption; пример использования:
  `pin/index.ts:767–780`, `tgContentBot/api.ts:30–36`. `helpers.ts:454` показывает
  фактический CryptoJS механизм; новое отдельное управление master key не нужно.
- `socNetAccount` остаётся хранилищем, `PublicationDestination` — назначением,
  `PublicationJob` — единственной очередью и результатом. Изменений asyncOperation
  и autoActions для выполнения публикаций не требуется. Их самостоятельные
  очереди/повторы не должны управлять повторной отправкой PublicationJob.

Рекомендуемая раскладка новых файлов — внутри существующего localClient:

```text
localClient/
  index.ts                 # существующий compose/claim/result + server entrypoints
  cron.ts                  # startIntervalWorker, конфигурация и module stop
  serverPublisher.ts       # bounded processDueJobs и выбор адаптера
  providers/
    bluesky.ts             # snapshot wrapper над существующими node helpers
    discord.ts             # небольшой bot-token publisher
    telegram.ts            # небольшой Bot API publisher
```

Контракт фиксированной карты из трёх адаптеров:
`publish(account, frozenPayload, loadMedia) → {remoteId, remoteUrl}` и типизированная
ошибка с признаком `ambiguous`. Setup/verify выполняется отдельно. Provider helpers
владеют транспортом, serverPublisher — исполнением уже принятого job, queue module
— claim/state/result. Plugin registry, новый большой `socNetPublish` module,
своя scheduler abstraction и импорт соседнего client checkout не нужны.

- 2026-11-10: план сохранён по запросу пользователя. Проверены текущие модели,
  v4 digest, socNetAccount safe projection и client adapters; подтверждены
  ограничения server mode и private-source несовместимость старого Bluesky crossPost.
  Продуктовый код, credentials, очереди и production не менялись.
- При выполнении добавлять сюда принятые решения, issues/PR, test evidence,
  обнаруженные ограничения и оставшиеся задачи. Не оставлять их только в чате.
