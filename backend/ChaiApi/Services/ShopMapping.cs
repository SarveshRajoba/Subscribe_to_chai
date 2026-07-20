using ChaiApi.Dtos;
using ChaiApi.Models;

namespace ChaiApi.Services;

public static class ShopMapping
{
    public static ShopDto ToDto(Shop shop)
    {
        var ratings = shop.Reviews.Select(r => r.Rating).ToList();
        var appRating = ratings.Count == 0 ? 0 : Math.Round(ratings.Average(), 1);
        var specialities = SpecialityExtractor.Extract(shop);

        return new ShopDto(
            shop.Id, shop.Name, shop.Address, shop.AutoAcceptOrders,
            shop.Latitude, shop.Longitude, shop.GstNumber, shop.IsVerified,
            appRating, ratings.Count, shop.GoogleRating, shop.GoogleRatingCount,
            CombinedRating(appRating, ratings.Count, shop.GoogleRating, shop.GoogleRatingCount),
            specialities,
            shop.MenuItems.Select(m => new MenuItemDto(m.Id, m.Name, m.Price, m.IsAvailable)).ToList(),
            shop.Plans.Select(p => new PlanDto(p.Id, p.Name, p.MenuItemId, p.MenuItem?.Name ?? "", p.Price,
                p.CupCount, p.ValidityDays, p.CancellationFeePercent, p.IsActive)).ToList());
    }

    /// <summary>App and Google ratings blended, weighted by their counts.</summary>
    public static double CombinedRating(double appRating, int appCount, double? googleRating, int googleCount)
    {
        double sum = appRating * appCount + (googleRating ?? 0) * googleCount;
        int count = appCount + googleCount;
        return count == 0 ? 0 : Math.Round(sum / count, 1);
    }

    /// <summary>Great-circle distance in km, or null if either point is missing.</summary>
    public static double? DistanceKm(double? lat1, double? lon1, double? lat2, double? lon2)
    {
        if (lat1 is null || lon1 is null || lat2 is null || lon2 is null) return null;
        const double r = 6371;
        double dLat = Deg2Rad(lat2.Value - lat1.Value);
        double dLon = Deg2Rad(lon2.Value - lon1.Value);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(Deg2Rad(lat1.Value)) * Math.Cos(Deg2Rad(lat2.Value)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return Math.Round(r * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a)), 1);
    }

    /// <summary>
    /// How well a shop answers a text query: menu/speciality/name matches, each
    /// weighted. 0 means no match. Used to rank "elaichi tea near me" results.
    /// </summary>
    public static double MatchScore(Shop shop, ShopDto dto, string query)
    {
        var q = query.Trim().ToLowerInvariant();
        if (q.Length == 0) return 1;
        double score = 0;
        if (shop.Name.ToLowerInvariant().Contains(q)) score += 2;
        if (dto.Specialities.Any(s => s.ToLowerInvariant().Contains(q))) score += 3;
        if (shop.MenuItems.Any(m => m.Name.ToLowerInvariant().Contains(q))) score += 2;
        return score;
    }

    private static double Deg2Rad(double deg) => deg * Math.PI / 180;
}
