using ChaiApi.Data;
using ChaiApi.Dtos;
using ChaiApi.Models;
using ChaiApi.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

public class AuthController(ChaiDbContext db, TokenService tokenService) : ApiControllerBase
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
}
