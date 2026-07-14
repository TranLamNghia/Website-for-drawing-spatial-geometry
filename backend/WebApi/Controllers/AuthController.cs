using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Application.Interfaces;
using Domains.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

public sealed class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
}

public sealed class VerifyOtpRequest
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class GoogleExchangeRequest
{
    public string GoogleId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Avatar { get; set; }
}

public sealed class UpdateProfileRequest
{
    public string? FullName { get; set; }
}

public sealed class ChangePasswordRequest
{
    public string? CurrentPassword { get; set; }
    public string NewPassword { get; set; } = string.Empty;
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RegisterPurpose = "register";
    private static readonly TimeSpan OtpTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    private const int MaxOtpAttempts = 5;
    private const int MinPasswordLength = 8;

    private readonly IUserRepository _users;
    private readonly IEmailOtpRepository _otps;
    private readonly IJwtTokenService _jwt;
    private readonly IAuthEmailService _mail;
    private readonly IConfiguration _configuration;

    public AuthController(
        IUserRepository users,
        IEmailOtpRepository otps,
        IJwtTokenService jwt,
        IAuthEmailService mail,
        IConfiguration configuration)
    {
        _users = users;
        _otps = otps;
        _jwt = jwt;
        _mail = mail;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        await _users.EnsureIndexesAsync(cancellationToken);

        var email = NormalizeEmail(request.Email);
        var password = request.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            return BadRequest(new { message = "Email không hợp lệ." });

        if (password.Length < MinPasswordLength)
            return BadRequest(new { message = $"Mật khẩu tối thiểu {MinPasswordLength} ký tự." });

        var existing = await _users.GetByEmailAsync(email, cancellationToken);
        if (existing is { EmailVerified: true })
            return Conflict(new { message = "Email đã được đăng ký. Hãy đăng nhập." });

        var latestOtp = await _otps.GetLatestAsync(email, RegisterPurpose, cancellationToken);
        if (latestOtp != null && DateTime.UtcNow - latestOtp.CreatedAt < ResendCooldown)
        {
            var wait = (int)Math.Ceiling((ResendCooldown - (DateTime.UtcNow - latestOtp.CreatedAt)).TotalSeconds);
            return StatusCode(429, new { message = $"Vui lòng đợi {wait}s trước khi gửi lại OTP." });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var now = DateTime.UtcNow;

        try
        {
            if (existing == null)
            {
                await _users.CreateAsync(new User
                {
                    Email = email,
                    Username = email,
                    Password = passwordHash,
                    FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim(),
                    EmailVerified = false,
                    Role = new List<string> { "User" },
                    CreatedAt = now,
                    UpdatedAt = now,
                }, cancellationToken);
            }
            else
            {
                existing.Password = passwordHash;
                existing.FullName = string.IsNullOrWhiteSpace(request.FullName)
                    ? existing.FullName
                    : request.FullName.Trim();
                existing.EmailVerified = false;
                existing.GoogleId = null;
                existing.UpdatedAt = now;
                await _users.ReplaceAsync(existing, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Không tạo được tài khoản.", detail = ex.Message });
        }

        var otpCode = GenerateOtp();
        await _otps.UpsertAsync(new EmailOtp
        {
            Email = email,
            CodeHash = HashOtp(otpCode),
            Purpose = RegisterPurpose,
            Attempts = 0,
            ExpiresAt = now.Add(OtpTtl),
            CreatedAt = now,
        }, cancellationToken);

        try
        {
            await _mail.SendOtpAsync(email, otpCode, cancellationToken);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "Không gửi được email OTP.", detail = ex.Message });
        }

        return Ok(new
        {
            message = "Đã gửi mã OTP tới email của bạn.",
            email,
            expiresInSeconds = (int)OtpTtl.TotalSeconds,
        });
    }

    [AllowAnonymous]
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(
        [FromBody] VerifyOtpRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var otp = (request.Otp ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(otp))
            return BadRequest(new { message = "Email và OTP là bắt buộc." });

        var record = await _otps.GetLatestAsync(email, RegisterPurpose, cancellationToken);
        if (record == null)
            return BadRequest(new { message = "Không tìm thấy OTP. Hãy đăng ký lại." });

        if (record.ExpiresAt < DateTime.UtcNow)
        {
            await _otps.DeleteAsync(email, RegisterPurpose, cancellationToken);
            return BadRequest(new { message = "OTP đã hết hạn. Hãy đăng ký lại để nhận mã mới." });
        }

        if (record.Attempts >= MaxOtpAttempts)
            return BadRequest(new { message = "Đã nhập sai OTP quá nhiều lần. Hãy đăng ký lại." });

        if (!SecureEquals(record.CodeHash, HashOtp(otp)))
        {
            record.Attempts += 1;
            await _otps.UpsertAsync(record, cancellationToken);
            return BadRequest(new { message = "OTP không đúng." });
        }

        var user = await _users.GetByEmailAsync(email, cancellationToken);
        if (user == null)
            return BadRequest(new { message = "Tài khoản không tồn tại. Hãy đăng ký lại." });

        user.EmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.ReplaceAsync(user, cancellationToken);
        await _otps.DeleteAsync(email, RegisterPurpose, cancellationToken);

        return Ok(AuthResponse(user));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return BadRequest(new { message = "Email và mật khẩu là bắt buộc." });

        var user = await _users.GetByEmailAsync(email, cancellationToken);
        if (user == null || string.IsNullOrEmpty(user.Password))
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

        if (!user.EmailVerified)
            return Unauthorized(new { message = "Email chưa được xác minh. Hãy hoàn tất bước OTP." });

        if (!BCrypt.Net.BCrypt.Verify(password, user.Password))
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });

