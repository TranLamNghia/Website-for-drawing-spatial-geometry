using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

public sealed class SyncUserRequest
{
    public string GoogleId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Avatar { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IConfiguration _configuration;

    public AuthController(IUserRepository users, IConfiguration configuration)
    {
        _users = users;
        _configuration = configuration;
    }

    [HttpPost("sync-user")]
    public async Task<IActionResult> SyncUser(
        [FromBody] SyncUserRequest request,
        [FromHeader(Name = "x-api-key")] string? apiKey,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized(apiKey))
            return Unauthorized(new { message = "Invalid or missing API key." });

        if (string.IsNullOrWhiteSpace(request.GoogleId) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "googleId and email are required." });

        var user = await _users.UpsertGoogleUserAsync(
            request.GoogleId.Trim(),
            request.Email.Trim(),
            request.FullName?.Trim(),
            request.Avatar?.Trim(),
            cancellationToken);

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            avatar = user.Avatar,
            googleId = user.GoogleId,
        });
    }

    private bool IsAuthorized(string? apiKey)
    {
        var expected = _configuration["INTERNAL_API_KEY"]
            ?? Environment.GetEnvironmentVariable("INTERNAL_API_KEY");

        // If no key is configured (local dev), allow the request.
        if (string.IsNullOrWhiteSpace(expected))
            return true;

        return string.Equals(expected, apiKey, StringComparison.Ordinal);
    }
}
