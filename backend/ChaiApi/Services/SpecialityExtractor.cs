using ChaiApi.Models;

namespace ChaiApi.Services;

/// <summary>
/// Derives a shop's "specialities" from its positive (4★+) reviews. No ML:
/// we match review text against the shop's own menu-item words plus a small
/// chai lexicon, and keep the terms that show up most. Upgradeable to real
/// NLP later without changing callers.
/// </summary>
public static class SpecialityExtractor
{
    // Attribute/flavour words worth surfacing when customers praise them.
    private static readonly string[] Lexicon =
    [
        "elaichi", "adrak", "ginger", "cardamom", "masala", "kadak", "strong",
        "malai", "creamy", "sweet", "less sugar", "sugarless", "hot", "fresh",
        "large", "big cup", "cutting", "filter", "black", "green", "lemon",
        "tulsi", "saffron", "kesar", "value", "cheap", "clean", "fast"
    ];

    public static List<string> Extract(Shop shop, int max = 5)
    {
        var positive = shop.Reviews.Where(r => r.IsPositive && r.Comment is not null).ToList();
        if (positive.Count == 0) return [];

        // Candidate terms: menu item names + the lexicon.
        var terms = shop.MenuItems.Select(m => m.Name.ToLowerInvariant())
            .Concat(Lexicon)
            .Distinct()
            .ToList();

        var counts = new Dictionary<string, int>();
        foreach (var review in positive)
        {
            var text = review.Comment!.ToLowerInvariant();
            foreach (var term in terms)
            {
                if (text.Contains(term))
                    counts[term] = counts.GetValueOrDefault(term) + 1;
            }
        }

        return counts
            .OrderByDescending(kv => kv.Value)
            .ThenBy(kv => kv.Key)
            .Take(max)
            .Select(kv => Title(kv.Key))
            .ToList();
    }

    private static string Title(string term) =>
        string.Join(' ', term.Split(' ')
            .Select(w => w.Length == 0 ? w : char.ToUpperInvariant(w[0]) + w[1..]));
}
