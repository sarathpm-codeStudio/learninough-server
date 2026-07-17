# Course GST Pricing Setup

> **Project:** LMS Platform (Learninough)
> **Last Updated:** July 2026 (bundles now on the GST model with both discount modes)
> **Purpose:** Single reference for how course prices, GST, discounts, coins and
> platform offers work — shared by the **admin dashboard**, **faculty dashboard**
> and **server (Lambda)** repos. Keep all three copies identical.
> Related: `enrollment-payout-workflow.md` (payout math, §9 admin-funded discounts).

---

## 1. The Model in One Picture

```
faculty enters base (exclude_price, NO GST)          ₹5,000
sticker price = base + GST                           ₹5,900   ← students see this

faculty discount applies per discount_mode (§2):
  EXCLUSIVE_GST → off the ₹5,000 base, GST on rest → student pays ₹4,956
  INCLUSIVE_GST → off the ₹5,900 sticker           → student pays ₹5,100

at checkout, coins / platform offers reduce the payable further (§6)
GST inside whatever is finally paid = payable × gst/(100+gst)
```

**Rules:**
1. Faculty always enters prices **WITHOUT GST**. GST goes on top.
2. Students only ever see **GST-inclusive** prices.
3. GST is owed only on money actually charged — always extracted from the final
   payable: `gst = payable × gst% / (100 + gst%)`.
4. Faculty-funded discounts (own discount, coupon codes) reduce the faculty
   payout. Admin-funded discounts (coins, platform offers) do **not** — see §7.

---

## 2. The Two Discount Models (`courses.discount_mode`)

The faculty picks the model per course with a toggle on the pricing screen
("Apply discount on GST-inclusive price"). **INCLUSIVE_GST is the platform
default** — the toggle starts ON for new courses, and all pre-July-2026 courses
were migrated to it (migration `default_discount_mode_inclusive_gst`). Note:
percentage discounts produce identical final prices in both modes (×(1+gst)
distributes); only flat discounts differ.

| | `EXCLUSIVE_GST` (toggle OFF) | `INCLUSIVE_GST` (**default**, toggle ON) |
|---|---|---|
| Discount applies to | ex-GST base (₹5,000) | GST-inclusive sticker (₹5,900) |
| final_price | `round((base − d) × (1+g))` | `round(base × (1+g)) − d` |
| Example (₹800 flat) | (5000−800)×1.18 = **₹4,956** | 5900−800 = **₹5,100** |
| GST inside final | ₹756 | 5100×18/118 = ₹777.97 |
| Taxable value | ₹4,200 | ₹4,322.03 |
| Student saves | ₹944 (discount + its GST) | ₹800 (exactly the discount) |
| Faculty payout base (no coins) | 4,200 | 4,322.03 |

Percentage discounts follow the same rule: the % applies to the base in
EXCLUSIVE_GST and to the sticker price in INCLUSIVE_GST.

`discount_mode` is a **separate column** from `discount_type`
(flat/percentage) — mode says *what the discount applies to*, type says *how
the value is expressed*.

---

## 3. Configuration (`platform_settings`)

| key | value | meaning |
|---|---|---|
| `gst_percent` | `'18'` | GST rate applied to all course sales |
| `default_commission_percent` | `'20'` | admin commission fallback (per-faculty override: `profiles.commission_rate`) |
| `default_coin_value` | `'3'` | 1 coin = ₹3 at redemption |

**Changing the GST rate:** update the `gst_percent` row — nothing else. The DB
trigger `trg_gst_percent_recalc_prices` automatically calls
`recalculate_gst_inclusive_prices()`, which rebuilds `price` and `final_price`
for **every course and bundle** from `exclude_price`, respecting each course's
and bundle's `discount_mode`. Repeated recalcs never drift because they always
start from the untouched base.

---

## 4. Course Price Fields (`courses` table — values in RUPEES)