        return Ok(AuthResponse(user));
    }

    [AllowAnonymous]
    [HttpPost("google-exchange")]
    public async Task<IActionResult> GoogleExchange(
        [FromBody] GoogleExchangeRequest request,
        [FromHeader(Name = "x-api-key")] string? apiKey,
        CancellationToken cancellationToken)
    {
        if (!IsInternalAuthorized(apiKey))
            return Unauthorized(new { message = "Invalid or missing API key." });

        if (string.IsNullOrWhiteSpace(request.GoogleId) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "googleId and email are required." });

        try
        {
            var user = await _users.UpsertGoogleUserAsync(
                request.GoogleId.Trim(),
                request.Email.Trim(),
                request.FullName?.Trim(),
                request.Avatar?.Trim(),
                cancellationToken);

            return Ok(AuthResponse(user));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>Backward-compatible alias for google-exchange without JWT (legacy clients).</summary>
    [AllowAnonymous]
    [HttpPost("sync-user")]
    public async Task<IActionResult> SyncUser(
        [FromBody] GoogleExchangeRequest request,
        [FromHeader(Name = "x-api-key")] string? apiKey,
        CancellationToken cancellationToken)
    {
        if (!IsInternalAuthorized(apiKey))
            return Unauthorized(new { message = "Invalid or missing API key." });

        if (string.IsNullOrWhiteSpace(request.GoogleId) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "googleId and email are required." });

        try
        {
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
                accessToken = _jwt.CreateAccessToken(user),
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });
        return Ok(ProfileResponse(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

        var fullName = request.FullName?.Trim();
        if (string.IsNullOrWhiteSpace(fullName))
            return BadRequest(new { message = "Họ và tên không được để trống." });

        user.FullName = fullName;
        user.UpdatedAt = DateTime.UtcNow;
        await _users.ReplaceAsync(user, cancellationToken);
        return Ok(ProfileResponse(user));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

        var newPassword = request.NewPassword ?? string.Empty;
        if (newPassword.Length < MinPasswordLength)
            return BadRequest(new { message = $"Mật khẩu mới tối thiểu {MinPasswordLength} ký tự." });

        var hasPassword = !string.IsNullOrEmpty(user.Password);
        var currentPassword = request.CurrentPassword ?? string.Empty;

        if (hasPassword)
        {
            if (string.IsNullOrEmpty(currentPassword) || !BCrypt.Net.BCrypt.Verify(currentPassword, user.Password))
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
        }
        else if (!string.IsNullOrEmpty(currentPassword))
        {
            return BadRequest(new { message = "Tài khoản chưa có mật khẩu. Hãy để trống mật khẩu hiện tại." });
        }

        user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _users.ReplaceAsync(user, cancellationToken);

        return Ok(new { message = "Đã cập nhật mật khẩu.", hasPassword = true });
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var userId =
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId)) return null;
        return await _users.GetByIdAsync(userId, cancellationToken);
    }

    private static object ProfileResponse(User user) => new
    {
        id = user.Id,
        email = user.Email,
        fullName = user.FullName,
        avatar = user.Avatar,
        googleId = user.GoogleId,
        emailVerified = user.EmailVerified,
        hasPassword = !string.IsNullOrEmpty(user.Password),
        roles = user.Role,
    };

    private object AuthResponse(User user) => new
    {
        accessToken = _jwt.CreateAccessToken(user),
        tokenType = "Bearer",
        user = new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            avatar = user.Avatar,
            googleId = user.GoogleId,
            emailVerified = user.EmailVerified,
            hasPassword = !string.IsNullOrEmpty(user.Password),
            roles = user.Role,
        },
    };

    private bool IsInternalAuthorized(string? apiKey)
    {
        var expected = _configuration["INTERNAL_API_KEY"]
            ?? Environment.GetEnvironmentVariable("INTERNAL_API_KEY");

        if (string.IsNullOrWhiteSpace(expected))
            return true;

        return string.Equals(expected, apiKey, StringComparison.Ordinal);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string GenerateOtp()
    {
        var value = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return value.ToString("D6");
    }

    private static string HashOtp(string otp)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(otp.Trim()));
        return Convert.ToHexString(bytes);
    }

    private static bool SecureEquals(string a, string b)
    {
        var ba = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        if (ba.Length != bb.Length) return false;
        return CryptographicOperations.FixedTimeEquals(ba, bb);
    }
}
