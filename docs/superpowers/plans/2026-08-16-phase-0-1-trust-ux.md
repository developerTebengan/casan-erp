# Phase 0+1 Trust and Daily UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Casan ERP trustworthy and Bahasa-first: real settings, real notifications, role home dashboards, tighter Pemohon permissions, and usable tables.

**Architecture:** Add a cookie-backed `id`/`en` dictionary (`t()`), a singleton `CompanySettings` row, and a `Notification` inbox written from purchase create/approve/reject. Dashboard API returns a `home` discriminator per role. DataTable gains snippets, empty state, and sort; list pages add a card layout under `md`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Prisma 7, PostgreSQL, Vitest, Tailwind 4.

## Global Constraints

- Default locale is `id`; cookie name is `casan-locale`; values are only `id` or `en`.
- Dates and money stay `id-ID` / IDR in both languages.
- Role enums never render in the UI; use `roleLabel()`.
- No `{@html}` for purchasing or inventory action columns after Task 10.
- No fake red dot on the bell; badge is unread count or hidden.
- Demo logins only when `PUBLIC_SHOW_DEMO_LOGINS` is the string `true`.
- Production must not start if `SESSION_SECRET` is missing or equals `casan-erp-development-secret-change-in-production`.
- USER keeps `suppliers:view` for the PR form but `/suppliers` is omitted from USER nav.
- USER has no `inventory:write`, `stock:*`, `purchasing:receive`, `suppliers:write`, or `settings:write`.
- Phase 2 features (WhatsApp, routing, attachments, Excel, PO) are out of scope.
- Do not add Playwright coverage in this plan; use Vitest (`npm run test:unit -- --run`).
- Copy in UI chrome goes through `t()`; seeded data stays as stored.

### File map

| File | Responsibility |
|---|---|
| `src/lib/i18n/id.ts`, `en.ts`, `index.ts` | Dictionaries and `t()` / `roleLabel()` |
| `src/lib/stores/locale.svelte.ts` | Cookie sync |
| `src/lib/permissions.ts` | USER map, `settings:write`, nav skip `/suppliers` for USER |
| `prisma/schema.prisma` | `CompanySettings`, `Notification` |
| `src/lib/server/services/settings.service.ts` | Settings get/update |
| `src/lib/server/services/notification.service.ts` | Inbox write/read |
| `src/lib/server/auth.ts` | Fail-fast SESSION_SECRET; `changePassword` |
| `src/routes/api/dashboard/+server.ts` | Role `home` payloads |
| `src/lib/components/ui/DataTable.svelte` | Snippets, empty, sort |
| `src/lib/components/layout/Navbar.svelte` | Page title, locale toggle, real bell |

---

### Task 1: i18n core

**Files:**
- Create: `src/lib/i18n/id.ts`
- Create: `src/lib/i18n/en.ts`
- Create: `src/lib/i18n/index.ts`
- Test: `src/lib/i18n/i18n.spec.ts`

**Interfaces:**
- Consumes: `UserRole` from `$lib/types`
- Produces: `export type Locale = 'id' | 'en'`; `export function t(key: string, locale: Locale, vars?: Record<string, string | number>): string`; `export function roleLabel(role: UserRole, locale: Locale): string`; `export function parseLocale(value: string | undefined | null): Locale`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { t, roleLabel, parseLocale } from './index';

