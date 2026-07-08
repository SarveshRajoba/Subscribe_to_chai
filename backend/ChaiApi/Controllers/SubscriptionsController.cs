using ChaiApi.Data;
using ChaiApi.Dtos;
using ChaiApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

[Authorize(Roles = "Customer")]
public class SubscriptionsController(ChaiDbContext db) : ApiControllerBase
{
    [HttpGet("mine")]
    public async Task<ActionResult<List<SubscriptionDto>>> GetMine()
    {
        var subs = await db.Subscriptions
            .Where(s => s.UserId == CurrentUserId)
            .Include(s => s.Plan).ThenInclude(p => p!.MenuItem)
            .Include(s => s.Shop)
            .OrderByDescending(s => s.StartsAt)
            .AsNoTracking()
            .ToListAsync();
        return subs.Select(ToDto).ToList();
    }

    /// <summary>
    /// Subscribe to a plan. Payment is simulated for the MVP: the full plan
    /// price is considered collected by the platform and held in escrow.
    /// A real payment gateway (e.g. Razorpay) slots in here later.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SubscriptionDto>> Subscribe(SubscribeRequest request)
    {
        var plan = await db.Plans
            .Include(p => p.MenuItem)
            .Include(p => p.Shop)
            .SingleOrDefaultAsync(p => p.Id == request.PlanId);
        if (plan is null || !plan.IsActive) return NotFound("Plan not found or inactive.");

        var alreadyActive = await db.Subscriptions.AnyAsync(s =>
            s.UserId == CurrentUserId && s.PlanId == plan.Id &&
            s.Status == SubscriptionStatus.Active);
        if (alreadyActive) return Conflict("You already have an active subscription to this plan.");

        var user = await db.Users.SingleAsync(u => u.Id == CurrentUserId);
        var now = DateTime.UtcNow;

        var walletApplied = 0m;
        if (request.UseWallet && user.WalletBalance > 0)
        {
            walletApplied = Math.Min(user.WalletBalance, plan.Price);
            user.WalletBalance -= walletApplied;
        }

        var subscription = new Subscription
        {
            UserId = user.Id,
            PlanId = plan.Id,
            ShopId = plan.ShopId,
            StartsAt = now,
            ExpiresAt = now.AddDays(plan.ValidityDays),
            CupsTotal = plan.CupCount,
            CupsUsed = 0,
            AmountPaid = plan.Price,
            EscrowRemaining = plan.Price,
            Status = SubscriptionStatus.Active
        };
        db.Subscriptions.Add(subscription);
        await db.SaveChangesAsync();

        if (walletApplied > 0)
        {
            db.LedgerEntries.Add(new LedgerEntry
            {
                Type = LedgerEntryType.WalletDebit,
                Amount = walletApplied,
                UserId = user.Id,
                SubscriptionId = subscription.Id,
                Description = $"Wallet applied to '{plan.Name}' at {plan.Shop!.Name}",
                CreatedAt = now
            });
        }
        db.LedgerEntries.Add(new LedgerEntry
        {
            Type = LedgerEntryType.SubscriptionPayment,
            Amount = plan.Price,
            UserId = user.Id,
            ShopId = plan.ShopId,
            SubscriptionId = subscription.Id,
            Description = $"Subscribed to '{plan.Name}' at {plan.Shop!.Name}" +
                          (walletApplied > 0 ? $" (₹{walletApplied} from wallet)" : ""),
            CreatedAt = now
        });
        await db.SaveChangesAsync();

        subscription.Plan = plan;
        subscription.Shop = plan.Shop;
        return ToDto(subscription);
    }

    /// <summary>
    /// Cancel an active subscription. The shop keeps a convenience fee
    /// (plan-defined % of the remaining escrow); the rest is credited to the
    /// customer's wallet, ready to be applied to a subscription elsewhere.
    /// </summary>
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<CancelResultDto>> Cancel(int id)
    {
        var subscription = await db.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.Shop)
            .SingleOrDefaultAsync(s => s.Id == id && s.UserId == CurrentUserId);
        if (subscription is null) return NotFound();
        if (subscription.Status != SubscriptionStatus.Active)
            return BadRequest("Only active subscriptions can be cancelled.");

        var pendingOrders = await db.Orders.AnyAsync(o =>
            o.SubscriptionId == id &&
            (o.Status == OrderStatus.Placed || o.Status == OrderStatus.Accepted));
        if (pendingOrders)
            return BadRequest("You have pending orders on this subscription. Wait for them to complete first.");

        var now = DateTime.UtcNow;
        var remaining = subscription.EscrowRemaining;
        var fee = Math.Round(remaining * subscription.Plan!.CancellationFeePercent / 100m, 2);
        var refund = remaining - fee;

        subscription.Status = SubscriptionStatus.Cancelled;
        subscription.EscrowRemaining = 0;

        var user = await db.Users.SingleAsync(u => u.Id == CurrentUserId);
        user.WalletBalance += refund;

        var shop = subscription.Shop!;
        if (fee > 0)
        {
            shop.PayableBalance += fee;
            db.LedgerEntries.Add(new LedgerEntry
            {
                Type = LedgerEntryType.ConvenienceFee,
                Amount = fee,
                UserId = user.Id,
                ShopId = shop.Id,
                SubscriptionId = subscription.Id,
                Description = $"Cancellation fee for '{subscription.Plan.Name}'",
                CreatedAt = now
            });
        }
        db.LedgerEntries.Add(new LedgerEntry
        {
            Type = LedgerEntryType.WalletCredit,
            Amount = refund,
            UserId = user.Id,
            ShopId = shop.Id,
            SubscriptionId = subscription.Id,
            Description = $"Refund to wallet after cancelling '{subscription.Plan.Name}' at {shop.Name}",
            CreatedAt = now
        });

        await db.SaveChangesAsync();
        return new CancelResultDto(fee, refund);
    }

    private static SubscriptionDto ToDto(Subscription s) => new(
        s.Id, s.PlanId, s.Plan?.Name ?? "", s.ShopId, s.Shop?.Name ?? "",
        s.Plan?.MenuItem?.Name ?? "", s.StartsAt, s.ExpiresAt,
        s.CupsTotal, s.CupsUsed, s.CupsRemaining,
        s.AmountPaid, s.EscrowRemaining, s.PerCupValue, s.Status);
}
