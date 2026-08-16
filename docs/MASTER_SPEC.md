Production-grade ТЗ для команди та Codex

Нижче — цілісне технічне завдання, яке можна використовувати як головний документ для розробників, дизайнерів, DevOps, QA, Quant-команди та AI/Codex-агента.

1. Важливі уточнення перед початком
1.1. Реальна затримка, а не «мікросекунди»

Внутрішній розрахунок розміру ордера можна виконувати за мікро- або субмілісекунди. Але повний цикл:

отримання стакана → розрахунок → відправлення двох ордерів → підтвердження бірж

не може стабільно працювати за мікросекунди через інтернет, затримку WebSocket, matching engine та API бірж. Наприклад, Bitget і Bybit публікують найшвидші рівні стакана приблизно з частотою 10 мс. Реалістична ціль — внутрішня реакція системи до 1–2 мс після отримання даних і десятки мілісекунд для повного циклу залежно від бірж та розташування серверів.

1.2. AI не повинен напряму керувати ордерами

LLM-агент не може бути частиною критичного execution path, оскільки він:

недетермінований;
повільніший за звичайний алгоритм;
може помилятися;
складно тестується;
не підходить для гарантування інваріантів ризику.

Архітектура повинна складатися з трьох незалежних шарів:

Quant/Strategy Engine — математично визначає можливість угоди.
Risk Engine — дозволяє або забороняє дію.
AI Assistant — пояснює рішення людині, аналізує ситуацію і формує рекомендації, але не обходить Risk Engine.

Навіть в автоматичному режимі ордери створює детермінований Execution Engine.

1.3. Особливості окремих інтеграцій

Назва Varionational найімовірніше означає Variational. Зараз Variational має публічний read-only API, а trading API ще не доступний користувачам. Крім того, котирування в публічному API можуть кешуватися до 600 секунд. Тому Variational слід додати для аналітики та фандингу, але не використовувати для автоматичного виконання угод, доки офіційний trading API не стане доступним.

Binance Alpha не можна нормалізувати простим видаленням USDT із символу. В API використовуються внутрішні ID на кшталт ALPHA_173USDT або ALPHA_118USDC, тому адаптер спочатку повинен отримувати список токенів і створювати окремий mapping.

OKX DEX — це окремий on-chain агрегатор котирувань і swap-транзакцій, а не те саме, що ф’ючерсний API біржі OKX. Його потрібно реалізувати як окремий тип venue із gas, approvals, blockchain confirmations, MEV-ризиком та статусами on-chain транзакцій.

У KuCoin старий incremental order-book stream був запланований до припинення 15 липня 2026 року. Використовувати потрібно актуальний Increment Best 500 або інший новий канал, а не стару реалізацію з попередніх прикладів API.

Для Aster відповідь HTTP 503 не завжди означає, що ордер не був виконаний: документація визначає його статус як невідомий. Після такого результату заборонено сліпо повторювати ордер — спочатку необхідно перевірити його через client order ID, open orders, fills та position reconciliation.

2. Мета продукту

Створити мультибіржову платформу для:

пошуку фандинг-арбітражу;
пошуку цінових спредів;
аналізу відхилення mark price від index price;
порівняння futures–futures;
порівняння futures–spot;
порівняння CEX–DEX;
побудови історичних графіків спреду;
розрахунку реальної вартості входу за стаканом;
ведення та контролю дельта-нейтральних позицій;
ручного, напівавтоматичного та автоматичного виконання стратегій;
пояснення рішень через AI-асистента.

Система не повинна обіцяти прибуток. Всі результати мають враховувати комісії, slippage, funding interval, різницю розмірів контрактів, затримку, ризик часткового виконання та можливу зміну фандингу.

3. Основні принципи системи
Спочатку read-only аналітика, потім торгівля.
Жодного live auto mode без paper trading і пройдених risk gates.
Жодних float або double для цін, грошей і кількості.
Кожна біржа працює через ізольований adapter.
Всі ордери мають idempotency/client order ID.
Кожна дія повністю журналюється.
Недоступні можливості біржі приховуються через capability flags.
При сумніві система не торгує.
Старі або неповні дані ніколи не вважаються актуальними.
AI не має доступу до секретів користувача.
4. Запропонована архітектура
                        ┌──────────────────────┐
                        │ CDN / WAF / DDoS     │
                        └──────────┬───────────┘
                                   │
                         ┌─────────▼──────────┐
                         │ Next.js Web App    │
                         │ Desktop / Mobile   │
                         └──────┬───────┬─────┘
                                │       │
                      REST/Auth │       │ WebSocket live data
                                │       │
                  ┌─────────────▼──┐  ┌─▼────────────────┐
                  │ Control API    │  │ Live Data Gateway │
                  │ Kotlin/Spring  │  └─────────┬─────────┘
                  └──────┬─────────┘            │
                         │                      │
           ┌─────────────▼───────────────┐      │
           │ PostgreSQL / Redis / Vault  │      │
           └─────────────────────────────┘      │
                                               │
Exchange WS/REST                               │
      │                                        │
┌─────▼───────────┐   ┌─────────────────┐   ┌──▼──────────────┐
│ Exchange        ├──►│ Normalization   ├──►│ Market Event Bus │
│ Adapters        │   │ and Validation  │   │ NATS/Redpanda    │
└─────────────────┘   └─────────────────┘   └───────┬──────────┘
                                                     │
                   ┌─────────────────────────────────┼──────────────┐
                   │                                 │              │
          ┌────────▼────────┐              ┌─────────▼──────┐  ┌────▼────────┐
          │ Spread/Funding  │              │ Time-series DB │  │ Risk Engine │
          │ Analytics       │              │ / ClickHouse   │  └────┬────────┘
          └────────┬────────┘              └────────────────┘       │
                   │                                                 │
          ┌────────▼────────┐                              ┌─────────▼────────┐
          │ Strategy Engine │─────────────────────────────►│ Execution Engine │
          └────────┬────────┘                              └─────────┬────────┘
                   │                                                  │
          ┌────────▼────────┐                              Exchange trading APIs
          │ AI Assistant    │
          │ Explanation only│
          └─────────────────┘