describe('i18n', () => {
	it('parses locale with id default', () => {
		expect(parseLocale(null)).toBe('id');
		expect(parseLocale('en')).toBe('en');
		expect(parseLocale('fr')).toBe('id');
	});

	it('interpolates and falls back to id then key', () => {
		expect(t('notify.waiting', 'id', { prNumber: 'PR-1' })).toContain('PR-1');
		expect(t('notify.waiting', 'en', { prNumber: 'PR-1' })).toContain('PR-1');
		expect(t('does.not.exist', 'en')).toBe('does.not.exist');
	});

	it('never returns raw role enums', () => {
		expect(roleLabel('DEPARTMENT_HEAD', 'id')).toBe('Kepala Departemen');
		expect(roleLabel('DEPARTMENT_HEAD', 'en')).toBe('Department Head');
		expect(roleLabel('USER', 'id')).toBe('Pemohon');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --run src/lib/i18n/i18n.spec.ts`

Expected: FAIL resolving `./index`

- [ ] **Step 3: Write minimal implementation**

`src/lib/i18n/id.ts` and `en.ts` export `Record<string, string>` including at least:

```
nav.dashboard, nav.inventory, nav.stock, nav.approvals, nav.purchasing, nav.suppliers, nav.users, nav.settings
page.dashboard, page.inventory, page.stock, page.approvals, page.purchasing, page.suppliers, page.users, page.settings, page.login
role.ADMIN, role.USER, role.DEPARTMENT_HEAD, role.FINANCE, role.MANAGER, role.DIRECTOR
auth.signIn, auth.email, auth.password, auth.demoTitle
settings.company, settings.application, settings.changelog, settings.save, settings.saved
dash.queue, dash.mine, dash.ops, dash.lowStock, dash.createPr
notify.empty, notify.waiting, notify.decided
table.empty, table.emptyHint
password.change, password.current, password.new, password.confirm, password.changed
common.logout
```

`notify.waiting` id: `PR {prNumber} menunggu Anda`; en: `PR {prNumber} is waiting on you`.

```ts
import type { UserRole } from '$lib/types';
import { id } from './id';
import { en } from './en';

export type Locale = 'id' | 'en';
const dict: Record<Locale, Record<string, string>> = { id, en };

export function parseLocale(value: string | undefined | null): Locale {
	return value === 'en' ? 'en' : 'id';
}

export function t(key: string, locale: Locale, vars?: Record<string, string | number>): string {
	const raw = dict[locale][key] ?? dict.id[key] ?? key;
	if (!vars) return raw;
	return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function roleLabel(role: UserRole, locale: Locale): string {
	return t(`role.${role}`, locale);
}
```

Add remaining chrome keys as you hit pages in later tasks; tests above must pass now.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --run src/lib/i18n/i18n.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n
git commit -m "feat: add id/en dictionary and role labels"
```

---

### Task 2: Locale cookie and toggle

**Files:**
- Create: `src/lib/stores/locale.svelte.ts`
- Modify: `src/hooks.server.ts`
- Modify: `src/app.d.ts` — add `locale: Locale` on `Locals`
- Modify: `src/lib/components/layout/Navbar.svelte`
- Modify: `.env` and `.env.example` — not required for locale
- Test: `src/lib/stores/locale.svelte.spec.ts` is optional; keep parseLocale tests as the unit gate. Manual: toggle in navbar.

**Interfaces:**
- Consumes: `parseLocale`, `Locale` from `$lib/i18n`
- Produces: `localeStore` with `value: Locale`, `init()`, `set(locale: Locale)` writing cookie `casan-locale`

- [ ] **Step 1: Extend App.Locals**

```ts
interface Locals {
  user: User | null;
  theme: 'light' | 'dark';
  locale: import('$lib/i18n').Locale;
}
```

- [ ] **Step 2: Read cookie in hooks.server.ts**

In `authHandle` (or a new `localeHandle` in `sequence` before resolve):

```ts
import { parseLocale } from '$lib/i18n';
event.locals.locale = parseLocale(event.cookies.get('casan-locale'));
```

- [ ] **Step 3: Implement localeStore**

```ts
import { parseLocale, type Locale } from '$lib/i18n';

const COOKIE = 'casan-locale';

function read(): Locale {
	if (typeof document === 'undefined') return 'id';
	const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
	return parseLocale(match?.split('=')[1]);
}

function write(locale: Locale) {
	document.cookie = `${COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export const localeStore = $state({
	value: 'id' as Locale,
	init() {
		this.value = read();
	},
	set(locale: Locale) {
		this.value = locale;
		write(locale);
	}
});
```

Call `localeStore.init()` from `AppLayout` `onMount` next to `themeStore.init()`.

- [ ] **Step 4: Navbar ID | EN toggle**

Replace the hardcoded `Casan ERP` title later (Task 10). In this task add the toggle left of the theme button:

```svelte
<div class="flex rounded-lg border border-theme text-xs font-semibold">
  <button type="button" class={localeStore.value === 'id' ? 'bg-primary-50 px-2 py-1 text-primary-700' : 'px-2 py-1 text-muted'} onclick={() => localeStore.set('id')}>ID</button>
  <button type="button" class={localeStore.value === 'en' ? 'bg-primary-50 px-2 py-1 text-primary-700' : 'px-2 py-1 text-muted'} onclick={() => localeStore.set('en')}>EN</button>
</div>
```

- [ ] **Step 5: Verify**

Run: `npm run test:unit -- --run src/lib/i18n/i18n.spec.ts`

Open `http://localhost:5173/login`, toggle EN, refresh — cookie `casan-locale=en` remains.

- [ ] **Step 6: Commit**

```bash
git add src/hooks.server.ts src/app.d.ts src/lib/stores/locale.svelte.ts src/lib/components/layout/Navbar.svelte src/lib/components/layout/AppLayout.svelte
git commit -m "feat: persist locale in casan-locale cookie"
```

---

### Task 3: Chrome translations

**Files:**
- Modify: `src/lib/permissions.ts` — `NAV_ITEMS` use keys `nav.dashboard` etc. instead of English labels
- Modify: `src/lib/components/layout/Sidebar.svelte`
- Modify: `src/routes/login/+page.svelte`
- Modify: remaining chrome that shows `user.role` raw (Navbar, Sidebar)

**Interfaces:**
- Consumes: `t`, `roleLabel`, `localeStore.value`
- Produces: nav labels via `t(item.labelKey, localeStore.value)`

- [ ] **Step 1: Change NavItem**

```ts
export type NavItem = {
  labelKey: string;
  href: string;
  permission: AppPermission;
};

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', permission: 'dashboard:view' },
  { labelKey: 'nav.inventory', href: '/inventory', permission: 'inventory:view' },
  { labelKey: 'nav.stock', href: '/stock', permission: 'stock:view' },
  { labelKey: 'nav.approvals', href: '/approvals', permission: 'approvals:view' },
  { labelKey: 'nav.purchasing', href: '/purchasing', permission: 'purchasing:view' },
  { labelKey: 'nav.suppliers', href: '/suppliers', permission: 'suppliers:view' },
  { labelKey: 'nav.users', href: '/users', permission: 'users:manage' },
  { labelKey: 'nav.settings', href: '/settings', permission: 'settings:view' }
];
```

- [ ] **Step 2: Sidebar render**

```svelte
{t(item.labelKey, localeStore.value)}
...
{roleLabel(user.role, localeStore.value)}
...
{t('common.logout', localeStore.value)}
```

- [ ] **Step 3: Login chrome**

Translate heading, placeholders, Sign in. Keep the demo box markup for Task 5; wrap its title with `t('auth.demoTitle', ...)`.

- [ ] **Step 4: Verify**

Toggle ID/EN on login and after login — sidebar and logout switch language. Role under the avatar is `Pemohon` / `Requester`, never `USER`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts src/lib/components/layout/Sidebar.svelte src/routes/login/+page.svelte src/lib/components/layout/Navbar.svelte src/lib/i18n
git commit -m "feat: translate login and sidebar chrome"
```

---

### Task 4: Company settings persist

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260816100000_company_settings/migration.sql`
- Create: `src/lib/server/repositories/settings.repository.ts`
- Create: `src/lib/server/services/settings.service.ts`
- Test: `src/lib/server/services/settings.service.spec.ts`
- Create: `src/routes/api/settings/+server.ts`
- Modify: `src/routes/(app)/settings/+page.svelte`
- Create: `src/routes/(app)/settings/+page.server.ts`
- Modify: `src/lib/permissions.ts` — add `settings:write` to `AppPermission` and ADMIN only
- Modify: `prisma/seed.ts` — upsert default settings

**Interfaces:**
- Consumes: `hasPermission(role, 'settings:write')`
- Produces: `settingsService().get(): Promise<CompanySettings>`; `settingsService().update(input): ValidationResult`

- [ ] **Step 1: Schema + SQL**

```prisma
model CompanySettings {
  id           String   @id @default("default")
  companyName  String
  email        String
  phone        String
  taxId        String
  address      String
  currency     String   @default("IDR")
  dateFormat   String   @default("DD/MM/YYYY")
  itemsPerPage Int      @default(10)
  updatedAt    DateTime @updatedAt

  @@map("company_settings")
}
```

```sql
CREATE TABLE "company_settings" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "taxId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  "itemsPerPage" INTEGER NOT NULL DEFAULT 10,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "company_settings" ("id","companyName","email","phone","taxId","address","currency","dateFormat","itemsPerPage","updatedAt")
VALUES ('default','Casan ERP Indonesia','info@casanerp.com','021-555-1234','1234567890','Jl. Sudirman No. 123, Jakarta','IDR','DD/MM/YYYY',10, NOW());
```

Run: `npx prisma migrate deploy` then `npx prisma generate`

- [ ] **Step 2: Failing validation test**

```ts
import { describe, it, expect } from 'vitest';
import { validateSettings } from './settings.service';

describe('validateSettings', () => {
	it('rejects empty company name and bad page size', () => {
		const result = validateSettings({ companyName: '', itemsPerPage: 7 });
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors.companyName).toBeTruthy();
			expect(result.errors.itemsPerPage).toBeTruthy();
		}
	});

	it('accepts 10/25/50', () => {
		const result = validateSettings({
			companyName: 'Casan',
			email: 'a@b.c',
			phone: '1',
			taxId: '1',
			address: 'x',
			currency: 'IDR',
			dateFormat: 'DD/MM/YYYY',
			itemsPerPage: 25
		});
		expect(result.valid).toBe(true);
	});
});
```

Export `validateSettings` from the service module (pure, no db).

- [ ] **Step 3: Implement service + GET/PUT**

PUT requires `settings:write`. GET requires `settings:view`. Seed upsert id `default`.

- [ ] **Step 4: Settings UI**

Load via `+page.server.ts`. Bind inputs. Remove Users and Roles tabs. Hide Save unless `hasPermission(data.user.role, 'settings:write')`. Save → `PUT /api/settings` → `toastStore.success(t('settings.saved', locale))`.

- [ ] **Step 5: Verify**

Run: `npm run test:unit -- --run src/lib/server/services/settings.service.spec.ts`

As admin, change company name, reload — name persists. As `user@casanerp.com`, no Save button.

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib/server/repositories/settings.repository.ts src/lib/server/services/settings.service.ts src/lib/server/services/settings.service.spec.ts src/routes/api/settings src/routes/(app)/settings src/lib/permissions.ts
git commit -m "feat: persist company settings and drop fake settings tabs"
```

---

### Task 5: Demo logins and SESSION_SECRET

**Files:**
- Modify: `src/lib/server/auth.ts`
- Modify: `src/routes/login/+page.svelte`
- Modify: `.env` — add `PUBLIC_SHOW_DEMO_LOGINS=true`
- Modify: `.env.example`
- Test: `src/lib/server/auth.secret.spec.ts`

**Interfaces:**
- Consumes: `process.env.SESSION_SECRET`, `process.env.NODE_ENV`, `$env/static/public` `PUBLIC_SHOW_DEMO_LOGINS`
- Produces: `assertSessionSecret()` called from `auth.ts` at module load

- [ ] **Step 1: Failing test for default secret in production**

```ts
import { describe, it, expect } from 'vitest';
import { isSessionSecretSafe } from './auth';

describe('isSessionSecretSafe', () => {
	it('rejects missing and default secret in production', () => {
		expect(isSessionSecretSafe('production', undefined)).toBe(false);
		expect(isSessionSecretSafe('production', 'casan-erp-development-secret-change-in-production')).toBe(false);
		expect(isSessionSecretSafe('production', 'a-long-random-secret')).toBe(true);
		expect(isSessionSecretSafe('development', undefined)).toBe(true);
	});
});
```

- [ ] **Step 2: Implement**

```ts
export const DEV_SESSION_SECRET = 'casan-erp-development-secret-change-in-production';

export function isSessionSecretSafe(nodeEnv: string | undefined, secret: string | undefined): boolean {
	if (nodeEnv !== 'production') return true;
	return Boolean(secret) && secret !== DEV_SESSION_SECRET;
}

if (!isSessionSecretSafe(process.env.NODE_ENV, process.env.SESSION_SECRET)) {
	throw new Error('SESSION_SECRET must be set to a non-default value in production');
}
```

Use `SESSION_SECRET = process.env.SESSION_SECRET ?? DEV_SESSION_SECRET` only after the guard.

- [ ] **Step 3: Gate demo box**

```svelte
import { PUBLIC_SHOW_DEMO_LOGINS } from '$env/static/public';
const showDemo = PUBLIC_SHOW_DEMO_LOGINS === 'true';
```

Wrap the demo accounts card in `{#if showDemo}`.

- [ ] **Step 4: Verify**

Run: `npm run test:unit -- --run src/lib/server/auth.secret.spec.ts`

Local login still shows demo list. Do not set `PUBLIC_SHOW_DEMO_LOGINS` on Vercel production.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/auth.ts src/lib/server/auth.secret.spec.ts src/routes/login/+page.svelte .env.example
git commit -m "feat: hide demo logins unless PUBLIC_SHOW_DEMO_LOGINS"
```

Do not commit `.env`.

---

### Task 6: Change password

**Files:**
- Modify: `src/lib/server/services/user.service.ts` — `changePassword(userId, current, next)`
- Create: `src/routes/api/me/password/+server.ts`
- Modify: `src/lib/components/layout/Sidebar.svelte` — modal
- Test: `src/lib/server/services/user.password.spec.ts` for validation only (min 8, mismatch)

**Interfaces:**
- Consumes: `verifyPassword`, `hashPassword`
- Produces: `POST /api/me/password` body `{ currentPassword: string, newPassword: string, confirmPassword: string }` → `{ ok: true }` or 400/401

- [ ] **Step 1: Validation test**

```ts
import { describe, it, expect } from 'vitest';
import { validatePasswordChange } from './user.service';

describe('validatePasswordChange', () => {
	it('requires 8+ and matching confirm', () => {
		expect(validatePasswordChange('old', 'short', 'short').valid).toBe(false);
		expect(validatePasswordChange('old', 'newpassword', 'other').valid).toBe(false);
		expect(validatePasswordChange('old', 'newpassword', 'newpassword').valid).toBe(true);
	});
});
```

- [ ] **Step 2: Endpoint**

401 if current password fails `verifyPassword`. 400 on validation. Hash and update `users.password` via repository. Any authenticated user, only their own id from `locals.user.id`.

- [ ] **Step 3: Sidebar modal**

Button `t('password.change')`. Fields current / new / confirm. On success toast `password.changed` and close.

- [ ] **Step 4: Verify**

Run unit test. Log in as `user@casanerp.com`, change password to `password1`, log out, log in with new password, then set it back to `password` so seed logins still work on this machine.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/user.service.ts src/lib/server/services/user.password.spec.ts src/routes/api/me src/lib/components/layout/Sidebar.svelte src/lib/i18n
git commit -m "feat: allow users to change their own password"
```

---

### Task 7: Tighten USER permissions

**Files:**
- Modify: `src/lib/permissions.ts`
- Test: `src/lib/permissions.spec.ts`
- Modify: inventory / suppliers / purchasing detail pages to hide write/receive without permission
- Modify: `navItemsForRole` to skip `/suppliers` when `role === 'USER'`

**Interfaces:**
- Consumes: existing `hasPermission` / `canAccessPath`
- Produces: USER permission list per spec; `settings:write` on ADMIN only

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { hasPermission, navItemsForRole, canAccessPath } from './permissions';

describe('USER permissions', () => {
	it('cannot write stock, inventory, receive, or settings', () => {
		expect(hasPermission('USER', 'inventory:write')).toBe(false);
		expect(hasPermission('USER', 'stock:view')).toBe(false);
		expect(hasPermission('USER', 'purchasing:receive')).toBe(false);
		expect(hasPermission('USER', 'suppliers:write')).toBe(false);
		expect(hasPermission('USER', 'settings:write')).toBe(false);
		expect(hasPermission('USER', 'purchasing:write')).toBe(true);
		expect(hasPermission('USER', 'suppliers:view')).toBe(true);
	});

	it('hides stock and suppliers from USER nav', () => {
		const hrefs = navItemsForRole('USER').map((i) => i.href);
		expect(hrefs).not.toContain('/stock');
		expect(hrefs).not.toContain('/suppliers');
		expect(hrefs).toContain('/purchasing');
		expect(hrefs).toContain('/inventory');
	});

	it('blocks /stock for USER', () => {
		expect(canAccessPath('USER', '/stock')).toBe(false);
	});
});
```

- [ ] **Step 2: Implement map + nav skip**

ADMIN array adds `'settings:write'`. USER array is only the keep-list from the spec.

```ts
export function navItemsForRole(role: UserRole): NavItem[] {
	return NAV_ITEMS.filter((item) => {
		if (item.href === '/suppliers' && role === 'USER') return false;
		return hasPermission(role, item.permission);
	});
}
```

- [ ] **Step 3: Hide buttons**

Inventory list: New / Edit / Delete only if `inventory:write`. PR detail receive block only if `purchasing:receive`. Suppliers create/delete only if `suppliers:write`.

- [ ] **Step 4: Verify**

Run: `npm run test:unit -- --run src/lib/permissions.spec.ts`

Log in as `user@casanerp.com` — no Stock Movement, no Suppliers, inventory has no delete, `/stock` → 403.

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts src/lib/permissions.spec.ts src/routes/(app)/inventory src/routes/(app)/purchasing src/routes/(app)/suppliers
git commit -m "fix: treat USER as requester not warehouse admin"
```

---

### Task 8: Role home dashboard

**Files:**
- Modify: `src/routes/api/dashboard/+server.ts`
- Modify: `src/lib/types/index.ts` — `DashboardData.home`
- Modify: `src/routes/(app)/dashboard/+page.svelte`
- Modify: `src/lib/i18n/id.ts`, `en.ts`

**Interfaces:**
- Consumes: `purchaseService().list({ awaitingApproverId, requesterId })`, product low-stock filter
- Produces: `{ home: 'queue' | 'mine' | 'ops', ... }`

- [ ] **Step 1: Discriminator**

```ts
function homeFor(role: UserRole): 'queue' | 'mine' | 'ops' {
	if (role === 'ADMIN') return 'ops';
	if (role === 'USER') return 'mine';
	return 'queue';
}
```

`queue`: `purchaseService().list({ awaitingApproverId: user.id, page: 1, limit: 20 })`. Sort overdue first in the page (compare `decisionDeadline` to today, pending only).

`mine`: purchases where `requesterId === user.id` limit 10; low-stock products limit 10.

`ops`: lowStock count, count of PENDING purchases, recent 10 PRs. Remove avg-purchase and generic four-up marketing cards.

- [ ] **Step 2: Page**

Three blocks keyed on `data.home`. Use `t('dash.queue'|'dash.mine'|'dash.ops')`. Queue rows link to `/purchasing/{id}`. Mine has `Buat PR` → `/purchasing/new?fromLowStock=1` when low stock exists.

- [ ] **Step 3: Verify**

Log in as `dept.head@casanerp.com` — queue, not product counts. As `user@casanerp.com` — my PRs. As admin — ops counts + recent PRs.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/dashboard src/routes/(app)/dashboard src/lib/types/index.ts src/lib/i18n
git commit -m "feat: role-specific dashboard home"
```

---

### Task 9: Notification inbox

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260816110000_notifications/migration.sql`
- Create: `src/lib/server/repositories/notification.repository.ts`
- Create: `src/lib/server/services/notification.service.ts`
- Create: `src/lib/server/notifications/targets.ts`
- Test: `src/lib/server/notifications/targets.spec.ts`
- Create: `src/routes/api/notifications/+server.ts`
- Create: `src/routes/api/notifications/[id]/read/+server.ts`
- Modify: purchase create + approve + reject paths to call `notificationService().notifyPurchaseEvent(...)`
- Modify: `Navbar.svelte` bell panel
- Modify: `src/routes/(app)/+layout.server.ts` to pass `unreadCount` and `waitingCount`

**Interfaces:**
- Consumes: purchase after-save fields (`id`, `prNumber`, `requesterId`, `departmentHeadId`, `financeApproverId`, `finalApproverId`, statuses)
- Produces: `targetsForPurchaseEvent(event, purchase): { userId: string, type: 'PR_WAITING' | 'PR_DECIDED', titleKey: string, bodyKey: string, params: Record<string, string>, href: string }[]`

- [ ] **Step 1: Pure targeting tests**

```ts
import { describe, it, expect } from 'vitest';
import { targetsForPurchaseEvent } from './targets';

const base = {
	id: 'p1',
	prNumber: 'PR-2026-001',
	requesterId: 'req',
	departmentHeadId: 'dh',
	financeApproverId: 'fin',
	finalApproverId: 'dir',
	departmentHeadStatus: 'PENDING',
	financeStatus: 'PENDING',
	finalStatus: 'PENDING'
} as const;

describe('targetsForPurchaseEvent', () => {
	it('notifies only the current actionable approver on create', () => {
		const targets = targetsForPurchaseEvent('created', base);
		expect(targets.map((t) => t.userId)).toEqual(['dh']);
		expect(targets[0].type).toBe('PR_WAITING');
	});

	it('notifies requester on reject and next approver on approve', () => {
		const afterDh = { ...base, departmentHeadStatus: 'APPROVED' as const };
		const approved = targetsForPurchaseEvent('approved', afterDh);
		expect(approved.some((t) => t.userId === 'req' && t.type === 'PR_DECIDED')).toBe(true);
		expect(approved.some((t) => t.userId === 'fin' && t.type === 'PR_WAITING')).toBe(true);

		const rejected = targetsForPurchaseEvent('rejected', { ...base, departmentHeadStatus: 'REJECTED' });
		expect(rejected.map((t) => t.userId)).toEqual(['req']);
	});
});
```

Actionable approver: first of DH / Finance / Final whose status is PENDING and id is non-null. If DH approved, current is Finance, etc.

- [ ] **Step 2: Schema**

```prisma
enum NotificationType {
  PR_WAITING
  PR_DECIDED
  @@map("notification_type")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  type      NotificationType
  titleKey  String
  bodyKey   String
  params    Json
  href      String
  readAt    DateTime?
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id])
  @@index([userId, readAt])
  @@map("notifications")
}
```

Add `notifications Notification[]` on `User`.

- [ ] **Step 3: Wire writes**

After successful purchase create and after approve/reject service methods, `await notificationService().createMany(targetsForPurchaseEvent(...))`.

GET `/api/notifications` returns latest 20 for `locals.user.id`, unread first. POST read sets `readAt`. Unread count: `count({ userId, readAt: null })`.

- [ ] **Step 4: Bell UI**

Remove the always-on red dot. Show a numeric badge when `unreadCount > 0`. Click bell toggles a panel. Click row → `POST .../read` then `goto(href)`. Empty copy `t('notify.empty')`. Render title with `t(n.titleKey, locale, n.params)`.

- [ ] **Step 5: Verify**

Run: `npm run test:unit -- --run src/lib/server/notifications/targets.spec.ts`

As requester create a PR assigned to dept head. Log in as dept head — bell count ≥ 1. Open it — row goes to the PR.

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib/server/notifications src/lib/server/repositories/notification.repository.ts src/lib/server/services/notification.service.ts src/lib/server/services/purchase.service.ts src/routes/api/notifications src/lib/components/layout/Navbar.svelte src/routes/(app)/+layout.server.ts src/lib/i18n
git commit -m "feat: in-app PR notification inbox"
```

---

### Task 10: Tables, cards, nav badge, page title

**Files:**
- Modify: `src/lib/components/ui/DataTable.svelte`
- Modify: `src/routes/(app)/purchasing/+page.svelte` — action snippet, empty, sort, cards
- Modify: `src/routes/(app)/inventory/+page.svelte` — same
- Modify: `src/routes/(app)/approvals/+page.svelte` — cards under md
- Modify: `src/lib/components/layout/Navbar.svelte` — page title from path
- Modify: `src/lib/components/layout/Sidebar.svelte` — waiting badge on `/approvals`
- Modify: `src/routes/(app)/+layout.svelte` — pass `waitingCount`
- Modify: list API query params `sort` + `order` for purchases and products if missing

**Interfaces:**
- Consumes: `waitingCount` from layout load (reuse `purchaseService().list({ awaitingApproverId, limit: 1 }).pagination.total`)
- Produces: DataTable `empty` snippet, `onsort`, column `render` snippet; Navbar title via `pageTitleKey(pathname)`

- [ ] **Step 1: DataTable**

- Add `empty?: Snippet`; if `!loading && rows.length === 0` render EmptyState with `t('table.empty')` / `t('table.emptyHint')` plus `empty`.
- Add `render?: Snippet<[row]>` on columns; if set, `{@render column.render(row)}` instead of `{@html}`.
- Optional `sortKey` on column; click header calls `onsort(key, nextDir)`.
- Remove `min-w-160`.
- Keep `cell` string renderer for badges until those pages move over.

- [ ] **Step 2: Purchasing and inventory actions**

Replace `actionsCell` HTML strings with a column `render` snippet containing `<a href=...>` and a delete `<button>` that sets `deleteId` (same as today). Stop putting actions through `{@html}`.

Add `sortKey: 'prNumber' | 'dateOfRequest' | 'decisionDeadline'` and `'name' | 'code' | 'stock'`. Pass through to API as `sort` and `order`.

Below `md` (`md:hidden` cards, `hidden md:block` table): card shows title, status badge, open link.

- [ ] **Step 3: Navbar title + approvals badge**

```ts
export function pageTitleKey(pathname: string): string {
	if (pathname.startsWith('/inventory')) return 'page.inventory';
	if (pathname.startsWith('/stock')) return 'page.stock';
	if (pathname.startsWith('/approvals')) return 'page.approvals';
	if (pathname.startsWith('/purchasing')) return 'page.purchasing';
	if (pathname.startsWith('/suppliers')) return 'page.suppliers';
	if (pathname.startsWith('/users')) return 'page.users';
	if (pathname.startsWith('/settings')) return 'page.settings';
	return 'page.dashboard';
}
```

Navbar h1: `{t(pageTitleKey($page.url.pathname), localeStore.value)}`.

Sidebar approvals link: if `waitingCount > 0`, a small pill with the number.

- [ ] **Step 4: Verify**

Purchasing empty filter shows empty state, not a blank table. Narrow the viewport — cards appear. Approver sees a number on Persetujuan saya. Navbar says Dasbor / Dashboard, not Casan ERP.

- [ ] **Step 5: Bump version**

Set `APP_VERSION` to `0.5.0` in `src/lib/version.ts` and add a changelog entry matching this spec’s added items.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ui/DataTable.svelte src/routes/(app)/purchasing/+page.svelte src/routes/(app)/inventory/+page.svelte src/routes/(app)/approvals/+page.svelte src/lib/components/layout src/lib/version.ts src/routes/api/purchases src/routes/api/products
git commit -m "feat: sortable tables, mobile cards, nav badges"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Locale cookie, `t()`, role labels | 1–3 |
| Settings persist, drop fake tabs, `settings:write` | 4 |
| Demo logins, SESSION_SECRET | 5 |
| Password change | 6 |
| USER permissions + hide suppliers nav | 7 |
| Role home | 8 |
| Notification inbox / real bell | 9 |
| Tables, cards, nav badge, page title, itemsPerPage left as stored setting (Task 4); lists may keep limit=10 until a follow-up using `itemsPerPage` | 10 |

Use `CompanySettings.itemsPerPage` in inventory/purchasing/stock/suppliers `limit` inside Task 4’s settings GET: pass `itemsPerPage` on the settings page load and, in Task 10, read it from `GET /api/settings` when fetching lists (fallback 10).

## Type names (do not rename later)

`Locale`, `parseLocale`, `t`, `roleLabel`, `localeStore`, `validateSettings`, `isSessionSecretSafe`, `validatePasswordChange`, `homeFor`, `targetsForPurchaseEvent`, `pageTitleKey`, `NotificationType`, `CompanySettings`.
