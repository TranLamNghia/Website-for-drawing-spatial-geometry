using Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Infrastructure.Auth;

public class AuthEmailService : IAuthEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthEmailService> _logger;

    public AuthEmailService(IConfiguration configuration, ILogger<AuthEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendOtpAsync(string toEmail, string otpCode, CancellationToken cancellationToken = default)
    {
        var host = _configuration["SMTP_HOST"]?.Trim();
        var user = _configuration["SMTP_USER"]?.Trim();
        var pass = _configuration["SMTP_PASS"];
        var port = int.TryParse(_configuration["SMTP_PORT"], out var p) ? p : 587;
        var secure = string.Equals(_configuration["SMTP_SECURE"], "true", StringComparison.OrdinalIgnoreCase)
            || string.Equals(_configuration["SMTP_SECURE"], "1", StringComparison.OrdinalIgnoreCase)
            || port == 465;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(pass))
            throw new InvalidOperationException("SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS).");

        var fromEmail = _configuration["MAIL_FROM"]?.Trim() ?? user;
        var fromName = _configuration["MAIL_FROM_NAME"]?.Trim() ?? "SpatialGeometry";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Mã OTP xác minh đăng ký — Vẽ hình không khó";

        var body = new BodyBuilder
        {
            TextBody = $"""
                Xin chào,

                Mã OTP xác minh email của bạn là: {otpCode}

                Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với người khác.

                — {fromName}
                """,
            HtmlBody = $"""
                <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
                  <p>Xin chào,</p>
                  <p>Mã OTP xác minh email của bạn là:</p>
                  <p style="font-size:28px;font-weight:700;letter-spacing:6px">{otpCode}</p>
                  <p>Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với người khác.</p>
                  <p style="color:#666">— {fromName}</p>
                </div>
                """,
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        var secureOption = secure ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;
        _logger.LogInformation("Sending OTP email to {Email} via {Host}:{Port} (secure={Secure})", toEmail, host, port, secure);
        await client.ConnectAsync(host, port, secureOption, cancellationToken);
        await client.AuthenticateAsync(user, pass, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
        _logger.LogInformation("OTP email sent successfully to {Email}", toEmail);
    }
}