4.1. Рекомендований стек
Frontend
Next.js + React + TypeScript.
Власна UI-бібліотека поверх доступних headless-компонентів.
CSS variables/design tokens.
Lightweight Charts або ECharts для графіків.
Web Worker для локальних важких розрахунків.
TanStack Query для серверного стану.
Zustand або інший легкий store тільки для UI/live state.
Control Plane
Kotlin + Spring Boot.
Реєстрація, авторизація, користувачі, підписки, permissions.
REST API для історичних та користувацьких даних.
gRPC для внутрішньої взаємодії із data/execution services.
Data Plane та execution
Rust + Tokio.
Окремі асинхронні процеси для бірж.
Локальні стакани.
Нормалізація.
Розрахунки spread/depth/VWAP.
Order coordinator.
Reconciliation.
Зберігання
PostgreSQL — користувачі, конфігурація, угоди, позиції, billing.
TimescaleDB — агреговані time-series на початковому етапі.
Redis — cache, sessions, rate limiting, короткочасний live state.
ClickHouse — після зростання обсягів для історичних market-data та аналітики.
S3-сумісне сховище — архіви, backtest datasets, raw snapshots.
NATS JetStream або Redpanda — внутрішня шина подій.
Інфраструктура
Docker.
Kubernetes після появи реального навантаження; не ускладнювати локальну розробку.
Terraform.
GitHub Actions.
OpenTelemetry, Prometheus, Grafana, Loki та Sentry.

Усі версії залежностей повинні бути зафіксовані lock-файлами. Оновлення — через окремі контрольовані pull requests.

5. Структура репозиторію
/apps
  /web
  /admin-web

/services
  /control-api
  /live-gateway
  /market-data
  /analytics
  /strategy-engine
  /risk-engine
  /execution-engine
  /notification-service
  /billing-service

/packages
  /ui
  /contracts
  /api-client
  /shared-types
  /design-tokens
  /test-fixtures

/exchange-adapters
  /binance
  /binance-alpha
  /okx
  /okx-dex
  /bitget
  /gate
  /kucoin
  /aster
  /variational
  /lighter
  /bitunix
  /blofin
  /bybit
  /hyperliquid
  /mexc

/infra
  /docker
  /terraform
  /kubernetes
  /monitoring

/docs
  /architecture
  /adr
  /api
  /runbooks
  /security
  /exchange-capabilities
6. Модель біржового адаптера

Кожний адаптер повинен реалізувати однаковий інтерфейс:

ExchangeAdapter
 ├── fetchInstruments()
 ├── fetchTicker()
 ├── fetchFundingRates()
 ├── fetchMarkAndIndexPrices()
 ├── fetchOrderBookSnapshot()
 ├── subscribeOrderBook()
 ├── subscribeTrades()
 ├── subscribeFunding()
 ├── subscribeUserOrders()
 ├── subscribePositions()
 ├── validateCredentials()
 ├── fetchBalances()
 ├── placeOrder()
 ├── cancelOrder()
 ├── queryOrder()
 ├── fetchOpenOrders()
 ├── fetchPositions()
 └── reconcileState()
6.1. Capability flags

Кожна інтеграція повертає свої можливості:

MARKET_DATA
ORDER_BOOK
TRADES
MARK_PRICE
INDEX_PRICE
FUNDING_CURRENT
FUNDING_HISTORY
SPOT_TRADING
PERP_TRADING
PRIVATE_WEBSOCKET
TESTNET
BATCH_ORDERS
IOC
FOK
POST_ONLY
CLIENT_ORDER_ID
DEX_QUOTE
DEX_SWAP

UI та Strategy Engine не повинні припускати, що всі біржі мають однакові можливості.

Наприклад:

Variational: market data і funding, без live trading.
Binance Alpha: Alpha market data, окремий symbol mapping.
OKX DEX: quote/swap, без ф’ючерсного funding.
Hyperliquid: spot/perps, wallet/API-agent signing.
Lighter: окремий account index, API-key index та nonce model.
7. Нормалізація торгових пар

Це один із найважливіших модулів системи.

7.1. Канонічна модель інструменту
CanonicalInstrument
  id
  exchange
  exchangeSymbol
  baseAsset
  quoteAsset
  settlementAsset
  marketType
  contractType
  contractMultiplier
  isInverse
  tickSize
  quantityStep
  minQuantity
  minNotional
  maxQuantity
  fundingIntervalSeconds
  status
  tokenAddress
  chainId
7.2. Приклади mapping
BTCUSDT
BTC-USDT-SWAP
BTC_USDT
XBTUSDTM

Усі можуть відповідати:

baseAsset = BTC
quoteAsset = USDT
marketType = PERPETUAL

Але spot BTCUSDT і perpetual BTCUSDT — це різні інструменти.

7.3. Обов’язково врахувати
XBT → BTC.
1000PEPE — це не окремий токен, а контракт із multiplier.
kSHIB, 1000SHIB та аналогічні позначення.
Однакові тікери різних токенів на різних блокчейнах.
Pre-market та delisted інструменти.
Inverse contracts.
Різні settlement assets.
Кількість токенів в одному контракті.
USDT і USDC не можна змішувати без conversion/risk adjustment.

Для DEX токен ідентифікується насамперед через:

chainId + contractAddress

а не тільки через ticker.

7.4. USDC-маркер

Біля тікера показувати іконку USDC, якщо:

quoteAsset == USDC
або
settlementAsset == USDC

Не визначати це простим пошуком тексту USDC у назві символу.

7.5. Панель ручного mapping

Адміністратор повинен бачити:

нерозпізнані символи;
конфліктні mapping;
нові інструменти;
зміну multiplier;
зміну funding interval;
зміну tick/lot size.

Будь-яке ручне виправлення повинно зберігатися в audit log.

8. Market Data Pipeline
8.1. Основна логіка
Отримати список інструментів REST-запитом.
Побудувати canonical mapping.
Підписатися на WebSocket.
Отримати початковий snapshot стакана.
Застосовувати delta updates.
Перевіряти sequence IDs.
При gap або out-of-order:
зупинити використання стакана;
позначити його STALE;
повторно завантажити snapshot;
відновити delta stream.
Записувати:
exchange timestamp;
receive timestamp;
processing timestamp.
Вираховувати data lag.
Не передавати в Strategy Engine прострочені дані.
8.2. Стани джерела
HEALTHY
DEGRADED
STALE
RECONNECTING
RATE_LIMITED
MAINTENANCE
DISABLED

Усі таблиці мають показувати статус джерела та час останнього оновлення.

8.3. REST fallback

REST використовується для:

instrument metadata;
order-book snapshot;
funding history;
reconciliation;
відновлення після WebSocket gap.

REST не слід використовувати для постійного polling стакана, якщо біржа має стабільний WebSocket.

8.4. Rate-limit manager

Для кожної біржі вести окремо:

token bucket;
request weights;
remaining quota;
cooldown;
backoff;
jitter;
priority queue.

Найвищий пріоритет:

Order reconciliation.
Emergency hedge.
User positions.
Live order book.
Funding data.
Історичні дані.
9. Розрахунки

