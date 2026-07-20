using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace ChaiApi.Services;

/// <summary>
/// Issues and checks phone OTPs. The "send" step is stubbed — in Development
/// the code is returned to the caller and logged instead of texted. Swap
/// <see cref="Send"/> for a real SMS provider (MSG91 / Twilio / Firebase) to
/// go live; nothing else changes.
/// </summary>
public class OtpService(IWebHostEnvironment env, ILogger<OtpService> logger)
{
    private record Entry(string Code, DateTime ExpiresAt);

    private readonly ConcurrentDictionary<string, Entry> _codes = new();
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    /// <summary>Generate a code for a phone and "send" it. Returns the code in dev.</summary>
    public string? Request(string phoneNumber)
    {
        var code = RandomNumberGenerator.GetInt32(1000, 10000).ToString();
        _codes[Normalize(phoneNumber)] = new Entry(code, DateTime.UtcNow.Add(Ttl));
        Send(phoneNumber, code);
        // Only reveal the code outside production so the flow is testable.
        return env.IsDevelopment() ? code : null;
    }

    public bool Verify(string phoneNumber, string code)
    {
        var key = Normalize(phoneNumber);
        if (!_codes.TryGetValue(key, out var entry)) return false;
        if (entry.ExpiresAt < DateTime.UtcNow)
        {
            _codes.TryRemove(key, out _);
            return false;
        }
        if (entry.Code != code.Trim()) return false;
        _codes.TryRemove(key, out _); // single use
        return true;
    }

    // STUB: replace with a real SMS send. Today it just logs.
    private void Send(string phoneNumber, string code) =>
        logger.LogInformation("OTP for {Phone} is {Code} (stubbed send)", phoneNumber, code);

    private static string Normalize(string phone) =>
        new(phone.Where(char.IsDigit).ToArray());
}
