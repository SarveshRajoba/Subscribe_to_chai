using ChaiApi.Models;

namespace ChaiApi.Dtos;

// ---- Auth ----
public record RegisterRequest(string Name, string Email, string Password, UserRole Role);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, int UserId, string Name, string Email, UserRole Role);

// ---- Shops / menu / plans ----
public record ShopUpsertRequest(string Name, string Address, bool AutoAcceptOrders);
public record MenuItemUpsertRequest(string Name, decimal Price, bool IsAvailable);
public record PlanUpsertRequest(
    string Name, int MenuItemId, decimal Price, int CupCount,
    int ValidityDays, decimal CancellationFeePercent, bool IsActive);

public record MenuItemDto(int Id, string Name, decimal Price, bool IsAvailable);
public record PlanDto(
    int Id, string Name, int MenuItemId, string MenuItemName, decimal Price,
    int CupCount, int ValidityDays, decimal CancellationFeePercent, bool IsActive);
public record ShopDto(
    int Id, string Name, string Address, bool AutoAcceptOrders,
    List<MenuItemDto> MenuItems, List<PlanDto> Plans);
public record ShopEarningsDto(decimal PayableBalance, List<LedgerEntryDto> Entries);

// ---- Subscriptions ----
public record SubscribeRequest(int PlanId, bool UseWallet);
public record SubscriptionDto(
    int Id, int PlanId, string PlanName, int ShopId, string ShopName,
    string BeverageName, DateTime StartsAt, DateTime ExpiresAt,
    int CupsTotal, int CupsUsed, int CupsRemaining,
    decimal AmountPaid, decimal EscrowRemaining, decimal PerCupValue,
    SubscriptionStatus Status);
public record CancelResultDto(decimal ConvenienceFee, decimal RefundedToWallet);

// ---- Orders ----
public record PlaceOrderRequest(int SubscriptionId, int Quantity);
public record OrderDto(
    int Id, int SubscriptionId, int ShopId, string ShopName,
    string CustomerName, string BeverageName, int Quantity, string Token,
    OrderStatus Status, DateTime CreatedAt, DateTime? DeliveredAt);

// ---- Wallet / ledger ----
public record LedgerEntryDto(
    int Id, LedgerEntryType Type, decimal Amount, string Description, DateTime CreatedAt);
public record WalletDto(decimal Balance, List<LedgerEntryDto> Transactions);