Усі формули повинні мати unit-тести та property-based тести.

9.1. Відхилення від індексу
markIndexDeviation =
    (markPrice - indexPrice)
    / indexPrice
    × 100%

Окремо рахувати:

lastIndexDeviation
midIndexDeviation
markIndexDeviation
9.2. Візуальний mid spread

Для ціни на біржі A та B:

midSpread =
    (midPriceB - midPriceA)
    / midPriceA
    × 100%

Цей показник не є реальною ціною входу.

9.3. Реальний executable spread

Для стратегії Long A / Short B:

entrySpread =
    (sellVWAP_B - buyVWAP_A)
    / buyVWAP_A
    × 100%

де:

buyVWAP_A — фактична середня ціна купівлі по asks на A;
sellVWAP_B — фактична середня ціна продажу по bids на B.

Рахувати для preset sizes:

$100
$500
$1 000
$5 000
$10 000
$25 000
$50 000
$100 000
9.4. Нормалізація фандингу

Для відображення еквівалента за 8 годин:

normalizedFunding8h =
    fundingRate
    / fundingIntervalHours
    × 8

Обов’язково показувати разом:

сирий funding rate;
його interval;
normalized 8h;
час наступного нарахування.

Normalized 8h є порівняльним показником, а не гарантією, що ставка збережеться.

9.5. Funding PnL

За загальноприйнятої моделі, де позитивний funding платять long-позиції:

longFundingPnl  = -longNotional × longFundingRate
shortFundingPnl =  shortNotional × shortFundingRate

netFundingPnl =
    longFundingPnl
    + shortFundingPnl

Якщо біржа має іншу семантику або формулу, адаптер повинен привести її до канонічної моделі.

Funding intervals можуть відрізнятися навіть між інструментами однієї біржі, тому їх необхідно отримувати з metadata, а не hardcode-ити як 8 годин. Bybit прямо вказує, що різні символи можуть мати різний interval.

9.6. Очікуваний чистий результат
netExpectedPnl =
    expectedFundingPnl
    + expectedSpreadConvergencePnl
    - entryTradingFees
    - exitTradingFees
    - entrySlippage
    - estimatedExitSlippage
    - spotBorrowCost
    - blockchainGas
    - quoteCurrencyRiskReserve
    - executionRiskReserve

Не показувати «прибутковість» без віднімання всіх доступних витрат.

10. Сторінки веб-додатка
10.1. Dashboard

Показувати:

найкращі opportunity;
активні позиції;
загальний unrealized/realized PnL;
funding, отриманий за день/тиждень;
стан підключених бірж;
попередження Risk Engine;
останні рекомендації AI;
системні повідомлення.
10.2. Arbitrage Scanner

Фільтри:

тип стратегії;
біржа A/B;
futures/spot/DEX;
USDT/USDC;
мінімальний funding differential;
мінімальний spread;
мінімальна ліквідність;
максимальний mark-index deviation;
час до funding;
мінімальний volume/open interest;
дозволений estimated slippage;
whitelist/blacklist токенів.

Колонки:

Token.
Venue A.
Тип ринку A.
Funding A.
Interval A.
Countdown A.
Bid/ask/mark/index A.
Venue B.
Funding B.
Interval B.
Countdown B.
Bid/ask/mark/index B.
Mid spread.
Executable spread для вибраного size.
Funding differential за 8 годин.
Estimated fees.
Expected net.
Liquidity score.
Risk score.
Data freshness.
Додати в обране.
Додати в калькулятор.
10.3. Funding Matrix — сторінка як на скріншоті

Користувач обирає дві біржі.

Для всіх спільних інструментів показати:

зірочку обраного;
тікер;
тип quote currency;
funding біржі A;
interval;
countdown;
ціну;
funding біржі B;
interval;
countdown;
ціну;
normalized funding difference;
рекомендований напрямок:
Long Binance · Short Bitunix;
estimated net funding;
кнопку калькулятора;
кнопку відкриття detail page.

Таблиця повинна:

сортуватися без перезавантаження;
віртуалізувати рядки;
оновлювати тільки змінені клітинки;
мати sticky header;
підтримувати keyboard navigation;
не покладатися лише на червоний/зелений колір.

На мобільному кожний рядок перетворюється на компактну картку.

10.4. Opportunity Detail

Верхня частина:

токен;
напрямок;
біржі;
поточний spread;
funding;
countdown;
estimated entry;
data quality;
кнопка калькулятора;
кнопка paper trade/live trade.

Графік:

mid spread;
executable spread для вибраного size;
mark/index deviations;
funding settlement markers;
entry/exit користувача;
historical mean;
standard deviation;
z-score;
estimated mean-reversion band.

Додатково:

стакани обох бірж;
depth chart;
slippage table;
historical funding;
fees;
open interest;
risk warnings;
AI recommendation.
10.5. Spread Calculator

Поля:

біржа та інструмент першої ноги;
long/short;
entry price;
size у токенах;
size у доларах;
fee;
друга нога;
live current prices;
funding events;
optional manual funding received;
exit prices або live exit estimation.

Результати:

entry spread;
live spread;
executable close spread;
gross PnL кожної ноги;
net PnL;
fees;
funding;
estimated exit slippage;
hedge ratio;
залишкова delta;
break-even exit spread;
liquidation buffer;
ROE;
PnL у USDT/USDC і відсотках.

Кнопка «Додати в калькулятор» зі scanner/detail page повинна автоматично переносити:

біржі;
токен;
напрямок;
актуальні ціни;
quote currency;
funding;
рекомендований size.
10.6. Smart Farming Agent

AI-панель постійно доступна:

на desktop — права бокова панель;
на tablet — collapsible panel;
на mobile — bottom sheet.

Стани:

NO_TRADE
WATCH
PREPARE_ENTRY
ENTER
HOLD
PREPARE_EXIT
EXIT
EMERGENCY_EXIT
DATA_UNRELIABLE

Приклад повідомлення:

Поточна різниця фандингу виглядає привабливою, але глибина Bitunix недостатня для size $20 000. Безпечний розмір входу зараз — близько $6 800. Рекомендація: зменшити size або почекати.

Або:

На даний момент немає угод із позитивним очікуваним результатом після комісій і slippage. Краще посидіти й відпочити.

Кожна рекомендація показує:

дію;
confidence;
timestamp;
використані дані;
основні причини;
ризики;
умови, за яких рекомендація зміниться.
10.7. Auto Farming

Режими:

Monitor only — тільки спостереження.
Suggest — формує пропозицію.
Confirm each action — користувач підтверджує entry/exit.
Semi-auto — автоматичне виконання після заданих умов.
Auto — повний цикл у межах дозволених лімітів.

