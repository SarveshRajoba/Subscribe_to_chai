using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace ChaiApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