| column | meaning | example (EXCLUSIVE) | example (INCLUSIVE) |
|---|---|---|---|
| `exclude_price` | faculty-entered base WITHOUT GST — **source of truth** | 5000 | 5000 |
| `discount_type` | `'flat'` or `'percentage'` | flat | flat |
| `discount` | discount value (₹ if flat, % if percentage) | 800 | 800 |
| `discount_mode` | `'INCLUSIVE_GST'` (default) \| `'EXCLUSIVE_GST'` (§2) | EXCLUSIVE_GST | INCLUSIVE_GST |
| `price` | `round(exclude_price × (1 + gst))` — sticker incl. GST | 5900 | 5900 |
| `final_price` | student pays (incl. GST), per `discount_mode` | 4956 | 5100 |

- **Never write `price`/`final_price` by hand** — they are always derived from
  `exclude_price` + `discount` + `discount_mode` + `gst_percent` (in app code
  on save, by the DB trigger on GST change).
- Free courses: all price fields = 0, `is_free = true`, mode INCLUSIVE_GST (the default).
- `course_bundle` is on the **same model** (migration
  `add_discount_mode_to_course_bundle`). The faculty doesn't enter a base;
  it's derived from the selected courses: `exclude_price` = ex-GST value of
  the sum of the courses' `final_price` (`sum × 100/(100+gst)`), `price` =
  that GST-inclusive sum, and `discount` / `discount_type` / `discount_mode` /
  `final_price` behave exactly like courses (§5 formulas). Bundle amounts keep
  2-decimal rounding in the DB recalc.

---

## 5. Formulas (exact, with rounding)

```
g           = gst_percent / 100                       // 0.18
price       = round(exclude_price × (1 + g))          // sticker, incl. GST

EXCLUSIVE_GST:
  discountAmt = type='percentage' ? exclude_price × d/100 : d
  final_price = round(max(0, exclude_price − discountAmt) × (1 + g))

INCLUSIVE_GST:
  discountAmt = type='percentage' ? price × d/100 : d
  final_price = max(0, price − round(discountAmt))

Always (both models, and after any checkout deductions):
  gst_inside(x)   = x × gst% / (100 + gst%)           // extract GST from inclusive money
  taxable(x)      = x − gst_inside(x)
  studentSaved    = price − final_price
```

Rounding: **round once, at the rupee level, on the stored result**. Never
chain-derive one stored value from another.

---

## 6. Checkout (Server / Lambda) — creating the enrollment

⚠️ **Units switch here:** `courses.*` prices are **rupees**; `enrollments.*`
amounts are **PAISE** (multiply by 100).

Recompute everything server-side from DB values (never trust client amounts).
Because `final_price` is always GST-inclusive (whatever the discount_mode),
checkout works on **inclusive money** and extracts GST at the end:

```js
const G        = gst_percent                                   // 18
const RATE     = profiles.commission_rate ?? default_commission_percent   // %
const COIN_VAL = default_coin_value * 100                      // paise (inclusive money)

// 1. start from the course's final_price (already per discount_mode)
let payable = final_price * 100                                // → paise, incl. GST

// 1b. coupon code (FACULTY's cost — like their course discount)
const couponIncl = resolveCoupon(couponCode, payable)          // validate + record redemption
payable -= couponIncl

// 2. platform offer (admin's cost, inclusive money)
const offerIncl = resolveOffer(offerId, payable)

// 3. coins (admin's cost) — CAP: total subsidy ≤ admin's commission on the sale
const taxableNoSubsidy = Math.round(payable * 100 / (100 + G))
const maxSubsidyIncl   = Math.round(taxableNoSubsidy * RATE / 100 * (1 + G / 100))
const maxCoinPaise     = Math.max(0, maxSubsidyIncl - offerIncl)
const coinsUsed        = Math.min(requestedCoins, studentBalance,
                                  Math.floor(maxCoinPaise / COIN_VAL))
const coinIncl         = coinsUsed * COIN_VAL

// 4. final payable and GST extraction
payable -= offerIncl + coinIncl
const gstAmount = Math.round(payable * G / (100 + G))          // GST inside payable

// 5. on payment success, insert enrollment (all paise).
//    Store subsidies as their TAXABLE (ex-GST) portion so the payout formula
//    (§7) reconstructs the exact no-subsidy taxable value:
{
  amount_paid:            payable,
  gst_amount:             gstAmount,
  coins_used_count:       coinsUsed,
  coin_redeem_amount:     Math.round(coinIncl  * 100 / (100 + G)),  // added back at payout
  offer_discount_amount:  Math.round(offerIncl * 100 / (100 + G)),  // added back at payout
  offer_id:               offerId ?? null,
  coupon_id:              couponId ?? null,                          // faculty-funded —
  coupon_discount_amount: couponIncl,                                // NOT added back
  course_price:           exclude_price * 100,
  payment_status:         'SUCCESS',
}
// deduct coinsUsed from the student's coin balance IN THE SAME transaction
```