Користувач задає:

дозволені біржі;
дозволені токени;
дозволені стратегії;
загальний capital allocation;
max size однієї позиції;
max leverage;
max slippage;
max daily loss;
max drawdown;
max number of positions;
max holding time;
min liquidity;
min expected net return;
заборону торгівлі перед maintenance;
час активності;
emergency contacts/notifications.

Auto mode не активується, поки користувач не:

підтвердив email;
увімкнув 2FA/passkey;
підключив API keys;
пройшов credential permission check;
пройшов paper mode;
встановив risk limits;
підтвердив попередження про ризики.
10.8. Portfolio та Positions

Показувати:

усі двоногі позиції як одну logical position;
окремі legs;
entry spread;
current spread;
funding received;
fees;
delta;
unrealized PnL;
liquidation distance;
статус кожного ордера;
health обох бірж;
AI recommendation;
manual close;
emergency close.
10.9. Exchange Connections

Для кожної біржі:

API key fields;
permission validation;
IP whitelist recommendation;
read-only/trading mode;
last successful connection;
server clock drift;
supported functions;
balance;
revoke/rotate credentials.
10.10. Admin Panel

Адміністратор повинен мати:

стан усіх adapters;
WebSocket lag;
rate limits;
sequence gaps;
invalid symbols;
mapping conflicts;
schema changes;
API error distribution;
order rejection rate;
користувацькі execution incidents;
глобальний kill switch;
kill switch конкретної біржі;
kill switch конкретного символу;
feature flags;
audit viewer.
11. Логіка пошуку стратегії
11.1. Futures–futures funding

Strategy Engine враховує:

funding кожної ноги;
interval;
час наступного funding;
історичну стабільність ставки;
можливість зміни funding перед settlement;
spread;
mark-index deviation;
fees;
order-book depth;
volatility;
open interest;
liquidation risk;
quote currency;
фактичний hedge ratio.

Вхід дозволяється лише якщо:

expectedFunding
- estimatedRoundTripCosts
- riskReserve
> configuredMinimumProfit
11.2. Spread convergence

Оцінювати:

історичне середнє;
standard deviation;
z-score;
median та quantiles;
half-life mean reversion;
spread duration;
structural breaks;
liquidity;
correlation;
funding impact;
mark/index anomaly.

Заборонити входити лише тому, що spread «великий». Він може бути структурним і ніколи не зійтися до нуля.

11.3. Futures–spot

Врахувати:

наявність spot balance;
borrow availability для reverse strategy;
borrow interest;
withdrawal/deposit availability;
різні quote currencies;
transfer latency;
basis;
funding;
spot liquidity.
11.4. Futures–OKX DEX

Додатково врахувати:

chain;
token contract;
gas;
approval;
quote expiry;
price impact;
routing;
blockchain confirmation time;
MEV/sandwich risk;
failed transaction cost;
bridge risk, якщо активи на різних мережах.
12. Opportunity Score

Не використовувати один простий показник funding difference.

expectedNet =
    expectedFunding
    + expectedConvergence
    - totalCosts

riskAdjustedScore =
    expectedNet
    / expectedShortfall

Додаткові penalty:

liquidityPenalty
fundingReversalPenalty
venueRiskPenalty
dataQualityPenalty
latencyPenalty
markIndexPenalty
quoteCurrencyPenalty

Вихідний результат:

{
  "action": "ENTER",
  "direction": {
    "longVenue": "Binance",
    "shortVenue": "Bitunix"
  },
  "safeSizeUsd": "6800",
  "expectedNetUsd": "17.42",
  "confidence": 0.74,
  "reasons": [],
  "risks": [],
  "expiresAt": "..."
}

Цей JSON створює Strategy Engine. AI лише перекладає його в зрозумілу користувачу мову.

13. Execution Engine
13.1. State machine позиції
PLANNED
PRECHECK
ENTERING
PARTIALLY_HEDGED
HEDGED
HOLDING
EXIT_REQUESTED
EXITING
CLOSED

DEGRADED
EMERGENCY_HEDGE
RECONCILIATION_REQUIRED
FAILED

Будь-який перехід повинен бути записаний у журнал.

13.2. Pre-trade checks

Перед кожним входом:

обидва стакани актуальні;
немає sequence gap;
clock drift у межах норми;
API keys активні;
withdrawal permission вимкнено;
balances достатні;
margin достатня;
leverage правильний;
position mode правильний;
instrument metadata актуальні;
funding не змінився критично;
spread не вийшов за limit;
estimated slippage прийнятний;
біржа не перебуває у degraded state;
немає existing conflicting position;
daily risk limits не вичерпані.
13.3. Розрахунок безпечного slice
sliceSize = min(
    remainingSize,
    safeDepthA × haircutA,
    safeDepthB × haircutB,
    maxOrderSizeA,
    maxOrderSizeB,
    userRiskLimit,
    exchangeRiskLimit
)

safeDepth — ліквідність у межах заданого max slippage.

Haircut повинен бути конфігурованим, наприклад 60–80%, щоб не розраховувати на весь видимий стакан.

13.4. Вхід

Для кожного slice:

Зробити останню перевірку стаканів.
Розрахувати aggressive limit price.
Створити унікальні client order IDs для обох legs.
Відправити IOC-ордери паралельно, якщо обидві біржі підтримують.
Дочекатися private WebSocket updates або виконати reconciliation.
Порівняти фактичні fills.
Обчислити residual delta.
Якщо imbalance допустимий — перейти до наступного slice.
Якщо imbalance перевищено:
спробувати терміново дозаповнити відстаючу ногу;
або закрити зайвий fill;
перейти в EMERGENCY_HEDGE.
Не повторювати ордер, доки його попередній статус не встановлений.
13.5. Чому не звичайний market order

Market order може пройти значно глибше очікуваного. Використовувати потрібно:

aggressive limit;
IOC;
FOK, коли це доречно;
max slippage protection;
size slicing.
13.6. Вихід

Вихід використовує ту саму двоногу логіку, але з додатковою перевіркою:

чи вже отримано потрібний funding;
чи не наближається liquidation;
чи не погіршується liquidity;
чи не виникла maintenance;
чи current net result кращий за очікування від подальшого утримання.
13.7. Dead-man switch і reconciliation

Execution Engine повинен:

періодично звіряти local state з біржею;
бачити ордери, створені поза системою;
виявляти невідповідність позицій;
не вважати timeout доказом невиконання;
після рестарту повністю відновлювати logical positions.
14. Risk Engine

