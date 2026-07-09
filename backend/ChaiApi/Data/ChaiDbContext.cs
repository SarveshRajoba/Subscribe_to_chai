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
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ShopQuestion> Questions => Set<ShopQuestion>();

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

        modelBuilder.Entity<Review>()
            .HasOne(r => r.Shop)
            .WithMany(s => s.Reviews)
            .HasForeignKey(r => r.ShopId)
            .OnDelete(DeleteBehavior.Cascade);

        // One review per customer per shop; adding again updates it.
        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.ShopId, r.UserId })
            .IsUnique();

        modelBuilder.Entity<ShopQuestion>()
            .HasOne(q => q.Shop)
            .WithMany(s => s.Questions)
            .HasForeignKey(q => q.ShopId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
