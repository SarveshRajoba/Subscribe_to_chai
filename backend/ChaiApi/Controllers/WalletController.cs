using ChaiApi.Data;
using ChaiApi.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

[Authorize(Roles = "Customer")]
public class WalletController(ChaiDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<WalletDto>> Get()
    {
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == CurrentUserId);
        var entries = await db.LedgerEntries
            .Where(e => e.UserId == CurrentUserId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new LedgerEntryDto(e.Id, e.Type, e.Amount, e.Description, e.CreatedAt))
            .ToListAsync();
        return new WalletDto(user.WalletBalance, entries);
    }
}