Risk Engine має бути окремим сервісом і мати остаточне право заборонити угоду.

14.1. Ліміти
max capital globally;
max capital per venue;
max capital per token;
max open positions;
max leverage;
max residual delta;
max entry slippage;
max exit slippage;
max daily loss;
max drawdown;
max API errors;
max stale-data duration;
max order imbalance;
max mark-index deviation;
max quote-currency exposure;
max on-chain gas;
max position holding time.
14.2. Circuit breakers

Автоматична зупинка при:

втраті WebSocket;
stale order book;
sequence gap;
API 429/418;
неконтрольованих 5xx;
великій розбіжності mark/index;
різкій зміні funding;
різкій зміні spread;
частковому fill без hedge;
недостатній margin;
невідомому статусі ордера;
невідповідності local та exchange position;
перевищенні денного збитку.
14.3. Kill switch

Повинен існувати:

користувацький kill switch;
системний kill switch;
kill switch конкретної біржі;
kill switch конкретної стратегії;
kill switch конкретного символу.

При активації система повинна мати два режими:

припинити нові входи;
припинити входи та безпечно закрити відкриті позиції.
15. AI-асистент
15.1. Інструменти агента

AI отримує лише read-only tool calls:

поточні opportunity;
графік spread;
funding history;
current positions;
risk status;
order history;
data freshness;
strategy output;
explanations від Quant Engine.

AI не отримує:

API secrets;
private keys;
seed phrase;
прямий метод placeOrder;
можливість змінити risk limits без підтвердження користувача.
15.2. Обов’язковий формат відповіді
{
  "recommendation": "HOLD",
  "confidence": 0.81,
  "summary": "...",
  "supportingFactors": [],
  "riskFactors": [],
  "nextReviewCondition": "...",
  "dataTimestamp": "..."
}
15.3. Захист від помилок AI
Відповідь валідовується JSON Schema.
Неможливі числа відхиляються.
AI не може вигадувати біржу або позицію.
Кожний факт прив’язується до tool output.
Якщо дані застарілі, єдина допустима рекомендація — DATA_UNRELIABLE.
Якщо Strategy Engine повернув NO_TRADE, AI не може змінити його на ENTER.
16. Моделі та навчання Strategy Engine

Почати не з «магічного AI», а з прозорих моделей.

16.1. Початкова версія
rolling mean/median;
z-score;
EWMA volatility;
spread half-life;
funding persistence;
liquidity score;
order-book imbalance;
historical slippage;
deterministic rule engine.
16.2. Подальша ML-версія

Моделі можуть прогнозувати:

ймовірність збереження funding до settlement;
ймовірність convergence протягом заданого часу;
expected maximum adverse excursion;
expected slippage;
probability of safe fill;
probability of funding reversal.

Підходи:

gradient boosting;
survival analysis;
regime classification;
calibrated probability models.

Не починати з reinforcement learning на live-коштах.

16.3. Валідація

Обов’язково:

walk-forward validation;
purged time-series split;
out-of-sample periods;
fee/slippage simulation;
latency simulation;
partial-fill simulation;
delisted markets;
API outages;
funding changes;
quote-currency depeg scenarios.

Backtest без моделювання стакана та partial fills не вважається валідним.

17. Реєстрація та авторизація
17.1. Реєстрація
Email.
Password.
Прийняття умов.
Створення inactive account.
Надсилання шестизначного коду.
Код зберігається лише в hashed form.
TTL — приблизно 10 хвилин.
Обмеження кількості спроб.
Resend cooldown.
Після підтвердження — активувати account.
17.2. Login
Argon2id password hashing.
HttpOnly, Secure, SameSite cookies.
Session rotation.
CSRF protection.
Rate limiting.
Suspicious login detection.
Перегляд активних сесій.
Можливість завершити всі сесії.
17.3. Forgot password
Користувач вводить email.
Завжди повертати однакову відповідь, щоб не розкривати наявність акаунта.
Надіслати single-use code або link.
Обмежений TTL.
Після зміни пароля завершити старі сесії.
Сповістити користувача email-повідомленням.
17.4. Посилений захист

Для live trading обов’язкові:

TOTP 2FA або passkey;
повторне підтвердження перед підключенням trading API;
повторна авторизація перед зміною risk limits;
email notification про новий API key або новий пристрій.
18. Зберігання API-ключів і wallet security
18.1. CEX API keys
Envelope encryption.
Master key у KMS/HSM.
Окремий data-encryption key на користувача або credential.
Secrets ніколи не логуються.
Secrets не повертаються frontend після збереження.
API key повинен бути без withdrawal permission.
IP whitelist.
Ротація ключів.
Окремі ключі для read-only і trading.
Decryption лише в execution worker у момент використання.
18.2. DEX

Бажаний варіант:

non-custodial signing у wallet користувача;
session keys із обмеженням суми та часу;
smart-account spending limits.

Для server-side автоматизації:

MPC/HSM;
окремий trading wallet;
ліміт капіталу;
allowlist контрактів;
allowlist токенів;
заборона довільних transaction payload;
transaction simulation перед підписанням.

Seed phrase ніколи не повинна надсилатися на сервер.

19. Підписки та crypto billing skeleton

Створити абстракцію:

BillingProvider
 ├── createCheckout()
 ├── createCryptoInvoice()
 ├── getPaymentStatus()
 ├── cancelSubscription()
 ├── handleWebhook()
 └── grantEntitlements()
19.1. Моделі
Plan
Subscription
Invoice
PaymentIntent
CryptoPaymentAddress
BlockchainTransaction
Entitlement
WebhookEvent
19.2. Стани платежу
CREATED
AWAITING_PAYMENT
SEEN_ONCHAIN
PENDING_CONFIRMATIONS
CONFIRMED
UNDERPAID
OVERPAID
EXPIRED
FAILED
REFUNDED
19.3. Entitlements

Наприклад:

FREE:
  delayed data
  limited exchanges
  limited favorites

PRO:
  real-time scanner
  charts
  alerts
  calculator
  advanced filters

TRADER:
  API connections
  paper trading
  semi-auto execution

AUTO:
  automated strategies
  advanced risk controls
  priority infrastructure

Webhook-и повинні бути idempotent. Права доступу видаються лише після підтвердження платежу.

20. Навігація та дизайн
20.1. Sidebar як у ChatGPT

Розгорнутий стан приблизно 260–290 px, згорнутий — близько 68–76 px.

Групи:

Overview
  Dashboard

Markets
  Arbitrage Scanner
  Funding Matrix
  Spread Charts
  Favorites

Tools
  Spread Calculator
  Strategy Lab
  Alerts

