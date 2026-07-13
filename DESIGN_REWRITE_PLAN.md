# Vantage — План полной переработки UI/UX

> **Цель:** не скопировать Linear, а добиться того же ощущения **качества и доверия**.  
> **Референсы:** Linear (craft / trust) · Stripe Dashboard (аналитика) · GitHub (плотные данные).  
> **Анти-цель:** «ИИ-типичный» UI (фиолетовые градиенты, glow, sparkles, glass-orbs, ChatGPT-aesthetic).
>
> Документ — главный план дизайна. Продуктовый MVP-план остаётся в `DEVELOPMENT_PLAN.md`.  
> Код UI не трогаем, пока этот план не согласован.

**Статус:** design rewrite product surfaces complete (landing → auth → shell → core loop → billing → library)  
**Продукт:** Vantage (AI Market Pain Research)  
**Дата:** 2026-07-13

### Зафиксированные решения (2026-07-13)

| Вопрос | Решение |
|--------|---------|
| Accent | Signal Lime `#E8FF47` (+ teal/ok как semantic) |
| App nav | Left rail (боковая) |
| Landing nav | Top bar |
| Scope | App + landing в одном релизе; старт с лендинга |
| Fonts | IBM Plex Sans + IBM Plex Mono |
| Logo | Horizon-V mark (lime on dark) + wordmark; favicon/apple-icon обновлены |
| Язык UI | English (как сейчас) |

### Прогресс реализации

| Фаза | Статус |
|------|--------|
| Tokens (`globals.css`) | ✅ done |
| Landing header (top nav) | ✅ done |
| Landing page rewrite | ✅ done |
| Library guest header | ✅ aligned |
| Auth screens (login / signup / forgot / reset) | ✅ restyled |
| App shell left rail | ✅ restyled (Linear density) |
| Dashboard DataRow + filters | ✅ restyled (GitHub + Stripe credits) |
| New research / Progress / Report | ✅ restyled (core loop) |
| Account / Billing / Support | ✅ restyled (Stripe-calm) |
| Library index + article | ✅ restyled (GitHub list / README) |

---

## Содержание

