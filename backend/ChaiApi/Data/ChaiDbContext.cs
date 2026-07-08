using ChaiApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Data;

public class ChaiDbContext(DbContextOptions<ChaiDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Shop>()
            .HasOne(s => s.Owner)
            .WithMany(u => u.Shops)
            .HasForeignKey(s => s.OwnerId);

        modelBuilder.Entity<Subscription>()
            .HasOne(s => s.Shop)
            .WithMany()
            .HasForeignKey(s => s.ShopId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.Shop)
            .WithMany()
            .HasForeignKey(o => o.ShopId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