Trading
  Smart Agent
  Auto Farming
  Positions
  History

Account
  Exchanges
  Subscription
  Security
  Settings

У нижній частині:

avatar;
plan;
settings;
collapse button.
20.2. Візуальний стиль

На основі скріншота:

дуже темний background;
світлі основні тексти;
muted secondary text;
тонкі розділювачі;
tabular numerals;
зелений для позитивних значень;
червоний для негативних;
помаранчевий для spread/opportunity;
жовтий для favorites;
невеликі статусні іконки.

Не використовувати надмірну кількість glow, gradients або важких 3D-ефектів.

20.3. Анімації
120–220 мс.
Тільки transform та opacity для основних переходів.
М’яке оновлення чисел.
Highlight клітинки при зміні.
Sidebar transition.
Skeleton loaders.
prefers-reduced-motion.
20.4. Responsive behavior

Desktop:

sidebar;
повна таблиця;
AI panel праворуч;
два стакани поруч.

Tablet:

sidebar collapsed;
частина колонок прихована;
AI у drawer.

Mobile:

sidebar як overlay;
scanner у картках;
графік fullscreen;
AI як bottom sheet;
головні дії закріплені знизу.
21. Оптимізація для слабких пристроїв
Віртуалізація великих таблиць.
Не рендерити весь стакан у DOM.
Batch UI updates раз на 100–250 мс.
На неактивній вкладці зменшувати частоту оновлень.
Lazy-load графіків.
Dynamic import важких модулів.
Web Worker для VWAP та калькулятора.
Canvas замість тисяч DOM-елементів.
Downsampling історичних графіків.
Не пересилати браузеру кожну raw order-book delta.
Передавати користувачу тільки потрібні агреговані дані.
Memoization клітинок.
Compression для WebSocket payload.
Bundle budgets у CI.

Орієнтовні цілі:

initial JS без графіків — мінімально можливий;
LCP до 2,5 секунди на слабкому мобільному пристрої та 4G;
interaction без блокування main thread понад 50 мс;
live UI update p95 до 250 мс після обробки сервером;
processing market event p99 до 10 мс;
execution decision in-process p99 до 2 мс.
22. Безпека та захист від перевантаження
22.1. Edge protection
CDN.
WAF.
DDoS protection.
Bot management.
Rate limiting за IP, account, session і endpoint.
Географічні та ASN-based правила за потреби.
Challenge для підозрілих login/register запитів.
22.2. Application security
RBAC.
Least privilege.
CSP.
HSTS.
CSRF.
XSS sanitization.
SQL injection protection.
SSRF protection.
Secure headers.
Dependency scanning.
Secret scanning.
SAST/DAST.
Audit logs.
Immutable security events.
22.3. Load shedding

При перевантаженні пріоритет:

Risk та emergency execution.
Reconciliation.
Existing positions.
Live paid users.
Scanner.
Historical charts.
Non-authenticated traffic.

Якщо real-time pipeline перевантажений, краще показати кешовані дані зі статусом STALE, ніж видавати їх за live.

23. Тестування API бірж
23.1. Для кожного адаптера

Створити:

unit tests;
schema tests;
recorded fixtures;
WebSocket replay tests;
snapshot/delta reconstruction tests;
authentication tests;
rate-limit tests;
error mapping;
reconnect tests;
time-sync tests;
precision tests;
live canary monitor.
23.2. Обов’язкові fault scenarios
duplicate message;
missing message;
out-of-order update;
malformed JSON;
new unknown field;
missing required field;
zero price;
negative size;
timestamp in future;
stale funding;
API 429;
API 418;
API 403;
API 500;
API 503 with unknown order state;
WebSocket reconnect;
subscription rejection;
maintenance;
symbol delisting;
partial fill;
one leg filled, another rejected;
timeout after order placement;
server restart during execution.
23.3. Contract monitoring

Щоденно запускати automated canary:

отримати instruments;
отримати funding;
підписатися на один order book;
перевірити формат;
перевірити timestamp;
порівняти REST і WebSocket;
сповістити команду про schema drift.

Не використовувати production money у CI.

24. QA-стратегія
24.1. Рівні тестів
Unit.
Property-based.
Component.
API integration.
Exchange contract.
End-to-end.
Load.
Soak.
Chaos.
Security.
Visual regression.
Accessibility.
24.2. Критичні property-based перевірки
PnL двох протилежних legs.
Відсутність ділення на нуль.
Decimal precision.
Hedge ratio.
Contract multiplier.
Inverse contracts.
Funding interval conversion.
USDC/USDT separation.
VWAP monotonicity.
Slippage не зменшується при збільшенні size за незмінного стакана.
Розмір ордера завжди кратний quantity step.
Ціна завжди кратна tick size.
Ніколи не перевищується risk limit.
25. Observability

Для кожної біржі збирати:

WebSocket status;
reconnect count;
message rate;
receive lag;
processing lag;
stale instrument count;
sequence gap count;
REST errors;
rate-limit usage;
funding freshness;
order placement latency;
acknowledgment latency;
fill latency;
rejection rate;
unmatched fills;
reconciliation mismatches.

Для execution:

fill ratio;
paired fill imbalance;
actual slippage;
estimated vs actual slippage;
residual delta;
emergency hedge count;
manual intervention count.

Кожний incident повинен мати correlation ID, але не містити секретів.

26. Послідовність розробки
Фаза 0 — Discovery та API audit

Результат:

capability matrix усіх бірж;
перевірені офіційні API;
список доступних testnet;
mapping символів;
rate limits;
order types;
funding semantics;
ADR щодо архітектури;
threat model.

Без цього не починати auto execution.

Фаза 1 — Foundation

Реалізувати:

monorepo;
CI;
environments;
design system;
sidebar;
реєстрацію;
email verification;
login;
forgot password;
sessions;
profile/security;
базові database migrations;
observability.
Фаза 2 — Read-only market data

Спочатку інтегрувати 3–4 біржі:

Binance;
OKX;
Bybit;
Bitget або Bitunix.

Реалізувати:

instruments;
funding;
prices;
order books;
normalization;
health monitoring;
live gateway.

Тільки після стабільної роботи додавати інші біржі.

Фаза 3 — Scanner та Funding Matrix

Реалізувати:

таблицю як на скріншоті;
фільтри;
normalized funding;
countdown;
USDC markers;
favorites;
sorting;
responsive mobile cards;
data freshness.
Фаза 4 — Charts та Calculator

Реалізувати:

spread time-series;
executable spread;
historical funding;
entry/exit markers;
calculator;
quick-add;
fees/slippage;
export.
Фаза 5 — Strategy Engine