1. [Проблема и критерий успеха](#1-проблема-и-критерий-успеха)
2. [Анализ UX-паттернов референсов](#2-анализ-ux-паттернов-референсов)
3. [Аудит текущего UI](#3-аудит-текущего-ui)
4. [Дизайн-принципы Vantage](#4-дизайн-принципы-vantage)
5. [Визуальная система](#5-визуальная-система)
6. [Адаптивность (все разрешения)](#6-адаптивность-все-разрешения)
7. [Экраны и потоки → новый UX](#7-экраны-и-потоки--новый-ux)
8. [Компонентная карта](#8-компонентная-карта)
9. [Фазы реализации](#9-фазы-реализации)
10. [Чеклист качества и anti-AI](#10-чеклист-качества-и-anti-ai)
11. [Что сознательно не делаем](#11-что-сознательно-не-делаем)
12. [Вопросы на согласование](#12-вопросы-на-согласование)

---

## 1. Проблема и критерий успеха

### Персона (из продукта)

Соло-фаундер / инди-разработчик. Одна сессия: идея → отчёт с доказательствами → решение build / pivot / don’t-build.

### Эмоция, которую должен вызывать интерфейс

| Должно ощущаться | Не должно ощущаться |
|-------------------|---------------------|
| Инструмент аналитика / research lab | «Ещё один AI-чат с красивым отчётом» |
| Точность, спокойствие, доказательность | Hype, magic, sparkles |
| «Этим пользуются серьёзные люди» | «Сгенерировано шаблоном за вечер» |
| Данные на первом плане | Декор на первом плане |

### Критерий успеха (как понять, что дизайн «сделан правильно»)

1. Убрав логотип с первого экрана, страница всё ещё выглядит как **свой** продукт (сильный brand signal через типографику, ритм, цвет акцента — не через purple glow).
2. Report читается как **доказательная записка**, а не как essay от LLM.
3. Progress выглядит как **прозрачная работа пайплайна** (Linear-agent / terminal honesty), не как «AI думает… ✨».
4. Analytics в отчёте читаются как **Stripe Dashboard**: спокойные KPI + чистые графики.
5. Списки проектов / цитат / конкурентов ощущаются как **GitHub density**: много данных, мало шума.
6. На 375 / 768 / 1024 / 1440 интерфейс не «ломается в карточки ради карточек» — меняется **композиция потока**, не только ширина колонок.
7. Слепой тест: 5 человек говорят «похоже на серьёзный продукт», а не «похоже на AI SaaS landing».

---

## 2. Анализ UX-паттернов референсов

### 2.1 Linear — основной референс «качества и доверия»

Из предоставленных скринов и публичного UX Linear извлекаем **паттерны**, не визуальный клон.

| Паттерн | Как работает у Linear | Как переносим в Vantage |
|---------|----------------------|-------------------------|
| **True dark + elevation через оттенок** | Чёрный фон, уровни `#0x`–`#1a`, почти без теней | Единая dark-поверхность для marketing + app; глубина = surface steps, не box-shadow стеки |
| **Типографическая иерархия** | Белый title / muted gray body / tiny meta | Жёсткая шкала: Display → Title → Body → Meta → Mono |
| **Цвет = смысл, не декор** | Цвет только у status, tags, редких accent-блоков | Accent только для verdict / severity / CTA; остальное нейтраль |
| **High-contrast pill CTA** | Белая кнопка на чёрном | Primary CTA = solid high-contrast; secondary = ghost border |
| **Product as proof** | Hero показывает реальный UI (board, roadmap, diff, agent) | Landing hero = живой фрагмент Report / Progress, не абстрактный orb |
| **Прозрачность процесса** | Agent log: «Searching…», «Thinking.» | Research Progress = timeline + live counters + stage log (не Lottie-магия) |
| **Social proof с bold color fields** | Лавандовый / lime quote cards на чёрном | 1–2 proof-блока с **смелым**, но не purple-AI цветом (свой accent) |
| **Технические labels** | `FIG 0.2`, file paths, IDs | `ENG`-style: project IDs, review counts, cluster codes, mono paths |
| **Плотность без хаоса** | Issue page: sidebar + body + meta + activity | Report: scroll narrative + sticky meta (score, verdict, depth) |
| **Changelog / timeline** | Тонкая линия + pips + колонки | Library / product updates / research history — тот же ритм |
| **AI как участник системы** | Agent в Assign-to, Opus в том же chrome | AI не «чатбот-виджет»; пайплайн = системные события в том же UI |

**Что не копируем:** логотип, слово «Linear», их exact radius/spacing, roadmap/gantt (у нас другой домен), agent-assign UX как feature.

### 2.2 Stripe Dashboard — референс аналитики

| Паттерн | Смысл | Применение в Vantage |
|---------|-------|----------------------|
| **KPI strip** | Крупная цифра + label + delta | Report hero: Market score, #reviews, #pain clusters, saturation |
| **Calm charts** | Тонкая сетка, один accent на series, много воздуха | Pain frequency, severity distribution, competitor coverage |
| **Filter bar** | Period / segment сверху, контент ниже | Report filters: by severity, by competitor, by source (G2/Capterra) |
| **Empty & loading honesty** | Skeleton в форме финального layout | Все analytics-блоки |
| **Numbers first** | Текст объясняет цифру, не наоборот | Opportunity size, risk flags |

### 2.3 GitHub — референс data-dense страниц

| Паттерн | Смысл | Применение в Vantage |
|---------|-------|----------------------|
| **List rows, not cards** | Строка = единица; hover highlight | Dashboard projects, competitor list, quote evidence |
| **ID + title + meta** | `ENG-2703` · status · assignee | `VAN-184` · running · 847 reviews · Standard depth |
| **Diff / evidence affordance** | Зелёный/красный = изменение; цитаты = proof | Quote blocks как «evidence hunks»; ± severity markers |
| **Mono for technical truth** | Paths, hashes, code | Source URLs, review IDs, cluster keys |
| **Search + facet filters** | Быстрый find в большом объёме | Library, dashboard, pain map filters |
| **Activity feed** | Avatar · actor · verb · time | Project activity / pipeline events |

### 2.4 Сводка: что вызывает «trust»

```
Trust = (чёткий ритм сетки)
      + (сдержанный цвет)
      + (данные видны сразу)
      + (процесс прозрачен)
      + (нет декора ради декора)
```

---

## 3. Аудит текущего UI

### 3.1 Что уже сильно (сохраняем по смыслу)

- Чёткий критический путь: Auth → Dashboard → New Research → Progress → Report → Billing
- Report как главный deliverable с секциями (pains, competitors, opportunities)
- Live progress / polling идея
- Research Library как публичный trust/SEO слой
- Credits / packs без тяжёлой admin CRUD

### 3.2 Что сейчас «ИИ-типично» (убрать / заменить)

| Проблема | Где | Почему ломает trust |
|----------|-----|---------------------|
| Primary `#d0bcff` (lavender/purple) | tokens, nav active, landing | Самый узнаваемый AI-SaaS клише |
| Glow на hover (`landing-primary-glow`) | landing | Neon/glow = generic AI |
| Energy / gradient text / float animations | landing | Декор вместо продукта |
| Typewriter gimmick | landing hero | «AI typing» троп |
| Glass panels как основной язык | landing | Переизбыток glassmorphism |
| Разрыв light shadcn (zinc) vs dark app | auth / primitives | Нецельный продукт |
| Sidebar «как у любого SaaS» | AppShell | Не плохой паттерн, но визуально шаблонный + purple active |
| Spinner / theater без «инженерной» честности | analysis theater | Риск ощущения «магии» вместо пайплайна |

### 3.3 Поверхности продукта (inventory)

| Поверхность | Маршруты | Тип UX |
|-------------|----------|--------|
| Marketing | `/`, guest library chrome | Linear landing craft |
| Auth | login / signup / forgot / reset | Minimal, same tokens |
| App shell | dashboard, research, account, support | Dense tool, Linear app density |
| Report | `/research/[id]/report` | Stripe analytics + GitHub evidence |
| Progress | `/research/[id]` | Linear agent transparency |
| Library | `/library`, `/library/[slug]` | Editorial + GitHub index |
| Billing overlays | pricing modal, success/cancel | Stripe calm |

---

## 4. Дизайн-принципы Vantage

### P1. Один продукт — одна поверхность

Marketing и app делят **одну** token-систему. Не «красивый лендинг» и «другой dashboard».

### P2. Craft > decoration

Каждый визуальный элемент отвечает на вопрос: *помогает ли принять решение или понять доказательство?* Если нет — удалить.

### P3. Evidence over essay

В отчёте цитата, частота и severity важнее абзаца GPT. UI подчёркивает **доказательный слой**.

### P4. Process over magic

Progress = стадии + счётчики + лог событий. Никаких ✨ / «AI is thinking creatively».

### P5. Density with breath

GitHub-плотность в списках; Linear-воздух в маркетинге и между секциями отчёта. Не карточки ради карточек.

### P6. Color is semantic

| Роль цвета | Использование |
|------------|---------------|
| Neutral gray scale | 90% UI |
| Brand accent (1) | CTA, key links, focus ring |
| Status | running / success / fail / warn |
| Severity | pain severity scale |
| Proof blocks | редкие full-bleed color fields на marketing |

### P7. Motion = presence, not noise

2–3 намеренных motion-паттерна на продукт (page enter, list stagger, stage advance). Без float orbs и бесконечных glow pulses. Уважать `prefers-reduced-motion`.

### P8. Responsive = reflow of intent

На мобиле не «сжать sidebar». Меняем **IA потока**: bottom/top chrome, stacked report narrative, filters → sheet.

---

## 5. Визуальная система

### 5.1 Направление (не копия Linear)

**Имя направления:** *Research Instrument* — тёмный precision-tool с редкими bold proof-surfaces.

- Фон: near-black (`#050505`–`#0A0A0A`), не фиолетово-серый `#131315` с lavender undertone
- Поверхности: 3–4 шага gray (base → raised → overlay → highest)
- Текст: near-white / muted gray / faint meta
- Border: 1px low-contrast (`white/6`–`white/10`), не тяжёлые card shadows
- Radius: умеренный (8–12px контейнеры; CTA можно fuller) — без «всё pill»
- **Уходим от purple primary**

### 5.2 Предлагаемая палитра (на согласование)

> Финальные hex утвердим в Phase 0 после одного moodboard-прохода. Ниже — рабочий черновик, заточенный под anti-AI и trust.

| Token | Черновик | Роль |
|-------|----------|------|
| `--bg` | `#050505` | Canvas |
| `--surface` | `#0E0E0E` | Panels |
| `--surface-2` | `#161616` | Raised / hover |
| `--border` | `#242424` | Dividers |
| `--text` | `#F4F4F5` | Primary text |
| `--text-muted` | `#A1A1AA` | Secondary |
| `--text-faint` | `#71717A` | Meta |
| `--accent` | `#E8FF47` **или** `#5EEAD4` | CTA / focus (выбрать одно) |
| `--accent-fg` | `#050505` | Text on accent |
| `--ok` | `#3DDC97` | Success / completed |
| `--warn` | `#F5A524` | At risk / medium |
| `--danger` | `#F07178` | Fail / critical pain |
| `--info` | `#7DD3FC` | Running / info |

**Два кандидата акцента (выбрать один в §12):**

1. **Signal Lime** (`#E8FF47`) — смелость Linear-proof blocks, очень «не AI-purple»
2. **Instrument Teal** (`#5EEAD4`) — спокойнее, ближе к data/Stripe charts

### 5.3 Типографика

Избежать Inter-as-default и «ещё один Geist clone ради галочки». Предложение:

| Роль | Шрифт | Где |
|------|-------|-----|
| UI Sans | **IBM Plex Sans** или **Satoshi** | App + marketing body |
| Display | Тот же family, weight 600–700, tracking tight | Hero, report H1 |
| Mono | **IBM Plex Mono** или **JetBrains Mono** | IDs, counts, sources, logs |

Шкала (desktop):

| Token | Size / line | Use |
|-------|-------------|-----|
| `display` | 48–64 / 1.05 | Landing hero, Changelog-like titles |
| `title-lg` | 28–32 / 1.2 | Report section heads |
| `title` | 20–22 / 1.3 | Card/section titles |
| `body` | 14–16 / 1.5 | Основной текст |
| `meta` | 12 / 1.4 | Dates, IDs, labels |
| `mono` | 12–13 / 1.4 | Technical |

### 5.4 Иконки

- UI chrome: **Lucide** (единый stroke)
- Research-specific: тонкий custom/Phosphor **без** Sparkles / Bot / Brain / Magic Wand
- Никаких emoji как иконок

### 5.5 Elevation & depth

```
Level 0: --bg
Level 1: --surface + border
Level 2: --surface-2 + border (menus, popovers)
Level 3: overlay scrim 50–60% black (modals)
```

Тени — только для floating menus (очень мягкие). Не multi-layer neon shadows.

### 5.6 Charts (Stripe language)

- Grid: hairline, low contrast
- One series accent; multi-series = discrete, not rainbow
- Tooltip: compact, mono numbers
- No 3D, no gradient fills «для красоты» (допустим мягкий fill у area с opacity ≤ 16%)

---

## 6. Адаптивность (все разрешения)

### 6.1 Breakpoints

| Name | Width | Цель |
|------|-------|------|
| `xs` | 0–379 | Малые телефоны |
| `sm` | 380–767 | Телефоны |
| `md` | 768–1023 | Планшеты |
| `lg` | 1024–1279 | Laptop |
| `xl` | 1280–1439 | Desktop |
| `2xl` | ≥1440 | Wide desktop |

Проверочные ширины QA: **375 · 390 · 768 · 1024 · 1280 · 1440 · 1920**.

### 6.2 Shell по брейкпоинтам

| | `< lg` | `≥ lg` |
|--|--------|--------|
| Nav | Top bar + sheet / drawer | Compact left rail (иконки+label) или top nav — **решить в §12** |
| Credits | В account menu / top chip | Top bar или rail footer |
| Report meta | Sticky top summary strip | Right sticky meta column |
| Filters | Bottom sheet / full-screen | Inline filter bar |
| Tables / lists | Stacked rows (title → meta below) | Multi-column rows |
| Marketing hero | Brand + 1 headline + 1 sentence + CTA; product preview below fold or simplified | Split headline / proof UI |

### 6.3 Responsive принципы по типам экранов

**Marketing (Linear-like)**  
- Первый viewport: brand, один headline, один sentence, одна CTA-группа, один dominant product visual.  
- Без stats strips и promo clutter в первом экране.  
- Testimonials / proof color blocks: 1 col → 2 col с `md`.

**Dashboard / lists (GitHub-like)**  
- Row density сохраняется; на mobile meta переносится под title, не в «карточки с тенями».  
- Filters → horizontal scroll chips или sheet.

**Report analytics (Stripe-like)**  
- KPI: 2×2 grid на mobile → 4-col на desktop.  
- Charts full-bleed width; legend сверху/снизу, не сбоку на узких экранах.

**Progress**  
- Vertical timeline всегда; log panel full width на mobile.

### 6.4 Touch & a11y

- Hit targets ≥ 44px на touch
- Focus rings = accent, 2px
- Contrast WCAG AA на text/muted
- `prefers-reduced-motion` → без stagger / без decorative motion

---

## 7. Экраны и потоки → новый UX

### 7.1 Критический путь (без изменений по смыслу)

```
Landing / Auth
  → Dashboard (история)
    → New Research
      → Progress (прозрачный пайплайн)
        → Report (доказательства + verdict)
          → Upgrade / Credits
```

Параллельно: Library (trust/SEO), Account, Support.

### 7.2 Landing `/`

**Зачем:** за 10 секунд понять ценность и довериться инструменту.

**Композиция (Linear craft, не template SaaS):**

1. **Nav** — logo wordmark, sparse links, Log in + solid Sign up  
2. **Hero** — brand-forward; headline про боль рынка / decision, не «AI-powered»; справа или ниже — **product UI fragment** (pain list + evidence), не abstract energy  
3. **How it works** — 3 шага с `FIG`-style labels + line diagrams (не 3D blobs)  
4. **Proof** — 1–2 bold color quote/metric fields  
5. **Product depth** — одна секция «внутри отчёта» (Stripe KPI + GitHub quotes)  
6. **Pricing** — спокойные packs, без firework  
7. **Footer** — плотный sitemap-grid (Linear footer density)

**Убрать:** typewriter, energy animation, purple glow, glass ради glass.

### 7.3 Auth

Минимальный shell на тех же tokens. Без иллюстраций «AI brain». Чёткие ошибки (GitHub-like alerts).

### 7.4 Dashboard `/dashboard`

**Модель:** GitHub issues list + Linear status clarity.

- Header: title + primary CTA `New research` + credits chip  
- Facets: All / Running / Completed / Failed (counts)  
- Rows: `ID` · title · status icon · depth · reviews count · date  
- Empty state: одна сильная строка + CTA (не иллюстрация-космос)

### 7.5 New Research `/research/new`

Форма как **инструмент запуска**, не wizard на 5 экранах.

- Одна колонка: idea, market hints, depth (Shallow/Standard/Deep как segmented control)  
- Справа на `lg+`: live estimate (credits, expected scope)  
- Submit = high-contrast CTA

### 7.6 Progress `/research/[id]`

**Модель:** Linear agent transparency + terminal honesty.

- Stage stepper (compact)  
- Live counters: competitors found, reviews collected, clusters  
- Event log (mono): `Collecting G2 reviews…`, `Clustered 12 pain groups…`  
- Никакого «magic theater» как главного слоя; motion только на stage change

### 7.7 Report `/research/[id]/report`

**Главный экран продукта.** Гибрид:

| Зона | Референс | Содержание |
|------|----------|------------|
| Hero / verdict | Linear + Stripe | Verdict, market score, one-sentence rationale |
| KPI strip | Stripe | Reviews, clusters, competitors, coverage |
| Pain map | GitHub list + severity | Sorted pains, frequency bars, expand → quotes |
| Evidence | GitHub diff/quote | Quote hunks with source link |
| Competitors | Dense table/list | Overlap, gaps |
| Charts | Stripe | Distribution / opportunity size |
| Opportunities / risks | Linear sections | Short, scannable |
| Sticky meta | Linear issue meta | Status, depth, credits used, export |

**Mobile:** vertical narrative; KPI 2×2; meta → sticky top; filters → sheet.

### 7.8 Library

Index = GitHub repo list / changelog rhythm.  
Article = editorial longform на той же dark-системе (не Medium-light).

### 7.9 Account / Billing / Support

Stripe-calm: цифры credits, pack history, promo — без dashboard-template cards.  
Pricing modal — тот же visual language, что landing pricing.

---

## 8. Компонентная карта

### 8.1 Foundation (Phase 0)

- Design tokens в `globals.css` (`@theme`) — полная замена `--color-v-*`
- Typography utilities
- `AppShell` rewrite
- `MarketingShell` (nav/footer)
- Button / Input / Badge / Tabs / Segmented / Tooltip / Dialog / Sheet — shadcn, **перетокенизированные**
- `StatusDot`, `SeverityBar`, `KpiStat`, `DataRow`, `EvidenceQuote`, `StageLog`, `FilterChips`

### 8.2 Pattern mapping

| Нужно | Не использовать |
|-------|-----------------|
| DataRow list | Card grid для проектов |
| KpiStat | «Stat strip с 6 градиентными плитками» |
| EvidenceQuote | Chat bubbles |
| StageLog | Sparkles loader |
| Report sections | Accordion-everything без иерархии |

### 8.3 Файлы под удар (ориентир)

Приоритетный rewrite (не полный список):

- `globals.css`, `app-shell.tsx`, `vantage-logo.tsx`
- `landing/*`, `dashboard-view.tsx`, `new-research-form.tsx`
- `research-progress-view.tsx`, `analysis-theater.tsx`, `stage-stepper.tsx`
- `report-view.tsx`, `report/*`, `report-charts.tsx`
- `library/*`, `account-view.tsx`, `support-view.tsx`, `pricing-modal.tsx`
- `auth-page-shell.tsx`, auth pages
- UI primitives / skeletons

---

## 9. Фазы реализации

> Правило: **токены → shell → core loop → marketing → polish**.  
> Не переписывать всё одним PR.

### Phase 0 — Foundation (1–2 дня)

- [ ] Утвердить accent (lime vs teal) и шрифтовую пару  
- [ ] Moodboard: 1 страница HTML/canvas с tokens + button + row + KPI + quote  
- [ ] Внедрить tokens в Tailwind v4 `@theme`  
- [ ] Базовые shadcn-компоненты на новых токенах  
- [ ] Удалить purple/glow utility classes

**Exit:** любой новый экран автоматически выглядит «Vantage instrument».

### Phase 1 — App Shell + Auth + Dashboard (2–3 дня)

- [ ] Новый `AppShell` (responsive nav)  
- [ ] Auth screens  
- [ ] Dashboard DataRow + filters + empty  
- [ ] Account credits chip

**Exit:** вход в продукт уже даёт ощущение качества.

### Phase 2 — Core loop: New → Progress → Report (4–6 дней)

- [ ] New Research form  
- [ ] Progress = StageLog + counters (замена AI-theater акцента)  
- [ ] Report layout + KPI + pain list + evidence + charts (Stripe/GitHub)  
- [ ] Sticky meta + export CTA  
- [ ] Mobile report narrative

**Exit:** критический путь визуально завершён.

### Phase 3 — Marketing + Library (2–3 дня)

- [ ] Landing по Linear craft rules (hero budget, product proof)  
- [ ] Pricing / proof blocks  
- [ ] Library index + article  
- [ ] Footer

**Exit:** публичная поверхность = тот же trust.

### Phase 4 — Billing / Support / Polish (1–2 дня)

- [ ] Pricing modal, billing success/cancel  
- [ ] Support  
- [ ] Motion pass (2–3 patterns)  
- [ ] A11y + responsive QA matrix  
- [ ] Anti-AI audit (§10)

**Exit:** ready for visual QA sign-off.

### Порядок внутри каждого экрана

1. Структура / IA  
2. Tokens & typography  
3. States: loading / empty / error / success  
4. Responsive  
5. Motion  
6. Browser QA

---

## 10. Чеклист качества и anti-AI

### Anti-AI (блокеры merge)

- [ ] Нет purple/violet как brand primary  
- [ ] Нет glow / neon outer shadows  
- [ ] Нет Sparkles / Bot / Brain / magic wand icons  
- [ ] Нет emoji-иконок  
- [ ] Нет typewriter «AI typing» hero  
- [ ] Нет gradient orbs / mesh «ради атмосферы» как главного визуала  
- [ ] Нет glassmorphism на каждом контейнере  
- [ ] Нет «AI chatbot» floating widget стиля  
- [ ] Progress не маскирует отсутствие данных анимацией

### Craft / trust

- [ ] Первый viewport marketing проходит brand test  
- [ ] Report: quote/frequency видны раньше long essay  
- [ ] Dashboard: dense rows, не card farm  
- [ ] Charts спокойные, читаемые  
- [ ] Один accent color используется последовательно  
- [ ] Mono для IDs/counts/sources

### Responsive QA

- [ ] 375, 768, 1024, 1440 — critical path  
- [ ] Нет горизонтального скролла document  
- [ ] Touch targets ок  
- [ ] Report meta доступна на mobile  
- [ ] Nav usable одной рукой на phone

### A11y

- [ ] Focus visible  
- [ ] Contrast AA  
- [ ] `prefers-reduced-motion`  
- [ ] Forms с понятными errors

---

## 11. Что сознательно не делаем

- Клон Linear pixel-perfect (лого, copy, roadmap UI)  
- Светлая «Stripe marketing» тема для всего продукта (оставляем dark instrument; Stripe = язык **аналитики**, не обязательно light theme)  
- CRUD-админка / sidebar на 10 пунктов  
- Универсальный design system ради DS (только то, что нужно потокам)  
- Отдельный «AI chat» продукт внутри Vantage  
- Переписывание backend/API ради UI  
- Одновременный light+dark theme launch (сначала один сильный dark; light — только если отдельно запросим)

---

## 12. Вопросы на согласование

Перед Phase 0 нужны ответы:

1. **Accent:** Signal Lime (`#E8FF47`) или Instrument Teal (`#5EEAD4`)?  
2. **App navigation:** компактный left rail (Linear app) или top nav (Linear marketing → app)?  
3. **Шрифты:** IBM Plex Sans + Plex Mono **или** оставить Geist / предложить Satoshi?  
4. **Язык UI:** только English (сейчас) или RU/EN?  
5. **Логотип:** сохраняем текущий wordmark Vantage с рестилем или нужен новый mark под направление?  
6. **Scope Phase 3:** лендинг переписываем в том же релизе, что и app, или app-first?

### Зафиксируем после ответов

```
Персоны → потоки → ключевые экраны → tokens → фазы
Что не делаем → anti-AI checklist
```

---

## Приложение A — Mapping референс → экран Vantage

| Vantage screen | Primary ref | Secondary ref |
|----------------|-------------|---------------|
| Landing | Linear marketing | — |
| Auth | Linear minimal | GitHub simple |
| Dashboard | GitHub issues | Linear inbox |
| New Research | Linear create issue | Stripe forms |
| Progress | Linear agent log | GitHub actions log |
| Report hero/KPI | Stripe Dashboard | Linear issue header |
| Pain / evidence | GitHub | Linear activity |
| Charts | Stripe | — |
| Library | Linear changelog | GitHub README |
| Billing | Stripe | — |

## Приложение B — Связь с `DEVELOPMENT_PLAN.md`

| Тема | Где живёт |
|------|-----------|
| Персоны, pipeline, API, data | `DEVELOPMENT_PLAN.md` |
| UI loading principles (скелеты, reduced motion) | `DEVELOPMENT_PLAN.md` §14 — **сохраняем**, обновляем визуальный язык |
| Полный visual rewrite | **этот документ** |

После согласования §12: обновить §14 `DEVELOPMENT_PLAN.md` ссылкой сюда и вычеркнуть устаревшие визуальные указания (purple, Lottie-first theater и т.д.).
