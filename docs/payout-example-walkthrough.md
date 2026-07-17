# Payout Example Walkthrough — One Course, One Sale, One Payout

> **Project:** LMS Platform (Learninough)
> **Purpose:** A single end-to-end story showing how pricing, GST, coupons,
> offers, coins and the faculty payout all fit together. Share this with any
> developer joining the project — read this first, then the technical specs:
> `course-gst-pricing.md` (pricing/checkout) and `enrollment-payout-workflow.md` (payouts).

**People:** Faculty Rahul (20% commission) · Student Priya · The Platform (admin)

---

## STEP 1 — Rahul creates a course (faculty app)

Rahul types **₹5,000** as his course price. He adds no discount.

The app fetches GST (18%) and calculates what students will see:

```
Rahul's price (no GST)     = 5,000     → saved as exclude_price
GST 18%                    = +900
Student sees               = ₹5,900    → saved as price and final_price
```

Rahul also creates a coupon code **SAVE100 = ₹100 off** for his followers.

---

## STEP 2 — Priya buys the course (student app checkout)

Priya opens the course: it shows **₹5,900**. At checkout she does three things:

```
Price                                ₹5,900
1. She types coupon SAVE100          − ₹100   (Rahul's promotion)
2. A platform offer is running       −  ₹50   (Admin's promotion)
3. She redeems 100 coins (₹3 each)   − ₹300   (Admin's promotion)
─────────────────────────────────────────────
Priya pays via Razorpay              ₹5,450
```

Priya's part of the story ends here. She paid ₹5,450 for a ₹5,900 course — saved ₹450.

---

## STEP 3 — The system records the sale (enrollment row)

GST is *inside* the ₹5,450, so the system pulls it out:

```
GST inside = 5,450 × 18/118 = ₹831
```

The enrollment row saves the facts:

| field | value | meaning |
|---|---|---|
| amount_paid | 5,450 | what Priya really paid |
| gst_amount | 831 | tax inside that payment |
| coupon_discount_amount | 100 | Rahul's promotion (just a record) |
| offer_discount_amount | 42 | Admin's ₹50 without its GST part |
| coin_redeem_amount | 254 | Admin's ₹300 without its GST part |

(Why 42 and 254? Every ₹ of discount also contains GST. ₹50 = ₹42 price + ₹8 tax.
₹300 = ₹254 price + ₹46 tax. Only the price-part matters for payout.)

---

## STEP 4 — Month ends, admin clicks "Process Payout"

The payout has ONE question to answer: **what price should Rahul be paid on?**

The rule: *Rahul is paid as if Admin's promotions never happened. His own promotions stay.*

```
Start with money left after tax:   5,450 − 831   = 4,619
Add back Admin's offer:                          +   42
Add back Admin's coins:                          +  254
                                                 ──────
Payout base                                      = 4,915
```

Notice what did NOT get added back: Rahul's ₹100 coupon. His promotion = his cost.

Now the normal 80/20 split:

```
Payout base            4,915
Admin commission 20%   −  983
Rahul receives         3,932
```

---

## STEP 5 — Where did Priya's ₹5,450 actually go?

```
Government (GST)      ₹831
Rahul (faculty)     ₹3,932
Admin keeps           ₹687
                   ───────
                    ₹5,450  ✓ every rupee accounted for
```

---

## The two checks that prove it's fair

**Check 1 — Admin's promotions didn't hurt Rahul.**
If Priya had used NO offer and NO coins (only the coupon), she'd pay ₹5,800, and
the math gives Rahul... **₹3,932. The same.** The ₹350 of admin promotions were
invisible to him — admin paid for them out of his own ₹983 commission
(983 − 296 = 687 kept).

**Check 2 — Rahul's own coupon DID cost him (a little).**
With no coupon at all, Rahul would get 5,000 × 80% = **₹4,000**. With his
SAVE100 coupon he gets **₹3,932** — his ₹100 gift cost him ₹68. Why not the
full ₹100? Because the ₹100 he gave away was "shop-window money" that contained
tax and admin's cut too:

```
Rahul's ₹100 coupon split:
  ₹15 → tax the government no longer collects
  ₹17 → commission admin no longer collects
  ₹68 → Rahul's own pocket
```

Everyone gives up their usual slice of the discounted amount. Same as a shop:
when a shop gives 10% off, the government also collects less tax — the shop
doesn't pay the tax on money nobody paid.

---

## What does Admin get?

Admin gets **₹687** in this scenario. Here's his slice traced out:

```
Admin's commission (20% of ₹4,915 base)     ₹983
− he funded the platform offer              − ₹42
− he funded Priya's coin redemption         − ₹254
─────────────────────────────────────────────────
Admin actually keeps                        ₹687
```

Cross-check from the cash side: Priya paid ₹5,450 → government took ₹831,
Rahul took ₹3,932 → what's left is **₹687**. Both directions give the same
number, which is how you know the books balance.

In the `faculty_transactions` records, this shows up as:
- **PLATFORM_FEE / PLATFORM_EARNING row = ₹983** (commission on paper)
- His real earning = 983 − 296 (coin + offer subsidy) = **₹687**

That gap between paper commission (₹983) and real cash (₹687) is exactly why
the dashboard reporting shows the coin/offer subsidy separately — if admin ran
a big coin campaign, Total Revenue would look healthy while real cash could be
much lower.

For comparison, on this same course admin would keep:
- **₹1,000** if Priya paid full price with nothing applied
- **₹983** if only Rahul's coupon was used (admin loses ₹17 to Rahul's promotion)
- **₹687** in our scenario (he additionally funded ₹296 of his own promotions)

---

## One-line summary of the whole system

> **Whoever creates the discount, loses their slice of it.** Rahul's coupon →
> comes out of Rahul's slice (and shrinks everyone's slice proportionally).
> Admin's coins & offers → come out of Admin's slice only, Rahul feels nothing.

That's the entire model — everything else (paise conversions, taxable portions,
add-backs) is just bookkeeping to make these two sentences true.
