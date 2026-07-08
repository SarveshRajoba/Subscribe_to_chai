using ChaiApi.Data;
using ChaiApi.Dtos;
using ChaiApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

[Authorize]
public class ShopsController(ChaiDbContext db) : ApiControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ShopDto>>> GetShops()
    {
        var shops = await db.Shops
            .Include(s => s.MenuItems)
            .Include(s => s.Plans).ThenInclude(p => p.MenuItem)
            .AsNoTracking()
            .ToListAsync();
        return shops.Select(ToDto).ToList();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ShopDto>> GetShop(int id)
    {
        var shop = await LoadShop(id);
        return shop is null ? NotFound() : ToDto(shop);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<List<ShopDto>>> GetMyShops()
    {
        var shops = await db.Shops
            .Where(s => s.OwnerId == CurrentUserId)
            .Include(s => s.MenuItems)
            .Include(s => s.Plans).ThenInclude(p => p.MenuItem)
            .AsNoTracking()
            .ToListAsync();
        return shops.Select(ToDto).ToList();
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<ShopDto>> CreateShop(ShopUpsertRequest request)
    {
        var shop = new Shop
        {
            OwnerId = CurrentUserId,
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            AutoAcceptOrders = request.AutoAcceptOrders
        };
        db.Shops.Add(shop);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetShop), new { id = shop.Id }, ToDto(shop));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<ShopDto>> UpdateShop(int id, ShopUpsertRequest request)
    {
        var shop = await LoadOwnedShop(id);
        if (shop is null) return NotFound();

        shop.Name = request.Name.Trim();
        shop.Address = request.Address.Trim();
        shop.AutoAcceptOrders = request.AutoAcceptOrders;
        await db.SaveChangesAsync();
        return ToDto(shop);
    }

    // ---- Menu items ----

    [HttpPost("{id:int}/menu")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<MenuItemDto>> AddMenuItem(int id, MenuItemUpsertRequest request)
    {
        var shop = await LoadOwnedShop(id);
        if (shop is null) return NotFound();

        var item = new MenuItem
        {
            ShopId = id,
            Name = request.Name.Trim(),
            Price = request.Price,
            IsAvailable = request.IsAvailable
        };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
        return new MenuItemDto(item.Id, item.Name, item.Price, item.IsAvailable);
    }

    [HttpPut("{id:int}/menu/{itemId:int}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<MenuItemDto>> UpdateMenuItem(int id, int itemId, MenuItemUpsertRequest request)
    {
        var shop = await LoadOwnedShop(id);
        if (shop is null) return NotFound();

        var item = shop.MenuItems.SingleOrDefault(m => m.Id == itemId);
        if (item is null) return NotFound();

        item.Name = request.Name.Trim();
        item.Price = request.Price;
        item.IsAvailable = request.IsAvailable;
        await db.SaveChangesAsync();
        return new MenuItemDto(item.Id, item.Name, item.Price, item.IsAvailable);
    }

    // ---- Plans ----

    [HttpPost("{id:int}/plans")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<PlanDto>> AddPlan(int id, PlanUpsertRequest request)
    {
        var shop = await LoadOwnedShop(id);
        if (shop is null) return NotFound();

        var error = ValidatePlan(shop, request);
        if (error is not null) return BadRequest(error);

        var plan = new Plan
        {
            ShopId = id,
            MenuItemId = request.MenuItemId,
            Name = request.Name.Trim(),
            Price = request.Price,
            CupCount = request.CupCount,
            ValidityDays = request.ValidityDays,
            CancellationFeePercent = request.CancellationFeePercent,
            IsActive = request.IsActive
        };
        db.Plans.Add(plan);
        await db.SaveChangesAsync();
        var menuItem = shop.MenuItems.Single(m => m.Id == plan.MenuItemId);
        return new PlanDto(plan.Id, plan.Name, plan.MenuItemId, menuItem.Name, plan.Price,
            plan.CupCount, plan.ValidityDays, plan.CancellationFeePercent, plan.IsActive);
    }

    [HttpPut("{id:int}/plans/{planId:int}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<PlanDto>> UpdatePlan(int id, int planId, PlanUpsertRequest request)
    {
        var shop = await LoadOwnedShop(id);
        if (shop is null) return NotFound();

        var plan = shop.Plans.SingleOrDefault(p => p.Id == planId);
        if (plan is null) return NotFound();

        var error = ValidatePlan(shop, request);
        if (error is not null) return BadRequest(error);

        plan.MenuItemId = request.MenuItemId;
        plan.Name = request.Name.Trim();
        plan.Price = request.Price;
        plan.CupCount = request.CupCount;
        plan.ValidityDays = request.ValidityDays;
        plan.CancellationFeePercent = request.CancellationFeePercent;
        plan.IsActive = request.IsActive;
        await db.SaveChangesAsync();
        var menuItem = shop.MenuItems.Single(m => m.Id == plan.MenuItemId);
        return new PlanDto(plan.Id, plan.Name, plan.MenuItemId, menuItem.Name, plan.Price,
            plan.CupCount, plan.ValidityDays, plan.CancellationFeePercent, plan.IsActive);
    }

    // ---- Earnings ----

    [HttpGet("{id:int}/earnings")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<ShopEarningsDto>> GetEarnings(int id)
    {
        var shop = await LoadOwnedShop(id);
        if (shop is null) return NotFound();

        var entries = await db.LedgerEntries
            .Where(e => e.ShopId == id &&
                        (e.Type == LedgerEntryType.CupSettlement || e.Type == LedgerEntryType.ConvenienceFee))
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new LedgerEntryDto(e.Id, e.Type, e.Amount, e.Description, e.CreatedAt))
            .ToListAsync();

        return new ShopEarningsDto(shop.PayableBalance, entries);
    }

    private static string? ValidatePlan(Shop shop, PlanUpsertRequest request)
    {
        if (shop.MenuItems.All(m => m.Id != request.MenuItemId))
            return "The plan must reference a menu item of this shop.";
        if (request.CupCount <= 0) return "Cup count must be positive.";
        if (request.Price <= 0) return "Price must be positive.";
        if (request.ValidityDays <= 0) return "Validity must be positive.";
        if (request.CancellationFeePercent is < 0 or > 25)
            return "Cancellation fee must be between 0% and 25%.";
        return null;
    }

    private async Task<Shop?> LoadShop(int id) =>
        await db.Shops
            .Include(s => s.MenuItems)
            .Include(s => s.Plans).ThenInclude(p => p.MenuItem)
            .SingleOrDefaultAsync(s => s.Id == id);

    private async Task<Shop?> LoadOwnedShop(int id)
    {
        var shop = await LoadShop(id);
        return shop is null || shop.OwnerId != CurrentUserId ? null : shop;
    }

    private static ShopDto ToDto(Shop shop) => new(
        shop.Id, shop.Name, shop.Address, shop.AutoAcceptOrders,
        shop.MenuItems.Select(m => new MenuItemDto(m.Id, m.Name, m.Price, m.IsAvailable)).ToList(),
        shop.Plans.Select(p => new PlanDto(p.Id, p.Name, p.MenuItemId, p.MenuItem?.Name ?? "", p.Price,
            p.CupCount, p.ValidityDays, p.CancellationFeePercent, p.IsActive)).ToList());
}
