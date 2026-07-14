namespace Application.Interfaces;

public interface IAuthEmailService
{
    Task SendOtpAsync(string toEmail, string otpCode, CancellationToken cancellationToken = default);
}
