namespace ChaiApi.Models;

public enum UserRole { Customer, Owner }

public enum SubscriptionStatus { Active, Cancelled, Expired }

public enum OrderStatus { Placed, Accepted, Delivered, Rejected, Cancelled }

public enum LedgerEntryType
{
    SubscriptionPayment,   // customer money enters platform escrow
    CupSettlement,         // escrow released to shop for delivered cups
    ConvenienceFee,        // cancellation fee released to shop
    WalletCredit,          // remaining escrow returned to customer wallet
    WalletDebit            // wallet balance applied to a new subscription
}

public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public decimal WalletBalance { get; set; }
    public List<Shop> Shops { get; set; } = [];
}

public class Shop
{
    public int Id { get; set; }
    public int OwnerId { get; set; }
    public User? Owner { get; set; }
    public required string Name { get; set; }
    public required string Address { get; set; }
    public bool AutoAcceptOrders { get; set; }
    // Escrow money already released to this shop but not yet paid out.
    public decimal PayableBalance { get; set; }
    public List<MenuItem> MenuItems { get; set; } = [];
    public List<Plan> Plans { get; set; } = [];
}

public class MenuItem
{
    public int Id { get; set; }
    public int ShopId { get; set; }
    public Shop? Shop { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; } = true;
}

public class Plan
{
    public int Id { get; set; }
    public int ShopId { get; set; }
    public Shop? Shop { get; set; }
    public int MenuItemId { get; set; }
    public MenuItem? MenuItem { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int CupCount { get; set; }
    public int ValidityDays { get; set; } = 30;
    // Set by the owner; % of the remaining escrow kept by the shop on cancellation.
    public decimal CancellationFeePercent { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Subscription
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int PlanId { get; set; }
    public Plan? Plan { get; set; }
    public int ShopId { get; set; }
    public Shop? Shop { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int CupsTotal { get; set; }
    public int CupsUsed { get; set; }
    public decimal AmountPaid { get; set; }
    // Money the platform still holds for this subscription. Shrinks as cups
    // are delivered; the remainder is what a cancellation splits between the
    // shop (fee) and the customer's wallet.
    public decimal EscrowRemaining { get; set; }
    public SubscriptionStatus Status { get; set; }

    public decimal PerCupValue => CupsTotal == 0 ? 0 : Math.Round(AmountPaid / CupsTotal, 2);
    public int CupsRemaining => CupsTotal - CupsUsed;
}

public class Order
{
    public int Id { get; set; }
    public int SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int ShopId { get; set; }
    public Shop? Shop { get; set; }
    public int Quantity { get; set; }
    // Short pickup token the owner calls out with the name ("Sarvesh · #47").
    public required string Token { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
}

public class LedgerEntry
{
    public int Id { get; set; }
    public LedgerEntryType Type { get; set; }
    public decimal Amount { get; set; }
    public int? UserId { get; set; }
    public int? ShopId { get; set; }
    public int? SubscriptionId { get; set; }
    public int? OrderId { get; set; }
    public required string Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
