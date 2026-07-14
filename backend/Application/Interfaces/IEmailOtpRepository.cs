using Domains.Entities;

namespace Application.Interfaces;

public interface IEmailOtpRepository
{
    Task EnsureIndexesAsync(CancellationToken cancellationToken = default);

    Task<EmailOtp?> GetLatestAsync(string email, string purpose, CancellationToken cancellationToken = default);

    Task UpsertAsync(EmailOtp otp, CancellationToken cancellationToken = default);

    Task DeleteAsync(string email, string purpose, CancellationToken cancellationToken = default);
}
