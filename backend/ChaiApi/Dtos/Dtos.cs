using ChaiApi.Models;

namespace ChaiApi.Dtos;

// ---- Auth ----
public record RegisterRequest(string Name, string Email, string Password, UserRole Role);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, int UserId, string Name, string Email, UserRole Role);

// ---- Shops / menu / plans ----
public record ShopUpsertRequest(
    string Name, string Address, bool AutoAcceptOrders,
    double? Latitude, double? Longitude, string? GstNumber);
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
    double? Latitude, double? Longitude, string? GstNumber, bool IsVerified,
    double AppRating, int AppRatingCount, double? GoogleRating, int GoogleRatingCount,
    double CombinedRating, List<string> Specialities,
    List<MenuItemDto> MenuItems, List<PlanDto> Plans);
// Shop plus its distance from the searcher (km, null if either side lacks a location).
public record ShopSearchResultDto(ShopDto Shop, double? DistanceKm, double MatchScore);
public record ShopEarningsDto(decimal PayableBalance, List<LedgerEntryDto> Entries);

// ---- Reviews & questions ----
public record ReviewUpsertRequest(int Rating, string? Comment);
public record ReviewDto(
    int Id, int UserId, string UserName, int Rating, string? Comment,
    bool IsPositive, DateTime CreatedAt);
public record ShopReviewsDto(
    double AppRating, int AppRatingCount, List<string> Specialities,
    List<ReviewDto> Good, List<ReviewDto> Bad);
public record AskQuestionRequest(string Body);
public record AnswerQuestionRequest(string Answer);
public record QuestionDto(
    int Id, int UserId, string UserName, string Body,
    string? Answer, DateTime CreatedAt, DateTime? AnsweredAt);

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
