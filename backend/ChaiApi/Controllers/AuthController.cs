using ChaiApi.Data;
using ChaiApi.Dtos;
using ChaiApi.Models;
using ChaiApi.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

public class AuthController(
    ChaiDbContext db, TokenService tokenService, OtpService otpService)
    : ApiControllerBase
{
    private static readonly PasswordHasher<User> Hasher = new();

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email and password are required.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict("An account with this email already exists.");

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = "",
            Role = request.Role
        };
        user.PasswordHash = Hasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return new AuthResponse(tokenService.CreateToken(user), user.Id, user.Name, user.Email, user.Role);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null ||
            Hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid email or password.");

        return new AuthResponse(tokenService.CreateToken(user), user.Id, user.Name, user.Email, user.Role);
    }

    // ---- Phone + OTP ----

    [HttpPost("otp/request")]
    public ActionResult<OtpRequestResponse> RequestOtp(OtpRequestRequest request)
    {
        if (!IsValidPhone(request.PhoneNumber))
            return BadRequest("Enter a valid phone number.");
        var demoCode = otpService.Request(request.PhoneNumber);
        return new OtpRequestResponse(true, demoCode);
    }

    [HttpPost("otp/verify")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp(OtpVerifyRequest request)
    {
        if (!otpService.Verify(request.PhoneNumber, request.Code ?? ""))
            return Unauthorized("That code is wrong or expired. Request a new one.");

        var phone = NormalizePhone(request.PhoneNumber);
        var user = await db.Users.SingleOrDefaultAsync(u => u.PhoneNumber == phone);
        if (user is null)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.Role is null)
                return BadRequest("New number — a name and account type are required to sign up.");
            user = await CreateUserAsync(request.Name!, request.Role.Value, phone: phone, verified: true);
        }
        else if (!user.IsVerified)
        {
            user.IsVerified = true;
            await db.SaveChangesAsync();
        }

        return Auth(user);
    }

    // ---- Google sign-in (wired; needs a client ID to actually validate) ----

    [HttpPost("google")]
    public ActionResult<AuthResponse> Google(GoogleSignInRequest request)
    {
        // TODO: once Google:ClientId is set, validate request.IdToken against
        // Google's tokeninfo endpoint, then upsert the user by the verified
        // Google email. Left unwired until a real client ID exists so we never
        // trust an unvalidated token.
        _ = request;
        return StatusCode(501, "Google sign-in isn't configured yet. Add Google:ClientId to enable it.");
    }

    // ---- helpers ----

    private async Task<User> CreateUserAsync(string name, UserRole role, string? phone = null, bool verified = false)
    {
        // Phone/OAuth users get a synthesized unique email to satisfy the schema.
        var email = phone is not null ? $"phone+{phone}@phone.chai" : $"user{Guid.NewGuid():N}@chai.local";
        var user = new User
        {
            Name = name.Trim(),
            Email = email,
            PasswordHash = "",
            Role = role,
            PhoneNumber = phone,
            IsVerified = verified
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private AuthResponse Auth(User user) =>
        new(tokenService.CreateToken(user), user.Id, user.Name, user.Email, user.Role);

    private static bool IsValidPhone(string? phone) =>
        phone is not null && phone.Count(char.IsDigit) is >= 10 and <= 15;

    private static string NormalizePhone(string phone) =>
        new(phone.Where(char.IsDigit).ToArray());
}