Реалізувати:

deterministic scoring;
NO_TRADE;
funding strategy;
convergence strategy;
risk-adjusted ranking;
backtesting;
historical validation.
Фаза 6 — AI Assistant

Підключити AI тільки після появи надійного Strategy Engine.

AI:

пояснює результати;
аналізує поточну сторінку;
відповідає щодо позиції;
не має trading tool;
не змінює числові рішення engine.
Фаза 7 — Paper Trading

Реалізувати симулятор:

order-book fills;
latency;
partial fills;
fees;
funding;
slippage;
liquidation;
outages.

Користувач повинен мати історію paper trades та порівняння з очікуваннями.

Фаза 8 — Manual і semi-auto execution

Почати лише з 1–2 найстабільніших бірж.

Реалізувати:

credential vault;
permissions check;
order placement;
paired execution;
reconciliation;
emergency hedge;
kill switch;
full audit.
Фаза 9 — Auto mode

Увімкнути після:

security audit;
penetration test;
тривалого soak test;
контрольованого beta;
достатньої кількості paper/live telemetry;
перевірки risk model;
incident runbooks.
Фаза 10 — Billing та масштабування
entitlements;
crypto billing provider;
usage limits;
autoscaling;
ClickHouse;
multi-region read infrastructure;
dedicated execution regions.
27. Розподіл завдань між командами
Архітектор / Tech Lead
ADR.
Service boundaries.
Domain model.
API contracts.
Security model.
Code review standards.
Execution invariants.
Incident design.
UI/UX команда
Information architecture.
Sidebar.
Scanner.
Funding Matrix.
Charts.
Calculator.
Position states.
AI panel.
Mobile layouts.
Design system.
Accessibility.
Loading/error/stale states.
Frontend команда
Next.js app.
Live WebSocket client.
Virtualized table.
Charts.
Calculator.
Responsive UI.
Auth screens.
Error boundaries.
Performance budgets.
E2E tests.
Backend Control команда
Users.
Sessions.
Verification.
Password recovery.
Exchange connections.
Billing.
Entitlements.
Audit.
Admin API.
Notifications.
Market Data команда
Adapters.
Symbol normalization.
Local order books.
Data validation.
Event bus.
Time-series.
Health monitoring.
Rate-limit control.
Quant команда
Spread formulas.
Funding normalization.
Opportunity scoring.
Mean-reversion models.
Slippage models.
Backtester.
Walk-forward validation.
Strategy reports.
Execution команда
Order coordinator.
Paired execution.
Slicing.
IOC/FOK.
Client order IDs.
Partial fills.
Reconciliation.
Emergency hedge.
Kill switches.
Security команда
Threat model.
KMS/HSM.
API-key vault.
Authentication review.
WAF/rate limits.
SAST/DAST.
Pentest.
Incident response.
QA команда
Test matrix.
Exchange fixtures.
Fault injection.
Visual regression.
Load/soak.
Chaos tests.
Mobile/browser testing.
Release certification.
DevOps/SRE
CI/CD.
Infrastructure.
Secrets.
Monitoring.
Alerts.
Backups.
Disaster recovery.
Deployment rollback.
Runbooks.
Capacity testing.
28. Definition of Done

Функція вважається готовою лише якщо:

є опис вимог;
є типізований API contract;
є unit tests;
є integration tests;
є error/loading/empty/stale states;
є mobile layout;
перевірена accessibility;
додані logs та metrics;
немає secrets у логах;
додана документація;
пройдений code review;
пройдені security checks;
не порушені performance budgets;
є rollback plan;
для exchange-функцій існують recorded fixtures;
для trading-функцій існує reconciliation;
критична дія має audit log.
29. Жорсткі інструкції для Codex-агента

Codex повинен дотримуватися таких правил:

Не створювати весь продукт одним великим commit.
Перед реалізацією кожного модуля створювати короткий plan.
Не вигадувати exchange endpoints.
Використовувати тільки перевірену офіційну документацію.
Не hardcode-ити funding interval.
Не hardcode-ити symbol mapping.
Не використовувати floating-point числа для фінансів.
Не логувати keys, secrets, signatures або повні payload приватних запитів.
Не створювати blind retry для order placement.
Після timeout або 5xx спочатку виконувати reconciliation.
Кожний exchange adapter ізолювати за спільним інтерфейсом.
Кожний adapter забезпечувати fixtures і contract tests.
Не давати AI прямий trading tool.
Не дозволяти обхід Risk Engine.
Не показувати stale data без явної позначки.
Не змішувати USDT та USDC.
Не створювати auto mode раніше paper trading.
Не залишати TODO у security, execution та reconciliation paths.
Усі зміни database schema виконувати через migrations.
Усі критичні архітектурні рішення документувати як ADR.
Після кожної фази запускати unit, integration, E2E, load та security checks.
Live trading feature за замовчуванням повинен бути вимкнений через feature flag.

Кінцевий продукт має працювати за принципом:

Краще пропустити потенційну угоду, ніж відкрити незбалансовану або неконтрольовану позицію.

30. Approved future product-capability amendment — 2026-07-26

This section is authoritative where it refines the earlier phase order and
position/notification/Telegram scope. It does not reopen frozen Phase 1 or Phase
2A.1 and does not authorize implementation. The detailed contracts are in:

- `POSITION_MANAGEMENT.md`;
- `NOTIFICATION_ARCHITECTURE.md`;
- `TELEGRAM_INTEGRATION.md`;
- ADR 0005.

30.1 Spread-position management

The future product supports:

- manually entered and watch-only positions;
- paper positions;
- authenticated exchange-synchronized read-only positions;
- system-executed positions;
- two-leg positions with an extensible multi-leg model.

Every leg uses canonical venue, product group, official instrument, market type,
and settlement identity. Display symbol is not identity. Position facts and
valuations preserve long/short direction, exact entry/current executable prices
and quantities, entry/current spread, spread PnL, funding PnL, fees,
estimated/realized slippage, net PnL, residual delta, supported liquidation
buffer, targets, state history, quality, reconciliation, notes, and alert
subscriptions.

The approved lifecycle vocabulary is:

DRAFT, WATCHING, ENTRY_PROPOSED, ENTERING, PARTIALLY_HEDGED, HEDGED,
HOLDING, EXIT_PROPOSED, EXITING, CLOSED, DEGRADED, EMERGENCY_HEDGE,
RECONCILIATION_REQUIRED, FAILED.

Tracking, paper, synchronized read-only, and live modes expose only their
applicable states. Read-only synchronization never grants order authority.
Unknown financial components remain unknown, and stale/gapped inputs suppress
executable valuation.

