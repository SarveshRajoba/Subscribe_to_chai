using ChaiApi.Data;
using ChaiApi.Dtos;
using ChaiApi.Models;
using ChaiApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChaiApi.Controllers;

[ApiController]
[Route("api/shops/{shopId:int}")]
public class ReviewsController(ChaiDbContext db) : ApiControllerBase
{
    // ---- Reviews ----

    [HttpGet("reviews")]
    [AllowAnonymous]
    public async Task<ActionResult<ShopReviewsDto>> GetReviews(int shopId)
    {
        var shop = await db.Shops
            .Include(s => s.MenuItems)
            .Include(s => s.Reviews)
            .AsNoTracking()
            .SingleOrDefaultAsync(s => s.Id == shopId);
        if (shop is null) return NotFound();

        var reviews = shop.Reviews.OrderByDescending(r => r.CreatedAt).Select(ToDto).ToList();
        var appRating = shop.Reviews.Count == 0 ? 0 : Math.Round(shop.Reviews.Average(r => r.Rating), 1);

        return new ShopReviewsDto(
            appRating, shop.Reviews.Count, SpecialityExtractor.Extract(shop),
            reviews.Where(r => r.IsPositive).ToList(),
            reviews.Where(r => !r.IsPositive).ToList());
    }

    /// <summary>
    /// Add or update the caller's review. Only customers who have actually
    /// ordered at the shop can review it — that keeps ratings trustworthy.
    /// </summary>
    [HttpPost("reviews")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReviewDto>> AddReview(int shopId, ReviewUpsertRequest request)
    {
        if (request.Rating is < 1 or > 5) return BadRequest("Rating must be between 1 and 5.");

        var shop = await db.Shops.Include(s => s.Reviews).SingleOrDefaultAsync(s => s.Id == shopId);
        if (shop is null) return NotFound();

        var hasOrdered = await db.Orders.AnyAsync(o =>
            o.ShopId == shopId && o.UserId == CurrentUserId && o.Status == OrderStatus.Delivered);
        if (!hasOrdered)
            return BadRequest("You can review a shop only after an order has been delivered there.");

        var user = await db.Users.SingleAsync(u => u.Id == CurrentUserId);
        var review = shop.Reviews.SingleOrDefault(r => r.UserId == CurrentUserId);
        if (review is null)
        {
            review = new Review
            {
                ShopId = shopId, UserId = CurrentUserId, UserName = user.Name,
                Rating = request.Rating, Comment = Clean(request.Comment),
                CreatedAt = DateTime.UtcNow
            };
            db.Reviews.Add(review);
        }
        else
        {
            review.Rating = request.Rating;
            review.Comment = Clean(request.Comment);
            review.CreatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return ToDto(review);
    }

    // ---- Questions (Q&A) ----

    [HttpGet("questions")]
    [AllowAnonymous]
    public async Task<ActionResult<List<QuestionDto>>> GetQuestions(int shopId)
    {
        if (!await db.Shops.AnyAsync(s => s.Id == shopId)) return NotFound();
        return await db.Questions
            .Where(q => q.ShopId == shopId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuestionDto(q.Id, q.UserId, q.UserName, q.Body, q.Answer, q.CreatedAt, q.AnsweredAt))
            .ToListAsync();
    }

    [HttpPost("questions")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<QuestionDto>> Ask(int shopId, AskQuestionRequest request)
    {
        var body = Clean(request.Body);
        if (string.IsNullOrEmpty(body)) return BadRequest("Question cannot be empty.");
        if (!await db.Shops.AnyAsync(s => s.Id == shopId)) return NotFound();

        var user = await db.Users.SingleAsync(u => u.Id == CurrentUserId);
        var question = new ShopQuestion
        {
            ShopId = shopId, UserId = CurrentUserId, UserName = user.Name,
            Body = body!, CreatedAt = DateTime.UtcNow
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();
        return new QuestionDto(question.Id, question.UserId, question.UserName, question.Body,
            null, question.CreatedAt, null);
    }

    [HttpPost("questions/{questionId:int}/answer")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<QuestionDto>> Answer(int shopId, int questionId, AnswerQuestionRequest request)
    {
        var answer = Clean(request.Answer);
        if (string.IsNullOrEmpty(answer)) return BadRequest("Answer cannot be empty.");

        var shop = await db.Shops.SingleOrDefaultAsync(s => s.Id == shopId);
        if (shop is null || shop.OwnerId != CurrentUserId) return NotFound();

        var question = await db.Questions.SingleOrDefaultAsync(q => q.Id == questionId && q.ShopId == shopId);
        if (question is null) return NotFound();

        question.Answer = answer;
        question.AnsweredAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return new QuestionDto(question.Id, question.UserId, question.UserName, question.Body,
            question.Answer, question.CreatedAt, question.AnsweredAt);
    }

    private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private static ReviewDto ToDto(Review r) => new(
        r.Id, r.UserId, r.UserName, r.Rating, r.Comment, r.IsPositive, r.CreatedAt);
}
