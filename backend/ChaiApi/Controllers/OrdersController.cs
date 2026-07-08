using ChaiApi.Data;
using ChaiApi.Dtos;
using ChaiApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

[Authorize]
public class OrdersController(ChaiDbContext db) : ApiControllerBase
{
    /// <summary>
    /// Customer places an order against an active subscription. Cups are
    /// reserved immediately (CupsUsed goes up) so the balance can't be
    /// double-spent; a rejection puts them back. Money only moves on delivery.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<OrderDto>> Place(PlaceOrderRequest request)
    {
        if (request.Quantity <= 0) return BadRequest("Quantity must be positive.");

        var subscription = await db.Subscriptions
            .Include(s => s.Plan).ThenInclude(p => p!.MenuItem)
            .Include(s => s.Shop)
            .SingleOrDefaultAsync(s => s.Id == request.SubscriptionId && s.UserId == CurrentUserId);
        if (subscription is null) return NotFound("Subscription not found.");
        if (subscription.Status != SubscriptionStatus.Active)
            return BadRequest("This subscription is not active.");
        if (subscription.ExpiresAt < DateTime.UtcNow)
            return BadRequest("This subscription has expired.");
        if (subscription.CupsRemaining < request.Quantity)
            return BadRequest($"Only {subscription.CupsRemaining} cups left on this subscription.");

        subscription.CupsUsed += request.Quantity;

        var shop = subscription.Shop!;
        var order = new Order
        {
            SubscriptionId = subscription.Id,
            UserId = CurrentUserId,
            ShopId = shop.Id,
            Quantity = request.Quantity,
            Token = await NextTokenAsync(shop.Id),
            Status = shop.AutoAcceptOrders ? OrderStatus.Accepted : OrderStatus.Placed,
            CreatedAt = DateTime.UtcNow
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        order.Subscription = subscription;
        order.User = await db.Users.SingleAsync(u => u.Id == CurrentUserId);
        return ToDto(order);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<List<OrderDto>>> GetMine()
    {
        var orders = await db.Orders
            .Where(o => o.UserId == CurrentUserId)
            .Include(o => o.Shop)
            .Include(o => o.User)
            .Include(o => o.Subscription).ThenInclude(s => s!.Plan).ThenInclude(p => p!.MenuItem)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
        return orders.Select(ToDto).ToList();
    }

    /// <summary>Owner's live queue for a shop: placed and accepted orders.</summary>
    [HttpGet("incoming/{shopId:int}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<List<OrderDto>>> GetIncoming(int shopId)
    {
        if (!await OwnsShop(shopId)) return NotFound();

        var orders = await db.Orders
            .Where(o => o.ShopId == shopId &&
                        (o.Status == OrderStatus.Placed || o.Status == OrderStatus.Accepted))
            .Include(o => o.Shop)
            .Include(o => o.User)
            .Include(o => o.Subscription).ThenInclude(s => s!.Plan).ThenInclude(p => p!.MenuItem)
            .OrderBy(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
        return orders.Select(ToDto).ToList();
    }

    [HttpPost("{id:int}/accept")]
    [Authorize(Roles = "Owner")]
    public Task<ActionResult<OrderDto>> Accept(int id) =>
        Transition(id, OrderStatus.Placed, OrderStatus.Accepted);

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Owner")]
    public Task<ActionResult<OrderDto>> Reject(int id) =>
        Transition(id, OrderStatus.Placed, OrderStatus.Rejected);

    /// <summary>
    /// Owner hands the cups over. This is the escrow release point: the
    /// per-cup value moves from the subscription's escrow to the shop's
    /// payable balance, recorded in the ledger.
    /// </summary>
    [HttpPost("{id:int}/deliver")]
    [Authorize(Roles = "Owner")]
    public Task<ActionResult<OrderDto>> Deliver(int id) =>
        Transition(id, OrderStatus.Accepted, OrderStatus.Delivered);

    private async Task<ActionResult<OrderDto>> Transition(int id, OrderStatus from, OrderStatus to)
    {
        var order = await db.Orders
            .Include(o => o.Shop)
            .Include(o => o.User)
            .Include(o => o.Subscription).ThenInclude(s => s!.Plan).ThenInclude(p => p!.MenuItem)
            .SingleOrDefaultAsync(o => o.Id == id);
        if (order is null || order.Shop!.OwnerId != CurrentUserId) return NotFound();
        if (order.Status != from)
            return BadRequest($"Order is {order.Status}, expected {from}.");

        order.Status = to;
        var now = DateTime.UtcNow;

        if (to == OrderStatus.Rejected)
        {
            // Give the reserved cups back to the customer.
            order.Subscription!.CupsUsed -= order.Quantity;
        }
        else if (to == OrderStatus.Delivered)
        {
            order.DeliveredAt = now;
            var subscription = order.Subscription!;
            var amount = Math.Min(
                Math.Round(subscription.PerCupValue * order.Quantity, 2),
                subscription.EscrowRemaining);
            subscription.EscrowRemaining -= amount;
            order.Shop.PayableBalance += amount;
            db.LedgerEntries.Add(new LedgerEntry
            {
                Type = LedgerEntryType.CupSettlement,
                Amount = amount,
                UserId = order.UserId,
                ShopId = order.ShopId,
                SubscriptionId = subscription.Id,
                OrderId = order.Id,
                Description = $"{order.Quantity} × {subscription.Plan?.MenuItem?.Name} delivered to {order.User!.Name} (#{order.Token})",
                CreatedAt = now
            });
        }

        await db.SaveChangesAsync();
        return ToDto(order);
    }

    /// <summary>Short daily pickup token per shop ("Sarvesh · #47").</summary>
    private async Task<string> NextTokenAsync(int shopId)
    {
        var today = DateTime.UtcNow.Date;
        var countToday = await db.Orders.CountAsync(o => o.ShopId == shopId && o.CreatedAt >= today);
        return (countToday + 1).ToString();
    }

    private Task<bool> OwnsShop(int shopId) =>
        db.Shops.AnyAsync(s => s.Id == shopId && s.OwnerId == CurrentUserId);

    private static OrderDto ToDto(Order o) => new(
        o.Id, o.SubscriptionId, o.ShopId, o.Shop?.Name ?? "",
        o.User?.Name ?? "", o.Subscription?.Plan?.MenuItem?.Name ?? "",
        o.Quantity, o.Token, o.Status, o.CreatedAt, o.DeliveredAt);
}