30.2 Spread alerts and notifications

The future alert domain covers anomalous spreads, entry opportunities,
convergence/exit, executable thresholds by size, funding differential/change/
settlement, expected net, position PnL, residual delta, liquidation buffer,
stale/degraded venues, partial fills, reconciliation, and emergency risk.

Rules may be user- or system-defined and support canonical token/instrument,
venue-pair, and strategy filters; threshold direction; minimum duration;
cooldown; hysteresis; deduplication; grouping; quiet hours; severity; expiry;
mute/pause; and channel preferences.

The notification model separates Notification, NotificationRecipient,
NotificationPreference, NotificationTemplate, NotificationDelivery,
NotificationAction, DeliveryOutbox, DeliveryAttempt, AlertRule,
AlertEvaluation, AlertOccurrence, and AlertSuppressionState. Future delivery
channels are IN_APP, TELEGRAM_PRIVATE, TELEGRAM_CHANNEL, EMAIL, and WEB_PUSH.

Delivery uses a transactional outbox, stable idempotency, bounded exponential
retry, dead-letter state, provider rate-limit handling, deduplication, optional
message editing, and delivery audit. Provider failure never changes the source
position, alert, risk, reconciliation, or execution state.

30.3 Telegram surfaces

The public Telegram channel is limited to non-personal analytics, data
degradation, general notices, and educational updates. It never publishes user
identity, private positions, balances, account PnL, credentials, private alerts,
or executable account actions.

The private bot supports future personal notifications, summaries, alerts,
system status, read-only tracking, Phase 5 paper controls, and only later
strictly controlled live previews/confirmations. Planned commands are `/start`,
`/status`, `/positions`, `/position`, `/alerts`, `/mute`, `/unmute`, and
`/help`.

The Telegram Mini App is a client of the same backend. It may render
opportunities, positions, charts, executable spread by size, venue books,
funding, legs, calculator, PnL, history, alert configuration, paper previews,
and later live preview/confirmation/history. It reuses shared contracts, design
tokens, validation, and components where practical. It owns no financial
business logic.

30.4 Account linking and Mini App authentication

The user must first have a platform account. The authenticated website creates a
single-use, short-lived, purpose-bound linking token. The backend validates its
digest, TTL, use state, environment, user state, and conflicts before binding a
verified Telegram stable user ID to internal user ID. Telegram username is
display-only. Link/unlink is audited and notified in-app/email. Changing the
linked Telegram identity disables Telegram trading controls.

Mini App initialization data is verified server-side using then-current official
Telegram rules. Unsigned, expired, replayed, unlinked, or cross-environment data
is rejected. The backend issues a short-lived platform session and never trusts
frontend-provided Telegram identity claims.

30.5 Command-security boundary

The mandatory future path is:

Telegram Bot or Mini App
→ Telegram Gateway
→ authenticated internal command
→ authorization
→ current-state validation
→ fresh market-data validation
→ Risk Engine when applicable
→ execution preview
→ explicit user confirmation
→ Execution Engine
→ exchange adapters
→ reconciliation
→ user notification.

Telegram is presentation/command ingress only. The Gateway does not calculate
strategies, own financial state, access exchange secrets, call exchange adapters
directly, or bypass risk. Every action is idempotent. Critical callbacks are
single-use, short-lived, state-bound, and invalid from old/superseded messages.
Material market changes expire previews; final execution revalidates price,
liquidity, position, reconciliation, authority, and risk. High-notional actions
support passkey/2FA/web reauthentication. Telegram-specific limits cannot exceed
system limits, and Telegram cannot raise risk limits. Telegram availability
never blocks emergency risk handling or reconciliation.

30.6 Superseding roadmap order

The implementation sequence after frozen Phase 2A.1 is:

1. Phase 2A.2 — OKX Exchange V5 Swap/Futures public adapter;
2. Phase 2A.3 — Binance USDⓈ-M Futures public adapter;
3. Phase 2A.4 — Bybit V5 `linear` public adapter;
4. Phase 2B — Spread Analytics Core;
5. Phase 2C — Alerts and Notification Foundation;
6. Phase 3 — Identity, Accounts and Telegram Linking;
7. Phase 4 — Position Workspace;
8. Phase 5 — Paper Trading with Telegram Controls;
9. Phase 6 — Authenticated Read-only Exchange Synchronization;
10. Phase 7 — Manual and Semi-automatic Live Execution;
11. Phase 8 — Controlled Automatic Farming.

`ROADMAP.md` contains the phase deliverables, non-goals, dependencies, and
acceptance criteria. Passing one phase never authorizes the next.

## 31. Product design, commerce, and administration amendment

This amendment is architecture-only. It does not authorize application,
database, provider, identity, payment, admin or UI implementation and does not
change the frozen Phase 2A or Phase 2B architecture boundaries.

Authoritative future-design documents are:

- `DESIGN_SYSTEM.md` and `THEME_ARCHITECTURE.md` for HolyParser visual language,
  accessibility, responsive behavior and `SYSTEM`/`DARK`/`LIGHT` preference;
- `PRODUCT_INFORMATION_ARCHITECTURE.md` for public, authenticated, personal
  billing and separate `/admin` surfaces;
- `SUBSCRIPTION_AND_ENTITLEMENTS.md` for entitlement-first access and the
  provider-neutral subscription lifecycle;
- `PROMOTION_ENGINE.md`, `PAYMENT_ARCHITECTURE.md` and
  `CRYPTO_PAYMENT_ARCHITECTURE.md` for server-authoritative commerce;
- `ADMIN_CONSOLE.md` for permission-based privileged operations, step-up,
  optional dual control and append-only audit;
- ADR-0010 through ADR-0012 for the binding access, provider and admin
  boundaries.

Plans are commercial bundles and never feature-authorization strings. Effective
entitlements are derived from source-backed grants with provenance, validity,
revocation and audit. Neither a browser nor a payment redirect grants access.
Fiat and crypto providers supply verified evidence through isolated ports;
reconciliation handles missing, duplicate, reordered and unknown outcomes.
Crypto asset/network identity is explicit and custody/private keys remain
outside the main application.

The `/admin` surface is a separate control plane. There is no global `isAdmin`
shortcut: independent permissions, stronger sessions, reasoned/idempotent
commands and append-only audit are mandatory. Financial totals remain separated
by currency unless an explicit versioned conversion is present.

The roadmap introduces future Design (D1–D6), Identity/Admin (I1–I4) and
Commerce (C1–C8) tracks. They require separate product-owner approval, may run
only according to their recorded dependencies, and do not add commerce to Phase
2B Spread Analytics Core.