The invoice must show the discounts as line items so the taxable value matches
`gst_amount` (discounts recorded on the invoice reduce taxable value —
Section 15(3)(a), CGST Act).

---

## 7. Link to Payouts (why these fields matter)

Payout base per enrollment (see `enrollment-payout-workflow.md` §9):

```
base = (amount_paid − gst_amount) + coin_redeem_amount + offer_discount_amount
commission     = round(base × rate%)
faculty_share  = base − commission
```

- Faculty's own discount → lower base → **lower payout** (his discount, his
  cost). In INCLUSIVE_GST mode the payout base is slightly higher than in
  EXCLUSIVE_GST for the same discount value (₹4,322 vs ₹4,200 in §2) because
  less of the discount hits the taxable value — the faculty gives up less, the
  student saves less. Both are consistent; the toggle just picks who the
  discount is "denominated" for.
- Coins / platform offers → added back (as taxable portions, §6 step 5) →
  **payout unchanged**; the subsidy comes out of the admin's commission. That's
  why the cap in §6 step 3 is mandatory.
- GST is frozen per enrollment at purchase time; later GST-rate changes never
  affect already-created enrollments or their payouts.

---

## 8. Worked Example (EXCLUSIVE_GST course from §2, 20% commission)

| | cash sale | + student uses 100 coins (₹300 incl.) |
|---|---|---|
| student pays | ₹4,956 | 4,956 − 300 = ₹4,656 |
| gst_amount | 4,956×18/118 = ₹756 | 4,656×18/118 = ₹710 |
| stored subsidy (taxable) | 0 | coin_redeem_amount = 300×100/118 = ₹254 |
| payout base | 4,200 | (4,656 − 710) + 254 = 4,200 |
| **faculty gets** | **₹3,360** | **₹3,360 — identical** ✓ |
| admin nets | ₹840 | ₹840 − ₹254 = ₹586 (+ ₹46 GST no longer owed) |

---

## 9. Where This Lives (per repo)

**Admin dashboard** (`learningApp_admin_dashboard`)
- Payout/KPI formulas: `src/api/financial/financial.api.ts`,
  `src/api/dashboard/dashboard.api.ts`, `src/api/FacultyManagement/facultyManagement.api.ts`
- Course pricing display (`CourseOverviewSection`, course tables) only shows
  stored `price`/`final_price` — no model logic needed there.
- Full payout reference: `enrollment-payout-workflow.md`

**Faculty dashboard** (`learning-app-faculty-dashboard`)
- Pricing screen (base entry, GST preview, discount-mode toggle):
  `src/pages/courses/create/Step3Pricing.tsx`
- Bundle pricing screen (same model; base derived from selected courses):
  `src/pages/bundles/Step2Pricing.tsx`, save in `src/services/bundleService.ts`
- Save + GST rate fetch: `src/services/courseService.ts`
  (`addCoursePricing`, `getGstPercent`), hook `useGstPercent` in `src/hooks/useCourse.ts`

**Server / Lambda** (`learninough-server`)
- ⚠️ TODO: checkout must implement §6 (inclusive-money deductions, coin cap,
  GST extraction, enrollment fields with taxable subsidy portions, atomic coin
  deduction).

**Database (Supabase)**
- Payout run: `process_all_payouts()` (on the §7 formula)
- Price rebuild: `recalculate_gst_inclusive_prices()` (handles both discount
  modes) + trigger `trg_gst_percent_recalc_prices` on `platform_settings`
- Columns/migrations: `add_admin_funded_discount_columns_to_enrollments`,
  `add_exclude_price_and_gst_inclusive_pricing`, `add_discount_mode_dual_gst_models`,
  `add_discount_mode_to_course_bundle`
